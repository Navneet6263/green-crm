const { query } = require("../db/connection");

const num = (v) => Number(v || 0);
const groupKey = (id) => `g:${String(id).toUpperCase()}`;
const directKey = (otherId) => `d:${Number(otherId)}`;

async function getUser(companyId, id) {
  const [rows] = await query("SELECT id, user_id, name, role, email FROM users WHERE company_id = ? AND id = ? AND is_active = 1", [companyId, Number(id)]);
  return rows[0] || null;
}

async function listPeople(companyId, exceptId) {
  const [rows] = await query(
    "SELECT id, user_id, name, role, email, last_login_at FROM users WHERE company_id = ? AND is_active = 1 AND id <> ? ORDER BY name",
    [companyId, Number(exceptId)]
  );
  return rows;
}

async function countCompanyUsers(companyId) {
  const [rows] = await query("SELECT COUNT(*) AS total FROM users WHERE company_id = ? AND is_active = 1", [companyId]);
  return num(rows[0]?.total);
}

async function getGroup(id) {
  const [rows] = await query(
    "SELECT id, name, description, company_id, created_by, is_company_wide, created_at, last_message_at, archived_at FROM chat_groups WHERE id = ?",
    [id]
  );
  return rows[0] ? { ...rows[0], is_company_wide: Boolean(rows[0].is_company_wide) } : null;
}

async function memberIds(groupId) {
  const [rows] = await query("SELECT user_id FROM chat_group_members WHERE group_id = ?", [groupId]);
  return rows.map((r) => num(r.user_id));
}

async function listMembers(group, companyId) {
  const [rows] = group.is_company_wide
    ? await query("SELECT id, user_id, name, role FROM users WHERE company_id = ? AND is_active = 1 ORDER BY name", [companyId])
    : await query(
      `SELECT u.id, u.user_id, u.name, u.role FROM chat_group_members m JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ? AND u.company_id = ? ORDER BY u.name`,
      [group.id, companyId]
    );
  return rows;
}

/** Groups the person belongs to (or company-wide ones), with the last message and their unread count. */
async function listGroupChats(companyId, userId) {
  const [rows] = await query(
    `SELECT g.id, g.name, g.description, g.is_company_wide, g.created_by, g.created_at,
       (SELECT COUNT(*) FROM chat_group_members m2 WHERE m2.group_id = g.id) AS member_count,
       lm.text AS last_text, lm.created_at AS last_at, lm.deleted_at AS last_deleted, lu.name AS last_sender,
       (SELECT COUNT(*) FROM chat_messages cm WHERE cm.group_id = g.id AND cm.sender_id <> ? AND cm.deleted_at IS NULL
          AND cm.created_at > COALESCE(r.last_read_at, CAST('1900-01-01' AS DATETIME2))) AS unread
     FROM chat_groups g
     LEFT JOIN chat_group_members m ON m.group_id = g.id AND m.user_id = ?
     LEFT JOIN chat_reads r ON r.user_id = ? AND r.chat_key = CONCAT('g:', CONVERT(varchar(36), g.id))
     OUTER APPLY (SELECT TOP 1 text, created_at, sender_id, deleted_at FROM chat_messages WHERE group_id = g.id ORDER BY created_at DESC) lm
     LEFT JOIN users lu ON lu.id = lm.sender_id
     WHERE g.archived_at IS NULL
       AND (g.company_id = ? OR g.company_id IS NULL)
       AND (m.user_id IS NOT NULL OR (g.is_company_wide = 1 AND g.company_id = ?))`,
    [userId, userId, userId, companyId, companyId]
  );
  return rows.map((r) => ({ ...r, is_company_wide: Boolean(r.is_company_wide), member_count: num(r.member_count), unread: num(r.unread) }));
}

/** One row per person this user has direct messages with. */
async function listDirectChats(companyId, userId) {
  const [rows] = await query(
    `WITH d AS (
       SELECT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other_id, text, created_at, sender_id, deleted_at,
         ROW_NUMBER() OVER (PARTITION BY CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END ORDER BY created_at DESC) AS rn
       FROM chat_messages WHERE group_id IS NULL AND (sender_id = ? OR recipient_id = ?)
     )
     SELECT d.other_id, u.user_id, u.name, u.role, d.text AS last_text, d.created_at AS last_at, d.sender_id AS last_sender_id, d.deleted_at AS last_deleted,
       (SELECT COUNT(*) FROM chat_messages cm WHERE cm.group_id IS NULL AND cm.sender_id = d.other_id AND cm.recipient_id = ? AND cm.deleted_at IS NULL
          AND cm.created_at > COALESCE((SELECT TOP 1 last_read_at FROM chat_reads WHERE user_id = ? AND chat_key = CONCAT('d:', CONVERT(varchar(20), d.other_id))), CAST('1900-01-01' AS DATETIME2))) AS unread
     FROM d JOIN users u ON u.id = d.other_id AND u.company_id = ?
     WHERE d.rn = 1`,
    [userId, userId, userId, userId, userId, userId, companyId]
  );
  return rows.map((r) => ({ ...r, other_id: num(r.other_id), unread: num(r.unread) }));
}

