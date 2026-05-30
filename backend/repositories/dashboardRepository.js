const db = require("../db/connection");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { buildLeadUserAccessPredicate } = require("./leadAssignmentRepository");
const dashboardLeadAnalyticsRepository = require("./dashboardLeadAnalyticsRepository");

const SQL_NOW = "SYSUTCDATETIME()";

async function queryRows(sqlText, params = []) {
  const [rows] = await db.query(sqlText, params);
  return rows;
}

function buildScopedCompanyClause(companyIds, columnName = "company_id") {
  if (!Array.isArray(companyIds)) {
    return {
      clause: "",
      params: [],
    };
  }

  if (!companyIds.length) {
    return {
      clause: " AND 1 = 0",
      params: [],
    };
  }

  return {
    clause: ` AND ${columnName} IN (${companyIds.map(() => "?").join(", ")})`,
    params: companyIds,
  };
}

function buildScopedTeamClause(teamIds, columnName = "team_id") {
  if (!Array.isArray(teamIds)) {
    return {
      clause: "",
      params: [],
    };
  }

  if (!teamIds.length) {
    return {
      clause: " AND 1 = 0",
      params: [],
    };
  }

  return {
    clause: ` AND ${columnName} IN (${teamIds.map(() => "?").join(", ")})`,
    params: teamIds,
  };
}

async function getPlatformSummary(companyIds = null) {
  const companyScope = buildScopedCompanyClause(companyIds, "company_id");
  const [summaryRows, recentCompanies] = await Promise.all([
    queryRows(
      `
        SELECT
          (SELECT COUNT(*) FROM companies WHERE company_id <> ?${companyScope.clause}) AS companies,
          (SELECT COUNT(*) FROM users WHERE company_id <> ? AND is_active = 1${companyScope.clause}) AS users,
          (SELECT COUNT(*) FROM leads WHERE is_active = 1${companyScope.clause}) AS leads,
          (SELECT COUNT(*) FROM products WHERE is_active = 1${companyScope.clause}) AS products
      `,
      [
        PLATFORM_COMPANY_ID,
        ...companyScope.params,
        PLATFORM_COMPANY_ID,
        ...companyScope.params,
        ...companyScope.params,
        ...companyScope.params,
      ]
    ),
    queryRows(
      `
        SELECT TOP 5 company_id, name, slug, status, settings_currency, settings_timezone, created_at
        FROM companies
        WHERE company_id <> ?${companyScope.clause}
        ORDER BY created_at DESC, id DESC
      `,
      [PLATFORM_COMPANY_ID, ...companyScope.params]
    ),
  ]);
  const summary = summaryRows[0] || {};

  return {
    companies: summary.companies || 0,
    users: summary.users || 0,
    leads: summary.leads || 0,
    products: summary.products || 0,
    recent_companies: recentCompanies,
  };
}

async function getCompanySummary(companyId, teamIds = null) {
  const teamScope = buildScopedTeamClause(teamIds, "team_id");
  const [
    teamRows,
    taskSummaryRows,
    reminderRows,
    sourceMix,
    recentLeads,
    recentProducts,
    leadAnalytics,
    workflowRows,
  ] = await Promise.all([
    queryRows(
      `SELECT COUNT(DISTINCT u.user_id) AS total
       FROM users u
       ${
         Array.isArray(teamIds)
           ? `INNER JOIN (
                SELECT company_id, team_id, user_id
                FROM team_members
                WHERE is_active = 1
                UNION
                SELECT company_id, team_id, user_id
                FROM team_managers
                WHERE is_active = 1
              ) scoped_team_users
              ON scoped_team_users.user_id = u.user_id
             AND scoped_team_users.company_id = u.company_id`
           : ""
       }
       WHERE u.company_id = ? AND u.is_active = 1${Array.isArray(teamIds) ? teamScope.clause.replace(/team_id/g, "scoped_team_users.team_id") : ""}`,
      [companyId, ...(Array.isArray(teamIds) ? teamScope.params : [])]
    ),
    queryRows(
      `
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
          SUM(CASE WHEN status = 'pending' AND due_date < ${SQL_NOW} THEN 1 ELSE 0 END) AS overdue_tasks
        FROM tasks
        WHERE company_id = ?${teamScope.clause}
      `,
      [companyId, ...teamScope.params]
    ),
    queryRows(
      `SELECT COUNT(*) AS total FROM leads WHERE company_id = ? AND is_active = 1 AND follow_up_date IS NOT NULL${teamScope.clause}`,
      [companyId, ...teamScope.params]
    ),
    queryRows(
      `
        SELECT TOP 5 lead_source, COUNT(*) AS total
        FROM leads
        WHERE company_id = ? AND is_active = 1${teamScope.clause}
        GROUP BY lead_source
        ORDER BY total DESC, lead_source ASC
      `,
      [companyId, ...teamScope.params]
    ),
    queryRows(
      `
        SELECT TOP 5 lead_id, company_name, contact_person, status, priority, workflow_stage, estimated_value, created_at
        FROM leads
        WHERE company_id = ? AND is_active = 1${teamScope.clause}
        ORDER BY created_at DESC, id DESC
      `,
      [companyId, ...teamScope.params]
    ),
    queryRows(
      `
        SELECT TOP 5 product_id, name, color, created_at
        FROM products
        WHERE company_id = ? AND is_active = 1${teamScope.clause}
        ORDER BY created_at DESC, id DESC
      `,
      [companyId, ...teamScope.params]
    ),
    dashboardLeadAnalyticsRepository.getCompanyLeadAnalytics(companyId, teamIds),
    queryRows(
      `SELECT
         COUNT(*) AS total_workflow_leads,
         SUM(CASE WHEN workflow_status IN ('in_progress', 'pending_qa', 'revisions_needed') THEN 1 ELSE 0 END) AS active_workflow_leads,
         SUM(CASE WHEN workflow_status IN ('approved', 'completed') THEN 1 ELSE 0 END) AS completed_workflow_leads,
         COALESCE(SUM(advance_received), 0) AS total_advance_received,
         COALESCE(SUM(remaining_payment), 0) AS total_remaining_payment
       FROM leads
       WHERE company_id = ? AND is_active = 1 AND is_workflow = 1${teamScope.clause}`,
      [companyId, ...teamScope.params]
    ),
  ]);
  const taskSummary = taskSummaryRows[0] || {};
  const workflowRow = workflowRows[0] || {};

  return {
    team_size: teamRows[0].total,
    pending_tasks: taskSummary.pending_tasks || 0,
    overdue_tasks: taskSummary.overdue_tasks || 0,
    pending_reminders: reminderRows[0].total,
    lead_counts: leadAnalytics.lead_counts,
    source_mix: sourceMix,
    recent_leads: recentLeads,
    recent_products: recentProducts,
    kpis: leadAnalytics.kpis,
    charts: leadAnalytics.charts,
    insights: leadAnalytics.insights,
    workflow_summary: {
      total_workflow_leads: workflowRow.total_workflow_leads || 0,
      active_workflow_leads: workflowRow.active_workflow_leads || 0,
      completed_workflow_leads: workflowRow.completed_workflow_leads || 0,
      total_advance_received: workflowRow.total_advance_received || 0,
      total_remaining_payment: workflowRow.total_remaining_payment || 0,
    },
  };
}

