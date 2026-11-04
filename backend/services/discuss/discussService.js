const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const repo = require("../../repositories/discussRepository");
const leadService = require("../leadService");
const hub = require("./discussHub");

const MANAGE_ROLES = [ROLES.ADMIN, ROLES.MANAGER];
const MAX_TEXT = 4000;
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const me = (auth) => Number(auth.id);
const preview = (text, deleted) => (deleted ? "Message deleted" : String(text || "").replace(/\s+/g, " ").slice(0, 120));

function requireCompany(auth) {
  if (!auth.companyId || !auth.id) throw new AppError("Discuss is not available for this account.", 403);
}

/** "g:<group id>" or "d:<user id>" → { type, id, key } */
function parseChat(value) {
  const [type, id] = String(value || "").split(":");
  if (type === "g" && GUID_RE.test(id)) return { type: "group", id, key: repo.groupKey(id) };
  if (type === "d" && /^\d{1,18}$/.test(id)) return { type: "direct", id: Number(id), key: repo.directKey(id) };
  throw new AppError("Choose a chat.", 400);
}

async function groupAccess(auth, groupId) {
  const group = await repo.getGroup(groupId);
  if (!group || group.archived_at || (group.company_id && group.company_id !== auth.companyId)) throw new AppError("Group not found.", 404);
  const members = group.is_company_wide ? null : await repo.memberIds(group.id);
  if (members && !members.includes(me(auth))) throw new AppError("You are not in this group.", 403);
  const canManage = Number(group.created_by) === me(auth) || auth.role === ROLES.ADMIN || (auth.role === ROLES.MANAGER && !group.is_company_wide);
  return { group, members, canManage };
}

/** Who should get live updates for a chat. */
async function audience(auth, chat) {
  if (chat.type === "direct") return { companyId: auth.companyId, userIds: [me(auth), chat.id] };
  const { group, members } = await groupAccess(auth, chat.id);
  return group.is_company_wide ? { companyId: auth.companyId, companyWide: true } : { companyId: auth.companyId, userIds: members };
}

async function listChats(auth) {
  requireCompany(auth);
  const [groups, directs, people, companySize] = await Promise.all([
    repo.listGroupChats(auth.companyId, me(auth)),
    repo.listDirectChats(auth.companyId, me(auth)),
    repo.listPeople(auth.companyId, me(auth)),
    repo.countCompanyUsers(auth.companyId),
  ]);
  const online = new Set(hub.onlineUserIds(auth.companyId));
  const chats = [
    ...groups.map((g) => ({
      key: repo.groupKey(g.id), type: "group", id: g.id, name: g.name, description: g.description, is_company_wide: g.is_company_wide,
      member_count: g.is_company_wide ? companySize : g.member_count, unread: g.unread, can_manage: Number(g.created_by) === me(auth) || auth.role === ROLES.ADMIN,
      last: g.last_at ? { text: preview(g.last_text, g.last_deleted), sender: g.last_sender, at: g.last_at } : null, updated_at: g.last_at || g.created_at,
    })),
    ...directs.map((d) => ({
      key: repo.directKey(d.other_id), type: "direct", id: d.other_id, name: d.name, role: d.role, user_id: d.user_id, online: online.has(d.other_id), unread: d.unread,
      last: { text: preview(d.last_text, d.last_deleted), sender: Number(d.last_sender_id) === me(auth) ? "You" : d.name, at: d.last_at }, updated_at: d.last_at,
    })),
  ].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  return {
    me: me(auth),
    chats,
    people: people.map((p) => ({ id: Number(p.id), user_id: p.user_id, name: p.name, role: p.role, online: online.has(Number(p.id)) })),
    can_create_company_wide: MANAGE_ROLES.includes(auth.role),
    unread_total: chats.reduce((s, c) => s + c.unread, 0),
  };
}

const shape = (m, auth) => ({
  id: m.id, chat_group_id: m.group_id, sender_id: Number(m.sender_id), sender_name: m.sender_name, mine: Number(m.sender_id) === me(auth),
  text: m.deleted_at ? "" : m.text, deleted: Boolean(m.deleted_at), edited: Boolean(m.edited_at), created_at: m.created_at,
  lead: m.lead_id && !m.deleted_at ? { lead_id: m.lead_id, name: m.lead_name } : null,
  reply: m.reply_to ? { id: m.reply_to, sender: m.reply_sender, text: preview(m.reply_text, m.reply_deleted) } : null,
});

