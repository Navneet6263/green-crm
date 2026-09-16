const db = require("../db/connection");

async function getPerformance(companyId, teamIds, managerView, executor = db) {
  const params = [companyId];
  let rosterTeam = "";
  if (Array.isArray(teamIds)) {
    rosterTeam = teamIds.length ? `AND EXISTS (
      SELECT 1 FROM (
        SELECT company_id, team_id, user_id FROM team_members WHERE is_active = 1
        UNION SELECT company_id, team_id, user_id FROM team_managers WHERE is_active = 1
      ) membership WHERE membership.company_id = u.company_id AND membership.user_id = u.user_id
        AND membership.team_id IN (${teamIds.map(() => "?").join(",")})
    )` : "AND 1 = 0";
    params.push(...teamIds);
  }
  const recordTeam = alias => Array.isArray(teamIds)
    ? teamIds.length ? `AND ${alias}.team_id IN (${teamIds.map(() => "?").join(",")})` : "AND 1 = 0" : "";
  const excludedRoles = managerView ? "'super-admin','platform-admin','platform-manager','admin','manager'" : "'super-admin','platform-admin','platform-manager'";
  params.push(companyId, ...(teamIds || []), companyId, ...(teamIds || []));
  const cte = `WITH roster AS (
      SELECT u.user_id, u.name, u.email, u.phone, u.role, u.is_active
      FROM users u WHERE u.company_id = ? AND u.role NOT IN (${excludedRoles}) ${rosterTeam}
    ), scoped_leads AS (
      SELECT l.lead_id, l.assigned_to, l.status, l.lead_source, l.estimated_value, l.company_name, l.workflow_stage, l.created_at
      FROM leads l INNER JOIN roster r ON r.user_id = l.assigned_to
      WHERE l.company_id = ? AND l.is_active = 1 ${recordTeam("l")}
    ), scoped_tasks AS (
      SELECT t.task_id, t.assigned_to, t.title, t.status, t.due_date
      FROM tasks t INNER JOIN roster r ON r.user_id = t.assigned_to
      WHERE t.company_id = ? ${recordTeam("t")}
    )`;
  const [boardResult, leadResult, taskResult, mixResult] = await Promise.all([
    executor.query(`${cte}, lead_stats AS (
      SELECT assigned_to, COUNT(*) AS ownedLeadCount,
        SUM(CASE WHEN status IN ('closed-won','onboarded','converted','closed') THEN 1 ELSE 0 END) AS wonLeads,
        SUM(CASE WHEN status NOT IN ('closed-won','onboarded','converted','closed','closed-lost') THEN 1 ELSE 0 END) AS openLeads
      FROM scoped_leads GROUP BY assigned_to
    ), task_stats AS (
      SELECT assigned_to,
        SUM(CASE WHEN status NOT IN ('done','completed','closed','cancelled') THEN 1 ELSE 0 END) AS pendingTasks,
        SUM(CASE WHEN status NOT IN ('done','completed','closed','cancelled') AND due_date < SYSUTCDATETIME() THEN 1 ELSE 0 END) AS overdueTasks
      FROM scoped_tasks GROUP BY assigned_to
    ) SELECT r.*, r.name AS displayName, COALESCE(l.ownedLeadCount,0) AS ownedLeadCount,
      COALESCE(l.wonLeads,0) AS wonLeads, COALESCE(l.openLeads,0) AS openLeads,
      COALESCE(t.pendingTasks,0) AS pendingTasks, COALESCE(t.overdueTasks,0) AS overdueTasks
      FROM roster r LEFT JOIN lead_stats l ON l.assigned_to = r.user_id LEFT JOIN task_stats t ON t.assigned_to = r.user_id
      ORDER BY wonLeads DESC, ownedLeadCount DESC, overdueTasks ASC, r.user_id`, params),
    executor.query(`${cte} SELECT TOP 6 l.*, r.name AS assigned_to_name FROM scoped_leads l
      INNER JOIN roster r ON r.user_id = l.assigned_to ORDER BY l.created_at DESC, l.lead_id DESC`, params),
    executor.query(`${cte} SELECT TOP 8 t.*, r.name AS assigned_to_name FROM scoped_tasks t
      INNER JOIN roster r ON r.user_id = t.assigned_to
      WHERE t.status NOT IN ('done','completed','closed','cancelled')
      ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date, t.task_id`, params),
    executor.query(`${cte} SELECT 'status' AS dimension, COALESCE(status,'new') AS [key], COUNT(*) AS total FROM scoped_leads GROUP BY status
      UNION ALL SELECT 'source', LOWER(LTRIM(RTRIM(COALESCE(lead_source,'unknown')))), COUNT(*) FROM scoped_leads GROUP BY LOWER(LTRIM(RTRIM(COALESCE(lead_source,'unknown'))))`, params),
  ]);
  return { teamBoard: boardResult[0], recentLeads: leadResult[0], pendingTasks: taskResult[0],
    stageMix: mixResult[0].filter(row => row.dimension === "status").map(row => ({ status: row.key, total: row.total })),
    sourceMix: mixResult[0].filter(row => row.dimension === "source").map(row => ({ lead_source: row.key, total: row.total })),
    generated_at: new Date().toISOString() };
}

module.exports = { getPerformance };