async function getUserSummary({
  companyId,
  userId,
  scope,
  teamIds = null,
  viewerAccessColumns = ["assigned_to"],
}) {
  const leadTeamScope = buildScopedTeamClause(teamIds, "l.team_id");
  const taskTeamScope = buildScopedTeamClause(teamIds, "team_id");
  const createdParams = scope === "created" ? [userId] : [];
  const viewerPredicate =
    scope === "assigned"
      ? buildLeadUserAccessPredicate({
          leadAlias: "l",
          primaryColumns: viewerAccessColumns,
          userId,
        })
      : { clause: "", params: [] };
  const scopedCondition =
    scope === "created"
      ? "AND l.created_by = ?"
      : scope === "assigned" && viewerPredicate.clause
        ? `AND ${viewerPredicate.clause}`
        : "";
  const leadParams = [companyId, ...createdParams, ...viewerPredicate.params, ...leadTeamScope.params];

  const taskParams = [companyId];
  let taskCondition = "";

  if (scope === "assigned") {
    taskCondition = "AND assigned_to = ?";
    taskParams.push(userId);
  }

  const [leadCounts, taskSummaryRows, reminderRows, recentActivity] = await Promise.all([
    queryRows(
      `
        SELECT status, COUNT(*) AS total
        FROM leads l
        WHERE l.company_id = ? AND l.is_active = 1 ${scopedCondition} ${leadTeamScope.clause}
        GROUP BY status
      `,
      leadParams
    ),
    queryRows(
      `
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
          SUM(CASE WHEN status = 'pending' AND due_date < ${SQL_NOW} THEN 1 ELSE 0 END) AS overdue_tasks
        FROM tasks
        WHERE company_id = ? ${taskCondition} ${taskTeamScope.clause}
      `,
      [...taskParams, ...taskTeamScope.params]
    ),
    queryRows(
      `
        SELECT COUNT(*) AS total
        FROM leads l
        WHERE l.company_id = ? AND l.is_active = 1 ${scopedCondition} ${leadTeamScope.clause} AND l.follow_up_date IS NOT NULL
      `,
      leadParams
    ),
    queryRows(
      `
        SELECT TOP 5
          la.activity_id,
          la.type AS activity_type,
          la.description AS message,
          la.created_at,
          l.company_name,
          l.contact_person
        FROM lead_activities la
        INNER JOIN leads l ON l.lead_id = la.lead_id AND l.company_id = la.company_id
        WHERE la.company_id = ? ${scopedCondition} ${leadTeamScope.clause}
        ORDER BY la.created_at DESC, la.id DESC
      `,
      leadParams
    ),
  ]);
  const taskSummary = taskSummaryRows[0] || {};

  return {
    lead_counts: leadCounts,
    pending_tasks: taskSummary.pending_tasks || 0,
    overdue_tasks: taskSummary.overdue_tasks || 0,
    pending_reminders: reminderRows[0].total,
    recent_activity: recentActivity,
  };
}

module.exports = {
  getCompanySummary,
  getPlatformSummary,
  getUserSummary,
};