async function getMessages(auth, q = {}) {
  requireCompany(auth);
  const chat = parseChat(q.chat);
  let info;
  if (chat.type === "group") {
    const { group, canManage } = await groupAccess(auth, chat.id);
    info = { type: "group", id: group.id, name: group.name, description: group.description, is_company_wide: group.is_company_wide, created_by: Number(group.created_by), can_manage: canManage, members: (await repo.listMembers(group, auth.companyId)).map((m) => ({ ...m, id: Number(m.id) })) };
  } else {
    const other = await repo.getUser(auth.companyId, chat.id);
    if (!other) throw new AppError("Person not found.", 404);
    info = { type: "direct", id: Number(other.id), name: other.name, role: other.role, user_id: other.user_id, online: hub.onlineUserIds(auth.companyId).includes(Number(other.id)) };
  }
  const limit = Math.min(Math.max(Number(q.limit) || 50, 10), 100);
  const before = q.before && !Number.isNaN(Date.parse(q.before)) ? new Date(q.before) : null;
  const rows = await repo.listMessages(chat, me(auth), { before, limit });
  if (!before) await repo.markRead(me(auth), chat.key);
  return { chat: { key: chat.key, ...info }, messages: rows.map((m) => shape(m, auth)), has_more: rows.length === limit };
}

async function sendMessage(auth, body = {}) {
  requireCompany(auth);
  const chat = parseChat(body.chat);
  const text = String(body.text || "").trim();
  if (!text && !body.lead_id) throw new AppError("Write a message.", 400);
  if (text.length > MAX_TEXT) throw new AppError(`Keep messages under ${MAX_TEXT} characters.`, 400);
  const target = await audience(auth, chat);
  if (chat.type === "direct" && !(await repo.getUser(auth.companyId, chat.id))) throw new AppError("Person not found.", 404);
  let lead = null;
  if (body.lead_id) {
    // Only a lead the sender can open can be shared.
    lead = await leadService.getLead(auth, String(body.lead_id), { view: "core" });
  }
  let replyTo = null;
  if (body.reply_to) {
    const original = GUID_RE.test(String(body.reply_to)) ? await repo.getMessage(body.reply_to) : null;
    const sameChat = original && (chat.type === "group" ? String(original.group_id).toUpperCase() === String(chat.id).toUpperCase()
      : !original.group_id && [Number(original.sender_id), Number(original.recipient_id)].includes(chat.id));
    if (sameChat) replyTo = original.id;
  }
  const id = await repo.createMessage({
    group_id: chat.type === "group" ? chat.id : null, recipient_id: chat.type === "direct" ? chat.id : null, sender_id: me(auth), text,
    company_id: auth.companyId, lead_id: lead?.lead_id, lead_name: lead ? lead.company_name || lead.contact_person : null, reply_to: replyTo,
  });
  const message = shape(await repo.getMessage(id), auth);
  await repo.markRead(me(auth), chat.key);
  hub.publish({ type: "message", chat_group: chat.type === "group" ? repo.groupKey(chat.id) : null, sender_id: me(auth), recipient_id: chat.type === "direct" ? chat.id : null, message: { ...message, mine: false } }, target);
  return message;
}

async function ownMessage(auth, id) {
  if (!GUID_RE.test(String(id || ""))) throw new AppError("Message not found.", 404);
  const message = await repo.getMessage(id);
  if (!message || (message.company_id && message.company_id !== auth.companyId)) throw new AppError("Message not found.", 404);
  const chat = message.group_id ? { type: "group", id: message.group_id } : { type: "direct", id: Number(message.sender_id) === me(auth) ? Number(message.recipient_id) : Number(message.sender_id) };
  return { message, chat };
}

async function editMessage(auth, id, body = {}) {
  const { message, chat } = await ownMessage(auth, id);
  if (Number(message.sender_id) !== me(auth) || message.deleted_at) throw new AppError("You can only edit your own messages.", 403);
  const text = String(body.text || "").trim();
  if (!text || text.length > MAX_TEXT) throw new AppError("Write a message.", 400);
  await repo.updateMessageText(message.id, text);
  const updated = shape(await repo.getMessage(message.id), auth);
  hub.publish({ type: "updated", message: { ...updated, mine: false } }, await audience(auth, chat));
  return updated;
}

async function deleteMessage(auth, id) {
  const { message, chat } = await ownMessage(auth, id);
  if (Number(message.sender_id) !== me(auth) && auth.role !== ROLES.ADMIN) throw new AppError("You can only delete your own messages.", 403);
  await repo.softDeleteMessage(message.id);
  const updated = shape(await repo.getMessage(message.id), auth);
  hub.publish({ type: "updated", message: { ...updated, mine: false } }, await audience(auth, chat));
  return updated;
}

