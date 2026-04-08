const db = require("../db/connection");
const { PLATFORM_COMPANY_ID } = require("../db/schema");

async function queryRows(sqlText, params = []) {
  const [rows] = await db.query(sqlText, params);
  return rows;
}

async function getPlatformSummary() {
  const [summaryRows, recentCompanies] = await Promise.all([
    queryRows(
      `
        SELECT
          (SELECT COUNT(*) FROM companies WHERE company_id <> ?) AS companies,
          (SELECT COUNT(*) FROM users WHERE company_id <> ? AND is_active = 1) AS users,
          (SELECT COUNT(*) FROM leads WHERE is_active = 1) AS leads,
          (SELECT COUNT(*) FROM products WHERE is_active = 1) AS products
      `,
      [PLATFORM_COMPANY_ID, PLATFORM_COMPANY_ID]
    ),
    queryRows(
      `
        SELECT TOP 5 company_id, name, slug, status, settings_currency, settings_timezone, created_at
        FROM companies
        WHERE company_id <> ?
        ORDER BY created_at DESC, id DESC
      `,
      [PLATFORM_COMPANY_ID]
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

async function getCompanySummary(companyId) {
  const [
    teamRows,
    taskSummaryRows,
    reminderRows,
    leadCounts,
    sourceMix,
    recentLeads,
    recentProducts,
  ] = await Promise.all([
    queryRows("SELECT COUNT(*) AS total FROM users WHERE company_id = ? AND is_active = 1", [companyId]),
    queryRows(
      `
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
          SUM(CASE WHEN status = 'pending' AND due_date < GETDATE() THEN 1 ELSE 0 END) AS overdue_tasks
        FROM tasks
        WHERE company_id = ?
      `,
      [companyId]
    ),
    queryRows(
      "SELECT COUNT(*) AS total FROM leads WHERE company_id = ? AND is_active = 1 AND follow_up_date IS NOT NULL",
      [companyId]
    ),
    queryRows(
      "SELECT status, COUNT(*) AS total FROM leads WHERE company_id = ? AND is_active = 1 GROUP BY status",
      [companyId]
    ),
    queryRows(
      `
        SELECT TOP 5 lead_source, COUNT(*) AS total
        FROM leads
        WHERE company_id = ? AND is_active = 1
        GROUP BY lead_source
        ORDER BY total DESC, lead_source ASC
      `,
      [companyId]
    ),
    queryRows(
      `
        SELECT TOP 5 lead_id, company_name, contact_person, status, priority, workflow_stage, estimated_value, created_at
        FROM leads
        WHERE company_id = ? AND is_active = 1
        ORDER BY created_at DESC, id DESC
      `,
      [companyId]
    ),
    queryRows(
      `
        SELECT TOP 5 product_id, name, color, created_at
        FROM products
        WHERE company_id = ? AND is_active = 1
        ORDER BY created_at DESC, id DESC
      `,
      [companyId]
    ),
  ]);
  const taskSummary = taskSummaryRows[0] || {};

  return {
    team_size: teamRows[0].total,
    pending_tasks: taskSummary.pending_tasks || 0,
    overdue_tasks: taskSummary.overdue_tasks || 0,
    pending_reminders: reminderRows[0].total,
    lead_counts: leadCounts,
    source_mix: sourceMix,
    recent_leads: recentLeads,
    recent_products: recentProducts,
  };
}

async function getUserSummary({ companyId, userId, scope }) {
  const column = scope === "created" ? "created_by" : scope === "assigned" ? "assigned_to" : null;
  const params = [companyId];
  const scopedCondition = column ? `AND ${column} = ?` : "";

  if (column) {
    params.push(userId);
  }

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
        FROM leads
        WHERE company_id = ? AND is_active = 1 ${scopedCondition}
        GROUP BY status
      `,
      params
    ),
    queryRows(
      `
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
          SUM(CASE WHEN status = 'pending' AND due_date < GETDATE() THEN 1 ELSE 0 END) AS overdue_tasks
        FROM tasks
        WHERE company_id = ? ${taskCondition}
      `,
      taskParams
    ),
    queryRows(
      `
        SELECT COUNT(*) AS total
        FROM leads
        WHERE company_id = ? AND is_active = 1 ${scopedCondition} AND follow_up_date IS NOT NULL
      `,
      params
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
        INNER JOIN leads l ON l.lead_id = la.lead_id
        WHERE la.company_id = ?
        ORDER BY la.created_at DESC, la.id DESC
      `,
      [companyId]
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