const MESSAGE_COLUMNS = `cm.id, cm.group_id, cm.sender_id, u.name AS sender_name, cm.recipient_id, cm.text, cm.created_at, cm.edited_at, cm.deleted_at,
  cm.lead_id, cm.lead_name, cm.reply_to, rm.text AS reply_text, ru.name AS reply_sender, rm.deleted_at AS reply_deleted`;
const MESSAGE_FROM = `FROM chat_messages cm JOIN users u ON u.id = cm.sender_id
  LEFT JOIN chat_messages rm ON rm.id = cm.reply_to LEFT JOIN users ru ON ru.id = rm.sender_id`;

function chatWhere(chat, userId) {
  return chat.type === "group"
    ? { sql: "cm.group_id = ?", params: [chat.id] }
    : { sql: "cm.group_id IS NULL AND ((cm.sender_id = ? AND cm.recipient_id = ?) OR (cm.sender_id = ? AND cm.recipient_id = ?))", params: [userId, chat.id, chat.id, userId] };
}

/** Newest `limit` messages before `before` (a Date), returned oldest first. */
async function listMessages(chat, userId, { before = null, limit = 50 } = {}) {
  const where = chatWhere(chat, userId);
  const params = [Number(limit), ...where.params];
  let extra = "";
  if (before) { extra = " AND cm.created_at < ?"; params.push(before); }
  const [rows] = await query(`SELECT TOP (?) ${MESSAGE_COLUMNS} ${MESSAGE_FROM} WHERE ${where.sql}${extra} ORDER BY cm.created_at DESC`, params);
  return rows.reverse();
}

async function getMessage(id) {
  const [rows] = await query(`SELECT ${MESSAGE_COLUMNS}, cm.company_id ${MESSAGE_FROM} WHERE cm.id = ?`, [id]);
  return rows[0] || null;
}

async function createMessage(m) {
  const [rows] = await query(
    `INSERT INTO chat_messages (group_id, sender_id, recipient_id, text, company_id, lead_id, lead_name, reply_to, created_at)
     OUTPUT INSERTED.id
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSUTCDATETIME())`,
    [m.group_id || null, m.sender_id, m.recipient_id || null, m.text, m.company_id, m.lead_id || null, m.lead_name || null, m.reply_to || null]
  );
  if (m.group_id) await query("UPDATE chat_groups SET last_message_at = SYSUTCDATETIME() WHERE id = ?", [m.group_id]);
  return rows[0]?.id;
}

async function updateMessageText(id, text) {
  await query("UPDATE chat_messages SET text = ?, edited_at = SYSUTCDATETIME() WHERE id = ?", [text, id]);
}

async function softDeleteMessage(id) {
  await query("UPDATE chat_messages SET deleted_at = SYSUTCDATETIME() WHERE id = ?", [id]);
}

async function markRead(userId, chatKey) {
  await query(
    `MERGE chat_reads AS t USING (SELECT ? AS user_id, ? AS chat_key) AS s ON t.user_id = s.user_id AND t.chat_key = s.chat_key
     WHEN MATCHED THEN UPDATE SET last_read_at = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (user_id, chat_key, last_read_at) VALUES (?, ?, SYSUTCDATETIME());`,
    [userId, chatKey, userId, chatKey]
  );
}

async function createGroup({ name, description, companyId, createdBy, companyWide }) {
  const [rows] = await query(
    `INSERT INTO chat_groups (name, description, company_id, created_by, is_company_wide, created_at)
     OUTPUT INSERTED.id
     VALUES (?, ?, ?, ?, ?, SYSUTCDATETIME())`,
    [name, description || null, companyId, createdBy, companyWide ? 1 : 0]
  );
  return rows[0]?.id;
}

async function addMembers(groupId, userIds) {
  const current = new Set(await memberIds(groupId));
  for (const id of userIds) {
    if (!current.has(Number(id))) await query("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [groupId, Number(id)]);
  }
}

async function removeMembers(groupId, userIds) {
  for (const id of userIds) await query("DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?", [groupId, Number(id)]);
}

async function updateGroup(groupId, { name, description }) {
  await query("UPDATE chat_groups SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?", [name ?? null, description ?? null, groupId]);
}

async function archiveGroup(groupId) {
  await query("UPDATE chat_groups SET archived_at = SYSUTCDATETIME() WHERE id = ?", [groupId]);
}

/** Active people in the company among `ids` (numbers). */
async function companyUserIds(companyId, ids) {
  const clean = [...new Set(ids.map(Number).filter(Number.isFinite))].slice(0, 300);
  if (!clean.length) return [];
  const [rows] = await query(`SELECT id FROM users WHERE company_id = ? AND is_active = 1 AND id IN (${clean.map(() => "?").join(", ")})`, [companyId, ...clean]);
  return rows.map((r) => num(r.id));
}

module.exports = {
  addMembers, archiveGroup, companyUserIds, countCompanyUsers, createGroup, createMessage, directKey, getGroup, getMessage, getUser, groupKey,
  listDirectChats, listGroupChats, listMembers, listMessages, listPeople, markRead, memberIds, removeMembers, softDeleteMessage, updateGroup, updateMessageText,
};
