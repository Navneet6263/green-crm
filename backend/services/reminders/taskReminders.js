// Email reminders the person picks when they save a task: "at the time", "10 minutes before", "1 day before"…
// The reminder is kept as minutes before the task (negative for "that morning at 9" on an all-day task),
// so moving the task moves its reminder too. Only people who proved their email with the login code get it.
const { query } = require("../../db/connection");
const AppError = require("../../utils/appError");
const { escapeHtml, getFrontendUrl } = require("../emailService");
const { button, sendBranded } = require("../mail/brandedEmail");
const { VERIFIED_SQL } = require("../auth/loginOtp");
const meetings = require("./meetingReminders");

const MIN = -24 * 60;
const MAX = 7 * 24 * 60;
// A reminder found more than this late (server was off) is skipped rather than sent hours after the task.
const STALE_MINUTES = 6 * 60;
const OPEN = "t.status NOT IN ('done', 'completed', 'closed', 'cancelled')";

/** null for "no reminder", else whole minutes before the task. Throws on anything else. */
function parseMinutes(value) {
  if (value === null || value === "" || value === "none") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < MIN || n > MAX) throw new AppError("Choose when to get the email reminder.", 400);
  return n;
}

/** Saves (or clears) the reminder for a task. The email goes again if the time changed. */
async function setReminder(task, value) {
  const minutes = parseMinutes(value);
  if (minutes === null) {
    await query("DELETE FROM task_email_reminders WHERE task_id = ?", [task.task_id]);
    return null;
  }
  const remindAt = new Date(new Date(task.due_date).getTime() - minutes * 60000);
  await query(
    `MERGE task_email_reminders AS t USING (SELECT ? AS task_id) AS s ON t.task_id = s.task_id
     WHEN MATCHED THEN UPDATE SET minutes_before = ?, remind_at = ?, sent_at = CASE WHEN t.remind_at = ? THEN t.sent_at ELSE NULL END
     WHEN NOT MATCHED THEN INSERT (task_id, company_id, minutes_before, remind_at) VALUES (?, ?, ?, ?);`,
    [task.task_id, minutes, remindAt, remindAt, task.task_id, task.company_id, minutes, remindAt]
  );
  return minutes;
}

/** The task moved: its reminder moves with it and can be sent again. */
async function followTask(task) {
  await query(
    `UPDATE task_email_reminders SET remind_at = DATEADD(minute, -minutes_before, ?), sent_at = NULL
     WHERE task_id = ? AND remind_at <> DATEADD(minute, -minutes_before, ?)`,
    [new Date(task.due_date), task.task_id, new Date(task.due_date)]
  );
}

function buildEmail(row) {
  const m = meetings.meetingDetails(row);
  const when = new Date(row.due_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  const allDay = new Date(new Date(row.due_date).getTime() + 330 * 60000).toISOString().slice(11, 16) === "00:00";
  const whenText = allDay ? when.replace(/,?\s*12:00\s*am/i, "") + " (any time)" : when;
  const type = String(row.type || "task").replace(/-/g, " ");
  const rows = [["When", whenText], ["Type", type[0].toUpperCase() + type.slice(1)], ["With", m.contact], ["Phone", row.client_phone], ["Email", row.client_email]].filter(([, v]) => v);
  const body = `<p style="margin:0 0 14px;font-size:14px;color:#334155">Hi ${escapeHtml(String(row.owner_name || "").split(" ")[0])}, a reminder for <b>${escapeHtml(row.title)}</b>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:10px;font-size:13px">${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;color:#64748b;width:90px;border-bottom:1px solid #f1f5f9">${k}</td><td style="padding:8px 12px;color:#0f172a;font-weight:bold;border-bottom:1px solid #f1f5f9">${escapeHtml(v)}</td></tr>`).join("")}</table>
${row.notes ? `<p style="margin:14px 0 0;font-size:13px;color:#475569;white-space:pre-line">${escapeHtml(String(row.notes).slice(0, 600))}</p>` : ""}`;
  const isMeeting = meetings.MEETING_TYPES.has(String(row.type || "").toLowerCase());
  const buttons = button("Open in CRM", m.crmLink) + (isMeeting ? button("Create Google Meet", meetings.googleCalendarLink(m), "secondary") : "") + button("My calendar", `${getFrontendUrl()}/calendar`, "secondary");
  return {
    subject: `Reminder: ${row.title} · ${allDay ? "today" : when}`,
    heading: `Reminder: ${row.title}`,
    preheader: `${whenText}${m.contact ? ` · ${m.contact}` : ""}`,
    body, buttons,
    text: `Reminder: ${row.title}\nWhen: ${whenText}\n${m.contact ? `With: ${m.contact}\n` : ""}\nOpen in CRM: ${m.crmLink}`,
  };
}

/** Sends the reminders that are due now. Safe to call every minute. */
async function sendDue(now = new Date(), deps = {}) {
  const send = deps.sendBranded || sendBranded;
  const [rows] = await query(`
    SELECT TOP 100 r.task_id, r.company_id, t.title, t.type, t.due_date, t.notes, t.related_to, t.related_id,
      u.name AS owner_name, u.email AS owner_email,
      COALESCE(l.contact_person, cu.name) AS client_name, COALESCE(l.company_name, cu.company_name) AS client_company,
      COALESCE(l.email, cu.email) AS client_email, COALESCE(l.phone, cu.phone) AS client_phone
    FROM task_email_reminders r
    JOIN tasks t ON t.task_id = r.task_id AND t.company_id = r.company_id
    JOIN users u ON u.user_id = t.assigned_to AND u.is_active = 1 AND ${VERIFIED_SQL("u")}
    LEFT JOIN leads l ON t.related_to = 'lead' AND l.lead_id = t.related_id AND l.company_id = t.company_id
    LEFT JOIN customers cu ON t.related_to = 'customer' AND cu.customer_id = t.related_id AND cu.company_id = t.company_id
    WHERE r.sent_at IS NULL AND r.remind_at <= ? AND r.remind_at > ? AND ${OPEN}`,
  [now, new Date(now.getTime() - STALE_MINUTES * 60000)]);
  let sent = 0;
  for (const row of rows) {
    // Mark first, so a slow mail server never causes the same reminder twice.
    await query("UPDATE task_email_reminders SET sent_at = SYSUTCDATETIME() WHERE task_id = ? AND sent_at IS NULL", [row.task_id]);
    const result = await send(row.company_id, { to: row.owner_email, ...buildEmail(row) }).catch((e) => ({ skipped: e.message }));
    if (result.sent) sent += 1;
  }
  return { sent };
}

/** The reminder (minutes before) for each of these tasks, for showing it in the task form. */
async function minutesFor(taskIds) {
  if (!taskIds.length) return new Map();
  const [rows] = await query(`SELECT task_id, minutes_before FROM task_email_reminders WHERE task_id IN (${taskIds.map(() => "?").join(", ")})`, taskIds);
  return new Map(rows.map((r) => [r.task_id, Number(r.minutes_before)]));
}

module.exports = { buildEmail, followTask, minutesFor, parseMinutes, sendDue, setReminder };
