// Renewal reminders: when a plan has an end date (a won lead's plan or a customer subscription),
// a task goes on the owner's calendar 10 days before it ends, and on that day they get a notification and an email.
const { query } = require("../../db/connection");
const { createPrefixedId } = require("../../utils/ids");
const taskRepository = require("../../repositories/taskRepository");

const DAYS_BEFORE = 10;
const DAY = 86400000;
const IST = 330 * 60000;

/** "2027-11-01" (or a date) → the IST calendar day, or null. */
function dayKey(value) {
  if (!value) return null;
  const text = String(value).trim();
  const d = /^\d{4}-\d{2}-\d{2}/.test(text) ? new Date(`${text.slice(0, 10)}T00:00:00+05:30`) : new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST).toISOString().slice(0, 10);
}
const fmt = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** The reminder time: 10 days before the end, at 10:00 IST. If that has passed, one hour from now. */
function reminderTime(endKey, now = Date.now()) {
  const at = new Date(new Date(`${endKey}T10:00:00+05:30`).getTime() - DAYS_BEFORE * DAY);
  return at.getTime() < now ? new Date(now + 3600000) : at;
}

/**
 * Makes sure there is one calendar task for this plan end. A changed end date moves the task.
 * plan: { companyId, kind: "lead" | "subscription", entityId, endDate, ownerId, teamId, title, relatedTo, relatedId, createdBy }
 */
