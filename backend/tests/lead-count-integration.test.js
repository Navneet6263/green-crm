const { test, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const connectionPath = require.resolve("../db/connection");
const database = { query: async () => { throw new Error("Live database access forbidden in tests"); } };
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: database };

const createApp = require("../app");
const repository = require("../repositories/leadCountIntegrationRepository");
const authenticateIntegration = require("../middlewares/authenticateLeadCountIntegration");
const { verifyToken } = require("../utils/auth");
const envKeys = ["CRM_LEAD_COUNTS_COMPANY_ID", "CRM_LEAD_COUNTS_KEY_SHA256", "CRM_LEAD_COUNTS_KEY_EXPIRES_AT"];
const savedEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const token = `crm_lc_${"a".repeat(64)}`;
function configure(companyId = "company-a") {
  process.env.CRM_LEAD_COUNTS_COMPANY_ID = companyId;
  process.env.CRM_LEAD_COUNTS_KEY_SHA256 = createHash("sha256").update(token).digest("hex");
  process.env.CRM_LEAD_COUNTS_KEY_EXPIRES_AT = new Date(Date.now() + 3600000).toISOString();
}
function authenticate(headers = {}) {
  const req = { headers };
  let error;
  authenticateIntegration(req, {}, value => { error = value; });
  return { req, error };
}
afterEach(() => {
  mock.restoreAll();
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

async function withServer(fn) {
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    await fn(base);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
const endpoint = "/integrations/v1/employee-lead-counts";
const headers = { Authorization: `Bearer ${token}` };

test("integration fails closed for missing or invalid configuration", () => {
  configure();
  delete process.env.CRM_LEAD_COUNTS_COMPANY_ID;
  assert.equal(authenticate(headers).error.statusCode, 503);
  configure();
  process.env.CRM_LEAD_COUNTS_KEY_SHA256 = "invalid";
  assert.equal(authenticate(headers).error.statusCode, 503);
  configure();
  process.env.CRM_LEAD_COUNTS_KEY_EXPIRES_AT = "invalid";
  assert.equal(authenticate(headers).error.statusCode, 503);
});

test("missing, malformed, wrong and expired credentials are rejected", () => {
  configure();
  for (const authorization of [undefined, "Bearer admin-jwt", `Bearer crm_lc_${"b".repeat(64)}`]) {
    assert.equal(authenticate({ authorization }).error.statusCode, 401);
  }
  process.env.CRM_LEAD_COUNTS_KEY_EXPIRES_AT = "2000-01-01T00:00:00.000Z";
  assert.equal(authenticate({ authorization: headers.Authorization }).error.statusCode, 401);
});

test("valid key is company scoped and cannot be used as a CRM login token; rotation revokes it", () => {
  configure();
  const result = authenticate({ authorization: headers.Authorization });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.req.leadCountIntegration, { companyId: "company-a" });
  assert.equal(result.req.auth, undefined);
  assert.equal(verifyToken(token), null);
  process.env.CRM_LEAD_COUNTS_KEY_SHA256 = "0".repeat(64);
  assert.equal(authenticate({ authorization: headers.Authorization }).error.statusCode, 401);
});

test("SQL aggregation is tenant scoped, includes zeros, excludes deleted leads and projects only allowed fields", async () => {
  const queries = [];
  const executor = { query: async (sql, params) => {
    queries.push({ sql, params });
    return queries.length === 1 ? [[{ company_id: "company-a" }]] : [[
      { employee_name: "Ravi", lead_count: "12", email: "private", estimated_value: 500 },
      { employee_name: "Aman", lead_count: 0 },
      { employee_name: "Ravi", lead_count: 3 },
    ]];
  } };
  assert.deepEqual(await repository.listEmployeeLeadCounts("company-a", executor), [
    { employee_name: "Ravi", lead_count: 12 },
    { employee_name: "Aman", lead_count: 0 },
    { employee_name: "Ravi", lead_count: 3 },
  ]);
  assert.deepEqual(queries.map(q => q.params), [["company-a"], ["company-a"]]);
  const sql = queries[1].sql;
  assert.match(sql, /LEFT JOIN leads/);
  assert.match(sql, /l.company_id = u.company_id/);
  assert.match(sql, /l.is_active = 1/);
  assert.match(sql, /u.company_id = \? AND u.is_active = 1/);
  assert.match(sql, /GROUP BY u.user_id, u.name/);
  assert.doesNotMatch(sql, /estimated_value|email|phone|SELECT \*/i);
});

test("missing/suspended company does not run the lead-count query", async () => {
  let calls = 0;
  await assert.rejects(repository.listEmployeeLeadCounts("company-a", { query: async () => { calls++; return [[]]; } }),
    error => error.statusCode === 403);
  assert.equal(calls, 1);
});

test("HTTP endpoint returns only names/counts and freshness metadata with no-store", async () => {
  configure("http-success");
  mock.method(repository, "listEmployeeLeadCounts", async companyId => {
    assert.equal(companyId, "http-success");
    return [{ employee_name: "Ravi", lead_count: 12 }, { employee_name: "Aman", lead_count: 0 }];
  });
  await withServer(async base => {
    const response = await fetch(base + endpoint, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, [{ employee_name: "Ravi", lead_count: 12 }, { employee_name: "Aman", lead_count: 0 }]);
    assert.ok(Number.isFinite(Date.parse(body.meta.fetched_at)));
  });
});

test("HTTP rejects unauthenticated requests, scope/field overrides and every write method without data access", async () => {
  configure("http-rejections");
  let calls = 0;
  mock.method(repository, "listEmployeeLeadCounts", async () => { calls++; return []; });
  await withServer(async base => {
    assert.equal((await fetch(base + endpoint)).status, 401);
    for (const query of ["?company_id=other", "?fields=revenue", "?employee_id=other"]) {
      assert.equal((await fetch(base + endpoint + query, { headers })).status, 400);
    }
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
      const response = await fetch(base + endpoint, { method, headers });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), "GET");
    }
    // Actual existing CRM auth rejects this integration credential.
    assert.equal((await fetch(base + "/leads", { headers })).status, 401);
    assert.equal((await fetch(base + "/leads/test-lead", { method: "DELETE", headers })).status, 401);
  });
  assert.equal(calls, 0);
});

test("empty roster is a successful empty snapshot", async () => {
  configure("http-empty");
  mock.method(repository, "listEmployeeLeadCounts", async () => []);
  await withServer(async base => {
    const response = await fetch(base + endpoint, { headers });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, []);
  });
});

test("backend failures are errors, never a successful zero/empty snapshot", async () => {
  configure("http-failure");
  mock.method(repository, "listEmployeeLeadCounts", async () => { throw new Error("DB unavailable"); });
  mock.method(console, "error", () => {});
  await withServer(async base => {
    const response = await fetch(base + endpoint, { headers });
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(Object.hasOwn(body, "data"), false);
  });
});

test("integration limits authenticated requests per company", async () => {
  configure("http-rate-limit");
  mock.method(repository, "listEmployeeLeadCounts", async () => []);
  await withServer(async base => {
    for (let i = 0; i < 30; i++) {
      assert.equal((await fetch(base + endpoint, { headers })).status, 200);
    }
    assert.equal((await fetch(base + endpoint, { headers })).status, 429);
  });
});
