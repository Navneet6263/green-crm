const db = require("../db/connection");
const AppError = require("../utils/appError");

async function listEmployeeLeadCounts(companyId, executor = db) {
  const [companies] = await executor.query(
    "SELECT TOP 1 company_id FROM companies WHERE company_id = ? AND status IN ('active', 'trial')",
    [companyId]
  );
  if (!companies.length) {
    throw new AppError("Integration company is not available", 403);
  }

  const [rows] = await executor.query(`
    SELECT u.name AS employee_name, COUNT(l.lead_id) AS lead_count
    FROM users u
    LEFT JOIN leads l ON l.assigned_to = u.user_id
      AND l.company_id = u.company_id AND l.is_active = 1
    WHERE u.company_id = ? AND u.is_active = 1
      AND u.role NOT IN ('super-admin', 'platform-admin', 'platform-manager')
    GROUP BY u.user_id, u.name
    ORDER BY u.name, u.user_id`, [companyId]);

  // Explicit allowlist: no lead records, contact details, IDs or money fields.
  return rows.map(row => ({
    employee_name: row.employee_name,
    lead_count: Number(row.lead_count),
  }));
}

module.exports = { listEmployeeLeadCounts };
