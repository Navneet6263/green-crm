const { query } = require("../db/connection");

const COLUMNS = `n.id, n.company_id, n.kind, n.lead_id, n.customer_id, n.about_user_id, n.sent_by, n.sent_by_name, n.to_user_ids, n.to_emails, n.cc_emails,
  n.subject, n.body, n.link_path, n.ref_code, n.message_id, n.delivery, n.error, n.has_screenshot, n.reply_count, n.last_reply_at, n.created_at`;

const split = (value) => String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
const toNudge = (row) => row && ({
  ...row,
  to_user_ids: split(row.to_user_ids),
  to_emails: split(row.to_emails),
  cc_emails: split(row.cc_emails),
  has_screenshot: Boolean(row.has_screenshot),
  reply_count: Number(row.reply_count || 0),
});

async function createNudge(n) {
  const [rows] = await query(
    `INSERT INTO email_nudges (company_id, kind, lead_id, customer_id, about_user_id, sent_by, sent_by_name, to_user_ids, to_emails, cc_emails,
       subject, body, link_path, ref_code, message_id, delivery, error, has_screenshot)
     OUTPUT INSERTED.id
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [n.company_id, n.kind, n.lead_id || null, n.customer_id || null, n.about_user_id || null, n.sent_by, n.sent_by_name || null, (n.to_user_ids || []).join(","),
      n.to_emails.join(","), n.cc_emails.join(","), n.subject, n.body || null, n.link_path || null, n.ref_code, n.message_id || null,
      n.delivery, n.error ? String(n.error).slice(0, 400) : null, n.has_screenshot ? 1 : 0]
  );
  return rows[0]?.id;
}

// Admins see every email in the company; everyone else the ones sent to them or by them.
function visibility(where, params, viewerUserId) {
  if (!viewerUserId) return;
  where.push("((',' + COALESCE(n.to_user_ids, '') + ',') LIKE ? OR n.sent_by = ?)");
  params.push(`%,${viewerUserId},%`, viewerUserId);
}

/** `kinds`: which emails ("lead", "person" = to the team, "customer" = to customers); `replies`: "with" | "without". */
async function listNudges({ companyId, viewerUserId = null, kinds = null, leadId, aboutUserId, replies, search, limit = 50, offset = 0 }) {
  const where = ["n.company_id = ?"];
  const params = [companyId];
  visibility(where, params, viewerUserId);
  if (kinds?.length) { where.push(`n.kind IN (${kinds.map(() => "?").join(", ")})`); params.push(...kinds); }
  if (leadId) { where.push("n.lead_id = ?"); params.push(leadId); }
  if (aboutUserId) { where.push("n.about_user_id = ?"); params.push(aboutUserId); }
  if (replies === "with") where.push("n.reply_count > 0");
  if (replies === "without") where.push("n.reply_count = 0");
  if (search) { where.push("(n.subject LIKE ? OR n.to_emails LIKE ? OR n.body LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const [rows] = await query(
    `SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
     FROM email_nudges n WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(n.last_reply_at, n.created_at) DESC
     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    [...params, offset, limit]
  );
  return { items: rows.map(toNudge), total: Number(rows[0]?.total_count || 0) };
}

async function getNudge(companyId, id) {
  const [rows] = await query(`SELECT ${COLUMNS} FROM email_nudges n WHERE n.company_id = ? AND n.id = ?`, [companyId, id]);
  return toNudge(rows[0]);
}

/** Newest replies across the emails the viewer can see. */
async function listRecentReplies({ companyId, viewerUserId = null, limit = 50 }) {
  const where = ["n.company_id = ?"];
  const params = [companyId];
  visibility(where, params, viewerUserId);
  const [rows] = await query(
    `SELECT TOP (?) r.id, r.from_email, r.from_name, r.subject, r.body_text, r.received_at,
       n.id AS nudge_id, n.kind, n.subject AS nudge_subject, n.lead_id, n.customer_id, n.link_path, n.to_emails
     FROM email_replies r JOIN email_nudges n ON n.id = r.nudge_id
     WHERE ${where.join(" AND ")}
     ORDER BY r.received_at DESC`,
    [Number(limit), ...params]
  );
  return rows;
}

async function listReplies(nudgeId) {
  const [rows] = await query(
    "SELECT id, from_email, from_name, subject, body_text, received_at FROM email_replies WHERE nudge_id = ? ORDER BY received_at ASC",
    [nudgeId]
  );
  return rows;
}

/** Recent sent emails, for matching replies found in the inbox. */
async function listRecentForMatching(sinceDate) {
  const [rows] = await query(
    "SELECT id, company_id, lead_id, sent_by, subject, ref_code, message_id FROM email_nudges WHERE created_at >= ? AND delivery = 'email'",
    [sinceDate]
  );
  return rows;
}

/** Saves a reply once (the inbox can return the same message again). Returns true when it was new. */
async function addReply(reply) {
  const [existing] = await query("SELECT TOP 1 id FROM email_replies WHERE source_message_id = ?", [reply.source_message_id]);
  if (existing.length) return false;
  await query(
    `INSERT INTO email_replies (company_id, nudge_id, source_message_id, from_email, from_name, subject, body_text, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [reply.company_id, reply.nudge_id, reply.source_message_id, reply.from_email || null, reply.from_name || null,
      reply.subject || null, reply.body_text || null, reply.received_at]
  );
  await query(
    "UPDATE email_nudges SET reply_count = reply_count + 1, last_reply_at = CASE WHEN last_reply_at IS NULL OR last_reply_at < ? THEN ? ELSE last_reply_at END WHERE id = ?",
    [reply.received_at, reply.received_at, reply.nudge_id]
  );
  return true;
}

async function getSyncState(mailbox) {
  const [rows] = await query("SELECT last_synced, last_error, updated_at FROM mail_sync_state WHERE mailbox = ?", [mailbox]);
  return rows[0] || null;
}

async function saveSyncState(mailbox, lastSynced, lastError = null) {
  await query(
    `MERGE mail_sync_state AS t USING (SELECT ? AS mailbox) AS s ON t.mailbox = s.mailbox
     WHEN MATCHED THEN UPDATE SET last_synced = ?, last_error = ?, updated_at = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (mailbox, last_synced, last_error) VALUES (?, ?, ?);`,
    [mailbox, lastSynced, lastError, mailbox, lastSynced, lastError]
  );
}

/** Company users who can receive an admin email (active, with an email address). */
async function listRecipients(companyId, userIds) {
  if (!userIds.length) return [];
  const [rows] = await query(
    `SELECT user_id, name, email, role FROM users WHERE company_id = ? AND is_active = 1 AND user_id IN (${userIds.map(() => "?").join(", ")})`,
    [companyId, ...userIds]
  );
  return rows;
}

module.exports = { addReply, createNudge, getNudge, getSyncState, listNudges, listRecentForMatching, listRecentReplies, listRecipients, listReplies, saveSyncState };
