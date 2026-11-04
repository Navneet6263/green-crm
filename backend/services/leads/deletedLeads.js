// Deleted (archived) leads: see who deleted what and why, and bring a lead back.
const { query, withTransaction } = require("../../db/connection");
const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const { createPrefixedId } = require("../../utils/ids");
const leadRepository = require("../../repositories/leadRepository");
const auditRepository = require("../../repositories/auditRepository");
const leadService = require("../leadService");

const MANAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER];
const canManage = (auth) => MANAGE_ROLES.includes(auth.role);

/** Deleted leads in the viewer's scope, newest first, with the reason and who deleted it. */
async function listDeletedLeads(auth, q = {}) {
  if (!canManage(auth)) throw new AppError("Only admins and managers can see deleted leads.", 403);
  const filters = await leadService.buildLeadFilters(auth, { search: q.search, team_ids: q.team_ids, assigned_to: q.assigned_to });
  const { whereClause, params } = leadRepository.buildLeadWhere({ ...filters, deletedOnly: true });
  const pageSize = Math.min(Math.max(Number(q.page_size) || 25, 1), 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const [rows] = await query(
    `SELECT l.lead_id, l.company_id, l.company_name, l.contact_person, l.phone, l.email, l.status, l.estimated_value, l.deleted_at, l.created_at,
       u.name AS assigned_to_name, t.name AS team_name, del.content AS delete_note, del.created_by AS deleted_by, dby.name AS deleted_by_name,
       COUNT(*) OVER() AS total_count
     FROM leads l
     LEFT JOIN users u ON u.user_id = l.assigned_to
     LEFT JOIN teams t ON t.team_id = l.team_id
     OUTER APPLY (
       SELECT TOP 1 ln.content, ln.created_by FROM lead_notes ln
       WHERE ln.company_id = l.company_id AND ln.lead_id = l.lead_id AND ln.content LIKE 'Lead archived.%'
       ORDER BY ln.created_at DESC, ln.id DESC
     ) del
     LEFT JOIN users dby ON dby.user_id = del.created_by
     ${whereClause}
     ORDER BY COALESCE(l.deleted_at, l.updated_at) DESC, l.lead_id DESC
     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    [...params, (page - 1) * pageSize, pageSize]
  );
  const total = Number(rows[0]?.total_count || 0);
  return {
    items: rows.map(({ total_count: _t, delete_note: note, ...r }) => ({ ...r, reason: String(note || "").replace(/^Lead archived\.\s*(Reason:\s*)?/i, "").trim() })),
    meta: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/** Brings a deleted lead back into the lists. A reason is kept in its history. */
async function restoreLead(auth, leadId, body = {}) {
  if (!canManage(auth)) throw new AppError("Only admins and managers can restore leads.", 403);
  const reason = String(body.change_note || body.note || "").trim();
  if (!reason) throw new AppError("Say why the lead is being restored.", 400);
  const filters = await leadService.buildLeadFilters(auth, {});
  const { whereClause, params } = leadRepository.buildLeadWhere({ ...filters, deletedOnly: true });
  const [rows] = await query(`SELECT TOP 1 l.lead_id, l.company_id FROM leads l ${whereClause} AND l.lead_id = ?`, [...params, leadId]);
  const lead = rows[0];
  if (!lead) throw new AppError("Deleted lead not found.", 404);
  await withTransaction(async (tx) => {
    await tx.query("UPDATE leads SET is_active = 1, deleted_at = NULL, updated_at = SYSUTCDATETIME() WHERE lead_id = ? AND company_id = ?", [lead.lead_id, lead.company_id]);
    await leadRepository.createNote({ company_id: lead.company_id, lead_id: lead.lead_id, content: `Lead restored.\n\nReason:\n${reason}`, created_by: auth.userId }, tx);
    await leadRepository.createActivity({ activity_id: await createPrefixedId("act"), company_id: lead.company_id, lead_id: lead.lead_id, type: "updated", description: `Lead restored. ${reason}`, created_by: auth.userId }, tx);
  });
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"), company_id: lead.company_id, action: "lead.restored", performed_by: auth.userId,
    user_email: auth.email, user_role: auth.role, target_user: lead.lead_id, details: { reason },
  }).catch(() => {});
  return { restored: true, lead_id: lead.lead_id };
}

module.exports = { listDeletedLeads, restoreLead };
