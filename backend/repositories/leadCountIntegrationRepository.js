const db = require("../db/connection");
const AppError = require("../utils/appError");
const { getIndiaDayStartUtc } = require("../utils/indiaDateBuckets");

async function listEmployeeLeadCounts(companyId, executor = db, reference = new Date()) {
  const dayStart = getIndiaDayStartUtc(reference);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const [companies] = await executor.query(
    "SELECT TOP 1 company_id FROM companies WHERE company_id = ? AND status IN ('active', 'trial')",
    [companyId]
  );
  if (!companies.length) {
    throw new AppError("Integration company is not available", 403);
  }

  // A missing LEFT JOIN row must not count as an open lead. Unknown/custom
  // non-terminal statuses count as open, consistent with CRM analytics.
  const openLead = `l.lead_id IS NOT NULL AND
    LOWER(LTRIM(RTRIM(COALESCE(l.status, 'new')))) NOT IN
    ('closed-won', 'onboarded', 'converted', 'closed', 'closed-lost')`;
  const [rows] = await executor.query(`
    SELECT u.user_id AS employee_id, u.name AS employee_name,
      COUNT(l.lead_id) AS lead_count,
      SUM(CASE WHEN ${openLead} THEN 1 ELSE 0 END) AS open_lead_count,
      SUM(CASE WHEN ${openLead} AND l.follow_up_date >= ? AND l.follow_up_date < ?
        THEN 1 ELSE 0 END) AS today_follow_up_count,
      SUM(CASE WHEN ${openLead} AND l.follow_up_date < ?
        THEN 1 ELSE 0 END) AS overdue_follow_up_count
    FROM users u
    LEFT JOIN leads l ON l.assigned_to = u.user_id
      AND l.company_id = u.company_id AND l.is_active = 1
    WHERE u.company_id = ? AND u.is_active = 1
      AND u.role NOT IN ('super-admin', 'platform-admin', 'platform-manager')
    GROUP BY u.user_id, u.name
    ORDER BY u.name, u.user_id`, [dayStart, dayEnd, dayStart, companyId]);

  // Explicit allowlist: employee identity and counts only. No individual lead
  // records, contact fields, revenue, SQL execution or write access is exposed.
  return rows.map(row => ({
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    lead_count: Number(row.lead_count),
    open_lead_count: Number(row.open_lead_count),
    today_follow_up_count: Number(row.today_follow_up_count),
    overdue_follow_up_count: Number(row.overdue_follow_up_count),
  }));
}

module.exports = { listEmployeeLeadCounts };
