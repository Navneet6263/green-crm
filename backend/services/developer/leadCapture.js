const db = require("../../db/connection");
const AppError = require("../../utils/appError");
const { createPrefixedId } = require("../../utils/ids");
const leadService = require("../leadService");
const access = require("./access");
const forms = require("./captureForms");
const { isSpam, parseLead, requirementsText } = require("./leadFields");

// One form post → one lead. A person who already exists (same phone or email) is not
// added twice: their lead gets a note saying they asked again.

async function actingAdmin(form) {
  const [rows] = await db.query(
    "SELECT TOP 1 user_id, id, name, email, role, company_id, is_active FROM users WHERE user_id = ?",
    [form.created_by]
  );
  const user = rows[0];
  if (!user || !user.is_active || user.role !== "admin" || user.company_id !== form.company_id) {
    throw new AppError("This lead capture link is paused because the admin who made it is no longer active.", 409, null, "CAPTURE_OWNER_INACTIVE");
  }
  return {
    userId: user.user_id, id: user.id, companyId: user.company_id, email: user.email, name: user.name,
    role: user.role, managedCompanyIds: [], via: "lead_capture", __teamScopeCache: new Map(),
  };
}

async function findExisting(companyId, parsed) {
  if (!parsed.phone && !parsed.email) return null;
  const conditions = [];
  const params = [companyId];
  if (parsed.phone) {
    conditions.push("RIGHT(phone, 10) = RIGHT(?, 10)");
    params.push(parsed.phone);
  }
  if (parsed.email) {
    conditions.push("LOWER(email) = ?");
    params.push(parsed.email);
  }
  const [rows] = await db.query(
    `SELECT TOP 1 lead_id, assigned_to, contact_person, company_name FROM leads
     WHERE company_id = ? AND is_active = 1 AND (${conditions.join(" OR ")}) ORDER BY created_at DESC`,
    params
  );
  return rows[0] || null;
}

async function notifyOwner(form, leadId, userId, title, message) {
  if (!userId) return;
  await db.query(
    "INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable) VALUES (?, ?, ?, ?, ?, 'lead', ?, 'high', 1)",
    [await createPrefixedId("ntf"), form.company_id, userId, title, message, leadId]
  ).catch((error) => console.warn("[lead-capture] notification skipped:", error.message));
}

/** Returns { lead_id, duplicate, spam } and fills `context` for the request log. */
async function captureLead(token, body, context = {}) {
  const form = await forms.findByToken(token);
  if (!form) throw new AppError("This lead capture link is not valid.", 404, null, "CAPTURE_NOT_FOUND");
  Object.assign(context, { companyId: form.company_id, sourceId: form.form_id, sourceName: form.name, redirect: form.redirect_url });
  if (!form.is_active) throw new AppError("This lead capture link is switched off.", 410, null, "CAPTURE_OFF");
  if (!(await access.isEnabled(form.company_id))) {
    throw new AppError("Lead capture is switched off for this company.", 403, null, "DEVELOPER_OFF");
  }
  if (isSpam(body)) {
    context.message = "Spam trap filled, nothing saved";
    return { lead_id: null, duplicate: false, spam: true };
  }

  const parsed = parseLead(body);
  if (!parsed.phone && !parsed.email) {
    throw new AppError("Send a phone number or an email.", 422, null, "CAPTURE_CONTACT_MISSING");
  }
  const auth = await actingAdmin(form);
  const label = parsed.name || parsed.phone || parsed.email;

  const existing = await findExisting(form.company_id, parsed);
  if (existing) {
    const note = [`Asked again through "${form.name}".`, parsed.name && `Name: ${parsed.name}`, parsed.phone && `Phone: ${parsed.phone}`,
      parsed.email && `Email: ${parsed.email}`, parsed.message && `Message: ${parsed.message}`].filter(Boolean).join("\n");
    await leadService.addLeadNote(auth, existing.lead_id, { content: note });
    await forms.countLead(form.form_id, true);
    await notifyOwner(form, existing.lead_id, existing.assigned_to, "Lead asked again", `${label} filled "${form.name}" again.`);
    context.leadId = existing.lead_id;
    context.message = "Already in CRM, note added";
    return { lead_id: existing.lead_id, duplicate: true, spam: false };
  }

  const ownerId = await forms.nextOwner(form);
  const lead = await leadService.createLead(auth, {
    contact_person: parsed.name || parsed.phone || parsed.email,
    company_name: parsed.company || parsed.name || "Individual",
    email: parsed.email,
    phone: parsed.phone,
    address_city: parsed.city || null,
    address_state: parsed.state || null,
    address_country: parsed.country || "India",
    lead_source: form.lead_source,
    product_id: form.product_id,
    assigned_to: ownerId,
    priority: "medium",
    status: "new",
    requirements: requirementsText(parsed, form.name),
  });
  await forms.countLead(form.form_id, false);
  if (ownerId !== auth.userId) {
    await notifyOwner(form, lead.lead_id, ownerId, "New lead from your website", `${label} came in through "${form.name}". Call them soon.`);
  }
  context.leadId = lead.lead_id;
  context.message = parsed.isTest ? "Test lead created" : "Lead created";
  return { lead_id: lead.lead_id, duplicate: false, spam: false };
}

module.exports = { captureLead };