async function scheduleRenewal(plan) {
  const endKey = dayKey(plan.endDate);
  if (!endKey || !plan.companyId || !plan.entityId) return null;
  if (new Date(`${endKey}T23:59:59+05:30`).getTime() < Date.now()) return null;
  const due = reminderTime(endKey);
  const [rows] = await query("SELECT id, end_date, task_id FROM renewal_reminders WHERE kind = ? AND entity_id = ? AND reminded_at IS NULL", [plan.kind, plan.entityId]);
  const open = rows[0];
  if (open && dayKey(open.end_date) === endKey) return open.id;
  if (open) {
    await query("UPDATE renewal_reminders SET end_date = ?, title = ? WHERE id = ?", [endKey, plan.title, open.id]);
    if (open.task_id) await query("UPDATE tasks SET due_date = ?, title = ? WHERE task_id = ? AND company_id = ?", [due, plan.title, open.task_id, plan.companyId]).catch(() => {});
    return open.id;
  }
  let taskId = null;
  if (plan.ownerId) {
    taskId = await createPrefixedId("tsk");
    await taskRepository.createTask({
      task_id: taskId, company_id: plan.companyId, title: plan.title, type: "call", status: "pending", priority: "high", due_date: due,
      team_id: plan.teamId || null, assigned_to: plan.ownerId, related_to: plan.relatedTo, related_id: plan.relatedId,
      created_by: plan.createdBy || plan.ownerId, notes: `Plan ends on ${fmt(endKey)}. Call the customer about renewal.`,
    });
  }
  const [inserted] = await query(
    `INSERT INTO renewal_reminders (company_id, kind, entity_id, end_date, owner_id, title, related_to, related_id, task_id)
     OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [plan.companyId, plan.kind, plan.entityId, endKey, plan.ownerId || null, plan.title, plan.relatedTo, plan.relatedId, taskId]
  );
  return inserted[0]?.id || null;
}

/** For a lead just saved as won with a plan end date. */
function scheduleLeadRenewal(lead, actorUserId) {
  if (String(lead?.status || "").toLowerCase() !== "closed-won" || !lead.client_tenure) return Promise.resolve(null);
  const name = lead.company_name || lead.contact_person || lead.lead_id;
  return scheduleRenewal({
    companyId: lead.company_id, kind: "lead", entityId: lead.lead_id, endDate: lead.client_tenure, ownerId: lead.assigned_to, teamId: lead.team_id,
    title: `Renewal due: ${name} plan ends ${fmt(dayKey(lead.client_tenure))}`, relatedTo: "lead", relatedId: lead.lead_id, createdBy: actorUserId,
  });
}

/** For a customer subscription. */
function scheduleSubscriptionRenewal(customer, subscription, actorUserId) {
  if (!subscription?.end_date || String(subscription.status || "active") !== "active") return Promise.resolve(null);
  return scheduleRenewal({
    companyId: customer.company_id, kind: "subscription", entityId: subscription.subscription_id, endDate: subscription.end_date, ownerId: customer.assigned_to, teamId: customer.team_id,
    title: `Renewal due: ${customer.company_name}${subscription.product_name ? ` (${subscription.product_name})` : ""} ends ${fmt(dayKey(subscription.end_date))}`,
    relatedTo: "customer", relatedId: customer.customer_id, createdBy: actorUserId,
  });
}

/** Plans that end in the next 45 days but have no reminder yet (older data, or set outside the CRM screens). */
async function backfill() {
  const [leads] = await query(
    `SELECT TOP 200 l.lead_id, l.company_id, l.company_name, l.contact_person, l.assigned_to, l.team_id, l.status, l.client_tenure
     FROM leads l
     WHERE l.status = 'closed-won' AND l.is_active = 1 AND l.client_tenure IS NOT NULL
       AND TRY_CONVERT(date, LEFT(l.client_tenure, 10)) BETWEEN CAST(SYSUTCDATETIME() AS date) AND DATEADD(day, 45, CAST(SYSUTCDATETIME() AS date))
       AND NOT EXISTS (SELECT 1 FROM renewal_reminders r WHERE r.kind = 'lead' AND r.entity_id = l.lead_id AND r.end_date = TRY_CONVERT(date, LEFT(l.client_tenure, 10)))`
  );
  const [subs] = await query(
    `SELECT TOP 200 cs.subscription_id, cs.end_date, cs.status, p.name AS product_name, c.customer_id, c.company_id, c.company_name, c.assigned_to, c.team_id
     FROM customer_subscriptions cs JOIN customers c ON c.customer_id = cs.customer_id AND c.company_id = cs.company_id AND c.is_active = 1
     LEFT JOIN products p ON p.product_id = cs.product_id
     WHERE cs.status = 'active' AND cs.end_date BETWEEN SYSUTCDATETIME() AND DATEADD(day, 45, SYSUTCDATETIME())
       AND NOT EXISTS (SELECT 1 FROM renewal_reminders r WHERE r.kind = 'subscription' AND r.entity_id = cs.subscription_id)`
  );
  for (const lead of leads) await scheduleLeadRenewal(lead).catch((e) => console.warn("[renewals] lead skipped:", e.message));
  for (const s of subs) await scheduleSubscriptionRenewal(s, s).catch((e) => console.warn("[renewals] plan skipped:", e.message));
  return { leads: leads.length, subscriptions: subs.length };
}

/** Sends the reminders that are due now: an in-app notification and an email to the owner. */
async function sendDue(deps = {}) {
  const mail = deps.sendEmail || ((companyId, payload) => require("../communication/managedEmailService").sendManagedEmail(companyId, payload));
  const { getFrontendUrl, escapeHtml } = require("../emailService");
  // The notification always goes; the email only to an active person who proved their email with the login code.
  const [due] = await query(
    `SELECT TOP 100 r.id, r.company_id, r.kind, r.entity_id, r.end_date, r.title, r.related_to, r.related_id, r.owner_id, u.name AS owner_name,
       CASE WHEN u.is_active = 1 AND ${require("../auth/loginOtp").VERIFIED_SQL("u")} THEN u.email END AS owner_email
     FROM renewal_reminders r LEFT JOIN users u ON u.user_id = r.owner_id
     WHERE r.reminded_at IS NULL AND r.end_date >= CAST(SYSUTCDATETIME() AS date) AND DATEADD(day, -${DAYS_BEFORE}, r.end_date) <= CAST(SYSUTCDATETIME() AS date)`
  );
  let sent = 0;
  for (const r of due) {
    const link = `${getFrontendUrl()}/${r.related_to === "lead" ? "leads" : "customers"}/${encodeURIComponent(r.related_id)}`;
    const ends = fmt(dayKey(r.end_date));
    if (r.owner_id) {
      await query(
        `INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable) VALUES (?, ?, ?, ?, ?, 'renewal', ?, 'high', 1)`,
        [await createPrefixedId("ntf"), r.company_id, r.owner_id, "Renewal coming up", `${r.title}. Call the customer before ${ends}.`, r.related_to === "lead" ? r.related_id : null]
      ).catch((e) => console.warn("[renewals] notification skipped:", e.message));
    }
    if (r.owner_email) {
      await mail(r.company_id, {
        to: r.owner_email, subject: r.title, text: `Hi ${r.owner_name || ""},\n\n${r.title}. Please call the customer about renewal before ${ends}.\n\nOpen: ${link}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px"><p>Hi ${escapeHtml(r.owner_name || "")},</p><p><b>${escapeHtml(r.title)}</b>.</p><p>Please call the customer about renewal before <b>${escapeHtml(ends)}</b>. It is also on your calendar.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0c605d;color:#fff;text-decoration:none;font-weight:bold">Open in GreenCRM</a></p></div>`,
      }).catch((e) => console.warn("[renewals] email skipped:", e.message));
    }
    await query("UPDATE renewal_reminders SET reminded_at = SYSUTCDATETIME() WHERE id = ?", [r.id]);
    sent += 1;
  }
  return { sent };
}

module.exports = { DAYS_BEFORE, backfill, dayKey, reminderTime, scheduleLeadRenewal, scheduleRenewal, scheduleSubscriptionRenewal, sendDue };