async function markRead(auth, body = {}) {
  requireCompany(auth);
  const chat = parseChat(body.chat);
  if (chat.type === "group") await groupAccess(auth, chat.id);
  await repo.markRead(me(auth), chat.key);
  return { ok: true };
}

async function typing(auth, body = {}) {
  requireCompany(auth);
  const chat = parseChat(body.chat);
  const target = await audience(auth, chat);
  const chatKeyForOthers = chat.type === "group" ? chat.key : repo.directKey(me(auth));
  hub.publish({ type: "typing", chat: chatKeyForOthers, sender_id: me(auth), sender_name: auth.name, typing: Boolean(body.typing) }, {
    ...target, userIds: (target.userIds || []).filter((id) => id !== me(auth)),
  });
  return { ok: true };
}

async function createGroup(auth, body = {}) {
  requireCompany(auth);
  const name = String(body.name || "").trim().slice(0, 80);
  if (!name) throw new AppError("Give the group a name.", 400);
  const companyWide = Boolean(body.company_wide);
  if (companyWide && !MANAGE_ROLES.includes(auth.role)) throw new AppError("Only admins and managers can make a group for everyone.", 403);
  const memberIds = companyWide ? [] : await repo.companyUserIds(auth.companyId, Array.isArray(body.member_ids) ? body.member_ids : []);
  if (!companyWide && !memberIds.filter((id) => id !== me(auth)).length) throw new AppError("Add at least one person.", 400);
  const id = await repo.createGroup({ name, description: String(body.description || "").trim().slice(0, 300), companyId: auth.companyId, createdBy: me(auth), companyWide });
  if (!companyWide) await repo.addMembers(id, [...new Set([me(auth), ...memberIds])]);
  hub.publish({ type: "chats" }, companyWide ? { companyId: auth.companyId, companyWide: true } : { companyId: auth.companyId, userIds: [me(auth), ...memberIds] });
  return { key: repo.groupKey(id), id };
}

async function updateGroup(auth, groupId, body = {}) {
  requireCompany(auth);
  const { group, members, canManage } = await groupAccess(auth, groupId);
  if (!canManage) throw new AppError("Only the group owner or an admin can change this group.", 403);
  const name = body.name !== undefined ? String(body.name).trim().slice(0, 80) : undefined;
  if (name === "") throw new AppError("Give the group a name.", 400);
  await repo.updateGroup(group.id, { name, description: body.description !== undefined ? String(body.description).trim().slice(0, 300) : undefined });
  if (!group.is_company_wide) {
    const add = await repo.companyUserIds(auth.companyId, Array.isArray(body.add_ids) ? body.add_ids : []);
    const remove = (Array.isArray(body.remove_ids) ? body.remove_ids : []).map(Number).filter((id) => id !== Number(group.created_by));
    if (add.length) await repo.addMembers(group.id, add);
    if (remove.length) await repo.removeMembers(group.id, remove);
    hub.publish({ type: "chats" }, { companyId: auth.companyId, userIds: [...new Set([...members, ...add])] });
  } else hub.publish({ type: "chats" }, { companyId: auth.companyId, companyWide: true });
  return { ok: true };
}

async function leaveGroup(auth, groupId) {
  requireCompany(auth);
  const { group } = await groupAccess(auth, groupId);
  if (group.is_company_wide) throw new AppError("Everyone in the company is in this group.", 400);
  await repo.removeMembers(group.id, [me(auth)]);
  return { ok: true };
}

async function archiveGroup(auth, groupId) {
  requireCompany(auth);
  const { group, members } = await groupAccess(auth, groupId);
  if (Number(group.created_by) !== me(auth) && auth.role !== ROLES.ADMIN) throw new AppError("Only the group owner or an admin can delete this group.", 403);
  await repo.archiveGroup(group.id);
  hub.publish({ type: "chats" }, group.is_company_wide ? { companyId: auth.companyId, companyWide: true } : { companyId: auth.companyId, userIds: members });
  return { ok: true };
}

async function unreadTotal(auth) {
  requireCompany(auth);
  const [groups, directs] = await Promise.all([repo.listGroupChats(auth.companyId, me(auth)), repo.listDirectChats(auth.companyId, me(auth))]);
  return { unread: [...groups, ...directs].reduce((s, c) => s + c.unread, 0) };
}

module.exports = { archiveGroup, createGroup, deleteMessage, editMessage, getMessages, leaveGroup, listChats, markRead, parseChat, sendMessage, typing, unreadTotal, updateGroup };
