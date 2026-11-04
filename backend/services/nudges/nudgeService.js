const crypto = require("node:crypto");
const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const { query } = require("../../db/connection");
const { createPrefixedId } = require("../../utils/ids");
const auditRepository = require("../../repositories/auditRepository");
const leadRepository = require("../../repositories/leadRepository");
const repo = require("../../repositories/nudgeRepository");
const leadService = require("../leadService");
const managedEmail = require("../communication/managedEmailService");
const { getFrontendUrl } = require("../emailService");
const inbox = require("../mail/graphInbox");
const T = require("./nudgeTemplates");

const SEND_ROLES = [ROLES.ADMIN];
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const MAX_SCREENSHOT = 5 * 1024 * 1024;

const canSend = (auth) => SEND_ROLES.includes(auth.role);

function cleanEmails(list, max = 10) {
  const values = (Array.isArray(list) ? list : String(list || "").split(/[,;\s]+/)).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  const bad = values.find((v) => !EMAIL_RE.test(v));
  if (bad) throw new AppError(`"${bad}" is not a valid email address.`, 400);
  const unique = [...new Set(values)];
  if (unique.length > max) throw new AppError(`Add up to ${max} addresses in CC.`, 400);
  return unique;
}

/** A pasted or captured screenshot, sent as a data URL. Only PNG and JPEG, up to 5 MB. */
function parseScreenshot(dataUrl) {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl));
  if (!match) throw new AppError("The screenshot must be a PNG or JPEG image.", 400);
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_SCREENSHOT) throw new AppError("The screenshot is too large. Keep it under 5 MB.", 400);
  const png = buffer[0] === 0x89 && buffer[1] === 0x50;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  if (!(png || jpeg)) throw new AppError("The screenshot file could not be read.", 400);
  return { buffer, type: png ? "png" : "jpeg" };
}

async function getConfig(auth) {
  const capability = await managedEmail.resolveEmailCapability(auth.companyId).catch(() => ({ enabled: false }));
  return { can_send: canSend(auth), mail_ready: Boolean(capability.enabled), inbox: inbox.status() };
}

async function notifyRecipients(auth, recipients, title, message, leadId) {
  for (const user of recipients) {
    if (user.user_id === auth.userId) continue;
    await query(
      `INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable)
       VALUES (?, ?, ?, ?, ?, 'admin_email', ?, 'high', 1)`,
      [await createPrefixedId("ntf"), auth.companyId, user.user_id, title, message.slice(0, 900), leadId || null]
    ).catch((error) => console.warn("[nudge] notification skipped:", error.message));
  }
}

/**
 * Sends an admin email about a lead or a person to CRM users, with optional CC, screenshot and attachments,
 * and records it so replies and the lead timeline can show it.
 * `extra`: { blocks, facts, attachments, aboutUser } supplied by the person report.
 */
