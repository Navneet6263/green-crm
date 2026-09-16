const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyStatement, formatResult } = require("../db/queryResult");
const { buildDuePredicate } = require("../utils/workQueue");

// Never connect to a configured/live database from these regression tests.
const connectionPath = require.resolve("../db/connection");
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true,
  exports: { query: async () => { throw new Error("Unexpected database access in unit test"); } } };
const customers = require("../repositories/customerRepository");
const leads = require("../repositories/leadRepository");
const notifications = require("../repositories/notificationRepository");
const performance = require("../repositories/performanceRepository");
const notes = require("../repositories/customerNoteRepository");
const tasks = require("../repositories/taskRepository");

function capture(responses = []) {
  const calls = [];
  return { calls, query: async (sql, params = []) => {
    assert.equal((sql.match(/\?/g) || []).length, params.length, "SQL bind count must match");
    calls.push({ sql, params });
    return [responses.shift() || []];
  } };
}

test("SQL Server CTE reports return result rows, not affected-row metadata", () => {
  const rows = [{ total: 12001 }];
  assert.deepEqual(formatResult({ recordset: rows }, classifyStatement("WITH scoped AS (SELECT 1 AS n) SELECT * FROM scoped"))[0], rows);
});
test("SQL Server OUTPUT INSERTED preserves generated IDs", () => {
  const meta = classifyStatement("INSERT INTO customer_notes (content) OUTPUT INSERTED.id VALUES (?)");
  assert.equal(meta.hasOutput, true);
  assert.deepEqual(formatResult({ recordset: [{ id: 42 }] }, meta)[0], [{ id: 42 }]);
});
test("ordinary insert/update contracts remain compatible", () => {
  assert.deepEqual(formatResult({ rowsAffected: [1], recordsets: [[{ insertId: 9 }]] }, classifyStatement("INSERT INTO x VALUES (?)"))[0], { affectedRows: 1, insertId: 9 });
  assert.deepEqual(formatResult({ rowsAffected: [2] }, classifyStatement("UPDATE x SET y = 1"))[0], { affectedRows: 2 });
});
test("work queues use non-overlapping India day boundaries", () => {
  const now = new Date("2026-09-08T01:00:00Z");
  const today = buildDuePredicate("due_date", "today", now);
  assert.equal(today.params[0].toISOString(), "2026-09-07T18:30:00.000Z");
  assert.equal(today.params[1].toISOString(), "2026-09-08T18:30:00.000Z");
  assert.deepEqual(buildDuePredicate("due_date", "overdue", now).params, [today.params[0]]);
  assert.deepEqual(buildDuePredicate("due_date", "upcoming", now).params, [today.params[1]]);
  assert.deepEqual(buildDuePredicate("due_date", "unscheduled", now), { clause: "due_date IS NULL", params: [] });
});

test("calendar queries apply an exclusive date end and stable pagination", async () => {
  const db = capture([[{ total: 32 }], []]);
  const dueFrom = new Date("2026-09-07T18:30:00Z");
  const dueTo = new Date("2026-09-08T18:30:00Z");
  await tasks.listTasks({ companyId: "co1", assignedTo: "u1", teamIds: ["t1"], dueFrom, dueTo }, { offset: 25, limit: 25 }, db);
  assert.match(db.calls[1].sql, /t\.due_date >= \?/);
  assert.match(db.calls[1].sql, /t\.due_date < \?/);
  assert.ok(db.calls[1].params.includes(dueTo));
  assert.match(db.calls[1].sql, /t\.task_id DESC/);
});

