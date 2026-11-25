// Lead Transfer across teams.
// Inside its own team a lead can simply be reassigned. To send it to someone in another team the
// Transfer button is used: when that person accepts, the lead moves to their team and becomes theirs.
const db = require("../../db/connection");
const teamRepository = require("../../repositories/teamRepository");
const leadRepository = require("../../repositories/leadRepository");
const { assertProductForTeam } = require("../productAccessService");
const AppError = require("../../utils/appError");

/** Active teams of a person (member or manager), their primary team first. */
async function listPersonTeams(companyId, userId) {
  const [rows] = await db.query(
    `SELECT x.team_id FROM (
       SELECT tm.team_id, CAST(tm.is_primary AS INT) AS is_primary, tm.created_at FROM team_members tm
       WHERE tm.company_id = ? AND tm.user_id = ? AND tm.is_active = 1
       UNION ALL
       SELECT mg.team_id, 0 AS is_primary, mg.created_at FROM team_managers mg
       WHERE mg.company_id = ? AND mg.user_id = ? AND mg.is_active = 1
     ) x
     INNER JOIN teams t ON t.company_id = ? AND t.team_id = x.team_id AND t.is_active = 1
     ORDER BY x.is_primary DESC, x.created_at ASC`,
    [companyId, userId, companyId, userId, companyId]
  );
  return [...new Set(rows.map((row) => row.team_id))];
}

/**
 * Where the lead goes if `recipientUserId` takes it.
 * Returns null when the person is already in the lead's team (a normal transfer),
 * otherwise the team the lead will move to. Throws a clear 400 when the move cannot work.
 */
async function resolveTransferTeam(lead, recipientUserId) {
  if (!lead?.team_id) return null;
  const inTeam = await teamRepository.listUsersForTeams(lead.company_id, [lead.team_id]);
  if (inTeam.includes(recipientUserId)) return null;

  const teams = await listPersonTeams(lead.company_id, recipientUserId);
  if (!teams.length) {
    throw new AppError("This person is not in any team yet, so the lead cannot be transferred to them.", 400);
  }
  const targetTeamId = teams[0];

  try {
    await assertProductForTeam(lead.company_id, lead.product_id, targetTeamId);
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode >= 500) throw error;
    throw new AppError("This lead's product is not shared with the other person's team. Ask an admin to share it (Settings > Products), then transfer again.", 400);
  }

  if (lead.phone) {
    const duplicate = await leadRepository.findLeadByPhoneInTeam(lead.phone, targetTeamId, lead.lead_id);
    if (duplicate) {
      throw new AppError(`The other team already has this phone number under ${duplicate.contact_person || duplicate.company_name || "another lead"}.`, 400);
    }
  }
  return targetTeamId;
}

/** People a lead can be transferred to: everyone active in the company, with their team names. */
async function listTransferRecipients(auth, queryText) {
  const search = String(queryText || "").trim().slice(0, 80);
  if (!search || !auth.companyId) return [];
  const pattern = `%${search}%`;
  const [rows] = await db.query(
    `SELECT TOP 20 u.id, u.user_id, u.name, u.role, u.department,
       STUFF((SELECT ', ' + t.name FROM team_members tm
              INNER JOIN teams t ON t.company_id = tm.company_id AND t.team_id = tm.team_id AND t.is_active = 1
              WHERE tm.company_id = u.company_id AND tm.user_id = u.user_id AND tm.is_active = 1
              FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS team_names
     FROM users u
     WHERE u.company_id = ? AND u.is_active = 1 AND u.user_id <> ?
       AND (u.name LIKE ? OR u.email LIKE ? OR u.role LIKE ?)
     ORDER BY u.name`,
    [auth.companyId, auth.userId, pattern, pattern, pattern]
  );
  return rows;
}

module.exports = { listPersonTeams, listTransferRecipients, resolveTransferTeam };