async function sendNudge(auth, body = {}, extra = {}) {
  if (!canSend(auth)) throw new AppError("Only admins can send these emails.", 403);
  const kind = body.kind === "person" ? "person" : "lead";
  const toIds = [...new Set((Array.isArray(body.to_user_ids) ? body.to_user_ids : []).map(String).filter(Boolean))].slice(0, 10);
  if (!toIds.length) throw new AppError("Choose who should get this email.", 400);
  const recipients = (await repo.listRecipients(auth.companyId, toIds)).filter((u) => EMAIL_RE.test(String(u.email || "")));
  if (!recipients.length) throw new AppError("None of the chosen people has an email address in the CRM.", 400);
  const toEmails = recipients.map((u) => u.email.toLowerCase());
  const cc = cleanEmails(body.cc).filter((e) => !toEmails.includes(e));
  const message = String(body.message || "").trim().slice(0, 5000);
  if (!message) throw new AppError("Write a short message.", 400);
  const screenshot = parseScreenshot(body.screenshot);

  let lead = null;
  let linkPath;
  if (kind === "lead") {
    if (!body.lead_id) throw new AppError("Choose the lead this email is about.", 400);
    lead = await leadService.getLead(auth, body.lead_id, { view: "core" });
    linkPath = `/leads/${encodeURIComponent(lead.lead_id)}`;
  } else {
    if (!extra.aboutUser) throw new AppError("Choose the person this email is about.", 400);
    linkPath = `/people/${encodeURIComponent(extra.aboutUser.user_id)}`;
  }

  const refCode = `N-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const baseSubject = String(body.subject || "").trim().slice(0, 200)
    || (lead ? `Follow-up needed: ${lead.company_name || lead.contact_person}` : `Your CRM report: ${extra.aboutUser.name}`);
  const subject = `${baseSubject} [Ref ${refCode}]`;
  const linkUrl = `${getFrontendUrl()}${linkPath}`;
  const greeting = recipients.length === 1 ? `Hi ${String(recipients[0].name || "").split(" ")[0] || "there"},` : "Hi all,";
  const cid = screenshot ? `shot-${refCode.toLowerCase()}@greencrm` : null;
  const blocks = [...(lead && body.include_summary !== false ? [T.leadCard(lead)] : []), ...(extra.blocks || [])];
  const html = T.buildEmailHtml({ heading: lead ? "Lead follow-up" : "Your CRM report", greeting, message, blocks, screenshotCid: cid, linkUrl, linkLabel: lead ? "Open this lead" : "Open the report", senderName: auth.name, refCode });
  const text = T.buildEmailText({ greeting, message, facts: lead ? T.leadFacts(lead) : extra.facts || [], linkUrl, senderName: auth.name, refCode });
  const attachments = [
    ...(screenshot ? [{ filename: `screenshot.${screenshot.type === "png" ? "png" : "jpg"}`, content: screenshot.buffer, cid }] : []),
    ...(extra.attachments || []),
  ];

  const result = await managedEmail.sendManagedEmail(auth.companyId, {
    to: toEmails, cc, subject, html, text, attachments, replyTo: inbox.mailbox() || undefined,
  });
  const delivered = result.delivery === "email";
  const record = {
    company_id: auth.companyId, kind, lead_id: lead?.lead_id, about_user_id: extra.aboutUser?.user_id, sent_by: auth.userId, sent_by_name: auth.name,
    to_user_ids: recipients.map((u) => u.user_id), to_emails: toEmails, cc_emails: cc, subject, body: message, link_path: linkPath,
    ref_code: refCode, message_id: result.message_id, delivery: delivered ? "email" : "failed", error: result.error, has_screenshot: Boolean(screenshot),
  };
  const id = await repo.createNudge(record);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"), company_id: auth.companyId, action: delivered ? "email.nudge_sent" : "email.nudge_failed",
    performed_by: auth.userId, user_email: auth.email, user_role: auth.role, target_user: extra.aboutUser?.user_id || lead?.lead_id || null,
    details: { kind, ref: refCode, to: toEmails, cc, lead_id: lead?.lead_id || null },
  }).catch(() => {});
  if (!delivered) {
    throw new AppError(result.delivery === "preview" && !result.error ? "Email is not set up on the server yet, so nothing was sent." : `The email could not be sent: ${result.error || "mail server error"}`, 502);
  }

  const names = recipients.map((u) => u.name).join(", ");
  if (lead) {
    await leadRepository.createActivity({
      activity_id: await createPrefixedId("act"), company_id: auth.companyId, lead_id: lead.lead_id, type: "email",
      description: `${auth.name} emailed ${names}${cc.length ? ` (CC ${cc.join(", ")})` : ""}: ${baseSubject}`, created_by: auth.userId,
    }).catch((error) => console.warn("[nudge] activity skipped:", error.message));
  }
  await notifyRecipients(auth, recipients, `${auth.name} emailed you`, `${baseSubject}. ${message}`, lead?.lead_id);
  return { id, ref_code: refCode, subject, to: toEmails, cc, from: result.from, delivery: "email" };
}

const KINDS = { team: ["lead", "person"], customer: ["customer"] };
const viewerOf = (auth) => (canSend(auth) ? null : auth.userId);

/** Admins see every email in the company; other people the ones sent to them or by them. `scope`: team | customer. */
async function listNudges(auth, q = {}) {
  const limit = Math.min(Math.max(Number(q.page_size) || 30, 1), 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const result = await repo.listNudges({
    companyId: auth.companyId, viewerUserId: viewerOf(auth), kinds: KINDS[q.scope] || null,
    leadId: q.lead_id || null, aboutUserId: q.about_user_id || null, replies: q.replies, search: String(q.search || "").trim().slice(0, 100) || null,
    limit, offset: (page - 1) * limit,
  });
  return { ...result, page, page_size: limit, inbox: inbox.status() };
}

async function getNudge(auth, id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) throw new AppError("Email not found.", 404);
  const nudge = await repo.getNudge(auth.companyId, id);
  if (!nudge || (!canSend(auth) && !nudge.to_user_ids.includes(auth.userId) && nudge.sent_by !== auth.userId)) throw new AppError("Email not found.", 404);
  return { ...nudge, replies: await repo.listReplies(nudge.id) };
}

async function listRecentReplies(auth, q = {}) {
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
  return { items: await repo.listRecentReplies({ companyId: auth.companyId, viewerUserId: viewerOf(auth), limit }), inbox: inbox.status() };
}

/**
 * Keeps a copy of an email sent to a customer from the Email page, so it shows under Sent and its replies can be matched.
 * Never fails the send itself.
 */
async function recordCustomerEmail(auth, { leadId = null, customerId = null, to, cc = [], subject, body, delivery }) {
  try {
    return await repo.createNudge({
      company_id: auth.companyId, kind: "customer", lead_id: leadId, customer_id: customerId, sent_by: auth.userId, sent_by_name: auth.name,
      to_user_ids: [], to_emails: cleanEmails(to, 20), cc_emails: cleanEmails(cc, 20), subject: String(subject || "").slice(0, 300), body: String(body || "").slice(0, 20000),
      link_path: leadId ? `/leads/${encodeURIComponent(leadId)}` : customerId ? `/customers/${encodeURIComponent(customerId)}` : null,
      ref_code: `C-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, message_id: delivery?.message_id || null,
      delivery: delivery?.delivery === "email" ? "email" : "failed", error: delivery?.error || null, has_screenshot: false,
    });
  } catch (error) {
    console.warn("[email] could not keep a copy of the customer email:", error.message);
    return null;
  }
}

module.exports = { canSend, cleanEmails, getConfig, getNudge, listNudges, listRecentReplies, parseScreenshot, recordCustomerEmail, sendNudge };