test("request metrics isolate concurrent requests and record failed SQL attempts", async () => {
  const { storage, measureDatabase } = require("../utils/requestMetrics");
  const a = { dbQueries: 0, dbMs: 0 }, b = { dbQueries: 0, dbMs: 0 };
  await Promise.all([
    storage.run(a, async () => { await measureDatabase(async () => 1); await assert.rejects(measureDatabase(async () => { throw new Error("query failed"); }), /query failed/); }),
    storage.run(b, async () => { await measureDatabase(async () => 1); }),
  ]);
  assert.equal(a.dbQueries, 2); assert.equal(b.dbQueries, 1);
  assert.ok(a.dbMs >= 0); assert.ok(b.dbMs >= 0);
});
test("customer search and counts share tenant, team and membership scope", async () => {
  const db = capture([[{ total: 125, active: 120, value: 5000 }], [{ customer_id: "c101" }], [{ user_id: "u1", name: "Employee" }]]);
  const query = "Robert'); DROP TABLE customers;--";
  const result = await customers.listCustomers({ companyId: "co1", teamIds: ["team1"], assignedTo: "u1", search: query, followUp: "overdue", sort: "value", includeSummary: true }, { offset: 100, limit: 25 }, db);
  assert.equal(result.total, 125);
  assert.equal(result.summary.active, 120);
  for (const { sql, params } of db.calls) {
    assert.match(sql, /c\.company_id = \?/);
    assert.match(sql, /EXISTS \(SELECT 1 FROM customer_members/);
    assert.match(sql, /cm\.company_id = c\.company_id/);
    assert.ok(params.includes("team1"));
    assert.ok(!sql.includes(query));
  }
  assert.match(db.calls[1].sql, /ORDER BY c\.total_value DESC, c\.customer_id DESC/);
  assert.ok(db.calls[1].params.includes(`%${query}%`));
  assert.deepEqual(db.calls[1].params.slice(-2), [100, 25]);
});
test("empty team scopes cannot broaden customer or analytics access", async () => {
  const customerDb = capture([[{ total: 0 }], []]);
  await customers.listCustomers({ companyId: "co1", teamIds: [] }, { offset: 0, limit: 25 }, customerDb);
  assert.ok(customerDb.calls.every(call => call.sql.includes("1 = 0")));
  const leadDb = capture();
  await leads.getAnalytics({ companyId: "co1", teamIds: [] }, leadDb);
  assert.match(leadDb.calls[0].sql, /1 = 0/);
});

test("customer sort/follow-up allowlists reject inherited object properties", async () => {
  const db = capture([[{ total: 0 }], []]);
  await customers.listCustomers({ companyId: "co1", sort: "toString", followUp: "__proto__" }, { offset: 0, limit: 25 }, db);
  assert.match(db.calls[1].sql, /ORDER BY COALESCE\(c.updated_at, c.created_at\) DESC/);
  assert.doesNotMatch(db.calls[1].sql, /native code|object Object/);
});
test("analytics aggregates preserve shared-user access and do not page raw records", async () => {
  const db = capture([[{ dimension: "total", leads: 50001 }]]);
  const rows = await leads.getAnalytics({ companyId: "co1", viewerUserId: "u1", viewerAccessColumns: ["assigned_to"], teamIds: ["t1"] }, db);
  assert.equal(rows[0].leads, 50001);
  assert.match(db.calls[0].sql, /GROUP BY GROUPING SETS/);
  assert.match(db.calls[0].sql, /lead_assignments/);
  assert.ok(db.calls[0].params.includes("u1"));
  assert.doesNotMatch(db.calls[0].sql, /l\.\*|OFFSET/);
});
test("workflow financial summaries preserve the same per-user scope", async () => {
  const db = capture([[{ total_workflow_leads: 2 }]]);
  await leads.getWorkflowSummary({ companyId: "co1", teamIds: ["t1"], viewerUserId: "u1", viewerAccessColumns: ["assigned_to"], status: "closed-won" }, db);
  assert.match(db.calls[0].sql, /lead_assignments/);
  assert.ok(db.calls[0].params.includes("u1"));
  assert.ok(db.calls[0].params.includes("closed-won"));
});
test("notification unread count covers more than the returned page", async () => {
  const db = capture([[{ notif_id: "n1", is_read: false }], [{ total: 45, unread_count: 31 }]]);
  const result = await notifications.listNotifications({ companyId: "co1", userId: "u1", pagination: { page: 1, offset: 0, limit: 8 } }, db);
  assert.equal(result.unreadCount, 31);
  assert.equal(result.total, 45);
});
test("bulk read is constrained to the caller and permitted companies", async () => {
  const db = capture();
  await notifications.markAllPersonalRead({ companyIds: ["co1", "co2"], userId: "u1" }, db);
  assert.match(db.calls[0].sql, /WHERE user_id = \? AND is_read = 0 AND company_id IN/);
  assert.deepEqual(db.calls[0].params, ["u1", "co1", "co2"]);
  const empty = capture();
  await notifications.markAllPersonalRead({ companyIds: [], userId: "u1" }, empty);
  assert.match(empty.calls[0].sql, /1 = 0/);
});
test("customer note insert and read use the supplied transaction executor", async () => {
  const db = capture([[{ id: 7 }], [{ id: 7, content: "Called" }]]);
  const note = await notes.create({ companyId: "co1", customerId: "c1", content: "Called", createdBy: "u1" }, db);
  assert.equal(note.id, 7);
  assert.equal(db.calls.length, 2);
});
test("performance SQL scopes roster AND records; counts are not capped at 1000", async () => {
  for (const teams of [null, [], ["t1", "t2"]]) {
    const db = capture([[{ user_id: "u1", ownedLeadCount: 1500 }], [], [], []]);
    const result = await performance.getPerformance("co1", teams, true, db);
    assert.equal(result.teamBoard[0].ownedLeadCount, 1500);
    assert.equal(db.calls.length, 4);
    for (const call of db.calls) {
      assert.match(call.sql, /l\.company_id = \?/);
      assert.match(call.sql, /t\.company_id = \?/);
      assert.doesNotMatch(call.sql, /TOP 1000/);
      if (teams?.length) assert.match(call.sql, /l\.team_id IN/);
      if (teams && !teams.length) assert.match(call.sql, /AND 1 = 0/);
    }
  }
});
