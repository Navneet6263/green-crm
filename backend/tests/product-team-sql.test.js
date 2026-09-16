// Opt-in verification against SQL Server using inline, fictional VALUES only.
// No CRM records are read or written. Does not execute the migration.
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("SQL Server product sharing lists mapped + owned products without tenant leakage or duplicate counts", {
  skip: process.env.CRM_INTEGRATION_SQL_TESTS !== "1",
}, async () => {
  require("dotenv").config();
  const sql = require("mssql");
  const { config } = require("../db/connection");
  const repository = require("../repositories/productRepository");
  const pool = new sql.ConnectionPool({ ...config, connectionTimeout: 8000, requestTimeout: 8000,
    pool: { max: 1, min: 0, idleTimeoutMillis: 1000 } });
  const products = `(VALUES
    ('p1','c1','T1','Shared HR',CAST('2026-09-16' AS DATETIME2),1),
    ('p2','c1','T3','Own CRM',CAST('2026-09-15' AS DATETIME2),1),
    ('p3','c1','T2','Private Product',CAST('2026-09-14' AS DATETIME2),1),
    ('p4','c2','T4','Another Company',CAST('2026-09-13' AS DATETIME2),1)
  ) AS p(product_id,company_id,team_id,name,created_at,is_active)`;
  const teams = `(VALUES ('T1','c1','Team 1','T1',1),('T2','c1','Team 2','T2',1),
    ('T3','c1','Team 3','T3',1),('T4','c2','Other Team','T4',1)) AS t(team_id,company_id,name,code,is_active)`;
  let shared = true;
  const executor = { query: async (text, params) => {
    const mappings = shared
      ? `(VALUES ('c1','p1','T3'),('c1','p1','T1'),('c2','p4','T3')) AS m(company_id,product_id,team_id)`
      : `(VALUES ('c1','p1','T1'),('c2','p4','T3')) AS m(company_id,product_id,team_id)`;
    const fixtureSql = text.replace(/FROM products p/g, `FROM ${products}`)
      .replace(/JOIN teams t/g, `JOIN ${teams}`)
      .replace(/FROM product_team_mappings m/g, `FROM ${mappings}`);
    assert.doesNotMatch(fixtureSql, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|MERGE)\b/i);
    const req = pool.request();
    params.forEach((v, i) => req.input(`p${i}`, typeof v === "number" ? sql.Int : sql.NVarChar(100), v));
    let i = 0;
    const result = await req.query(fixtureSql.replace(/\?/g, () => `@p${i++}`));
    return [result.recordset];
  } };
  try {
    await pool.connect();
    const filters = { companyId: "c1", teamIds: ["T3"], pagination: { offset: 0, limit: 20 } };
    const result = await repository.listProducts(filters, executor);
    assert.equal(result.total, 2);
    assert.deepEqual(result.rows.map(row => row.product_id), ["p1", "p2"]);
    assert.ok(result.rows[0].mapped_team_ids.includes("T3"));
    shared = false;
    const revoked = await repository.listProducts(filters, executor);
    assert.equal(revoked.total, 1);
    assert.deepEqual(revoked.rows.map(row => row.product_id), ["p2"]);
    assert.equal((await repository.listProducts({ ...filters, teamIds: [] }, executor)).total, 0);
  } finally { await pool.close(); }
});
