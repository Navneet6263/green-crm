// Opt-in SQL Server verification. Executes SELECT over inline synthetic VALUES
// only: no real CRM rows are read and no database/schema writes are performed.
// From backend: CRM_INTEGRATION_SQL_TESTS=1 node --test tests/lead-count-integration-sql.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("SQL Server counts synthetic leads with tenant, status, zero-user and India-midnight boundaries", {
  skip: process.env.CRM_INTEGRATION_SQL_TESTS !== "1",
}, async () => {
  require("dotenv").config();
  const sql = require("mssql");
  // Import only configuration; do not use initializeDatabase/db.query, which
  // may perform the application's legacy compatibility migrations at startup.
  const { config } = require("../db/connection");
  const repository = require("../repositories/leadCountIntegrationRepository");
  const pool = new sql.ConnectionPool({ ...config, connectionTimeout: 8000, requestTimeout: 8000,
    pool: { max: 1, min: 0, idleTimeoutMillis: 1000 } });
  const users = `(VALUES
    ('u1','fixture','Ravi',1,'sales'), ('u2','fixture','Aman',1,'sales'),
    ('u3','fixture','Ravi',1,'sales'), ('u4','fixture','Inactive',0,'sales'),
    ('u5','fixture','Platform',1,'platform-admin'), ('u6','other','Other',1,'sales')
  ) AS u(user_id,company_id,name,is_active,role)`;
  const leads = `(VALUES
    ('l1','fixture','u1','new',CAST('2026-09-14T18:30:00.000' AS DATETIME2),1),
    ('l2','fixture','u1','new',CAST('2026-09-15T18:29:59.999' AS DATETIME2),1),
    ('l3','fixture','u1','new',CAST('2026-09-14T18:29:59.999' AS DATETIME2),1),
    ('l4','fixture','u1','new',CAST('2026-09-15T18:30:00.000' AS DATETIME2),1),
    ('l5','fixture','u1',NULL,NULL,1),
    ('l6','fixture','u1','closed-won',CAST('2026-09-14T18:29:59.999' AS DATETIME2),1),
    ('l7','fixture','u1','closed-lost',CAST('2026-09-14T18:30:00.000' AS DATETIME2),1),
    ('l8','fixture','u1','converted',CAST('2026-09-14T18:30:00.000' AS DATETIME2),1),
    ('l9','fixture','u1','onboarded',CAST('2026-09-14T18:30:00.000' AS DATETIME2),1),
    ('l10','fixture','u1','closed',CAST('2026-09-14T18:30:00.000' AS DATETIME2),1),
    ('l11','fixture','u1','new',CAST('2026-09-14T18:30:00.000' AS DATETIME2),0),
    ('l12','other','u1','new',CAST('2026-09-14T18:30:00.000' AS DATETIME2),1),
    ('l13','fixture','u4','new',NULL,1), ('l14','fixture','u5','new',NULL,1),
    ('l15','fixture',NULL,'new',NULL,1),
    ('l16','fixture','u3','custom-open',CAST('2026-09-14T18:29:59.999' AS DATETIME2),1)
  ) AS l(lead_id,company_id,assigned_to,status,follow_up_date,is_active)`;
  const executor = { query: async (query, params) => {
    if (query.includes("FROM companies")) return [[{ company_id: "fixture" }]];
    assert.match(query, /FROM users u/);
    assert.match(query, /LEFT JOIN leads l/);
    const syntheticQuery = query.replace("FROM users u", `FROM ${users}`)
      .replace("LEFT JOIN leads l", `LEFT JOIN ${leads}`);
    assert.doesNotMatch(syntheticQuery, /\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|EXEC|MERGE)\b/i);
    const request = pool.request();
    params.forEach((value, index) => request.input(`p${index}`, value instanceof Date ? sql.DateTime2 : sql.VarChar(20), value));
    let index = 0;
    const result = await request.query(syntheticQuery.replace(/\?/g, () => `@p${index++}`));
    return [result.recordset];
  } };
  try {
    await pool.connect();
    const first = await repository.listEmployeeLeadCounts("fixture", executor, new Date("2026-09-15T18:29:59.999Z"));
    assert.deepEqual(first, [
      { employee_id: "u2", employee_name: "Aman", lead_count: 0, open_lead_count: 0, today_follow_up_count: 0, overdue_follow_up_count: 0 },
      { employee_id: "u1", employee_name: "Ravi", lead_count: 10, open_lead_count: 5, today_follow_up_count: 2, overdue_follow_up_count: 1 },
      { employee_id: "u3", employee_name: "Ravi", lead_count: 1, open_lead_count: 1, today_follow_up_count: 0, overdue_follow_up_count: 1 },
    ]);
    const nextDay = await repository.listEmployeeLeadCounts("fixture", executor, new Date("2026-09-15T18:30:00.000Z"));
    assert.deepEqual(nextDay.find(row => row.employee_id === "u1"), {
      employee_id: "u1", employee_name: "Ravi", lead_count: 10, open_lead_count: 5, today_follow_up_count: 1, overdue_follow_up_count: 3,
    });
  } finally { await pool.close(); }
});
