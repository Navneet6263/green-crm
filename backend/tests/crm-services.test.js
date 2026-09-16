const { test, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");

const connectionPath = require.resolve("../db/connection");
const database = { query: async () => { throw new Error("Live DB access is forbidden in tests"); }, withTransaction: async handler => handler({ query: async () => { throw new Error("Unmocked transactional query"); } }) };
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: database };
const scopePath = require.resolve("../services/accessScopeService");
require.cache[scopePath] = { id: scopePath, filename: scopePath, loaded: true, exports: {
  assertRecordTeamAccess: async () => {}, parseRequestedTeamIds: () => [],
  resolveTeamScope: async () => ({ teamIds: ["t1"] }),
} };
// These tests have their own process/module graph; all I/O stays mocked.
const customers = require("../repositories/customerRepository");
const customerNotes = require("../repositories/customerNoteRepository");
const activities = require("../repositories/customerActivityRepository");
const leads = require("../repositories/leadRepository");
const notifications = require("../repositories/notificationRepository");
const dashboards = require("../repositories/dashboardRepository");
const customerService = require("../services/customerService");
const leadService = require("../services/leadService");
const notificationService = require("../services/notificationService");
const dashboardService = require("../services/dashboardService");
afterEach(() => mock.restoreAll());

const auth = { companyId: "co1", userId: "u1", role: "admin", name: "Employee", email: "employee@example.test" };
const customer = { company_id: "co1", customer_id: "c1", assigned_to: "u1", team_id: "t1", notes: "Keep legacy profile" };

test("customer notes commit feed, activity and last-interaction together without rewriting legacy text", async () => {
  const tx = {};
  const writes = [];
  mock.method(customers, "getCustomerById", async () => customer);
  mock.method(database, "withTransaction", async callback => { const result = await callback(tx); writes.push("commit"); return result; });
  mock.method(customerNotes, "create", async (payload, executor) => { assert.equal(executor, tx); assert.equal(payload.createdBy, "u1"); writes.push("note"); });
  mock.method(activities, "createActivity", async (payload, executor) => { assert.equal(executor, tx); assert.equal(payload.description, "Called"); writes.push("activity"); });
  mock.method(customers, "updateCustomer", async (_id, _company, updates, executor) => { assert.equal(executor, tx); assert.equal(Object.hasOwn(updates, "notes"), false); writes.push("interaction"); return customer; });
  await customerService.addCustomerNote(auth, "c1", { content: " Called " });
  assert.deepEqual(writes, ["note", "activity", "interaction", "commit"]);
});
test("failed activity creation rejects the note transaction without committing", async () => {
  let committed = false;
  mock.method(customers, "getCustomerById", async () => customer);
  mock.method(database, "withTransaction", async callback => { const result = await callback({}); committed = true; return result; });
  mock.method(customerNotes, "create", async () => ({}));
  mock.method(activities, "createActivity", async () => { throw new Error("activity write failed"); });
  await assert.rejects(customerService.addCustomerNote(auth, "c1", { content: "Called" }), /activity write failed/);
  assert.equal(committed, false);
});
test("viewer and blank note writes are rejected", async () => {
  await assert.rejects(customerService.addCustomerNote({ ...auth, role: "viewer" }, "c1", { content: "Note" }), /View-only/);
  mock.method(customers, "getCustomerById", async () => customer);
  await assert.rejects(customerService.addCustomerNote(auth, "c1", { content: "   " }), /required/);
});
test("marketing analytics preserves assigned/shared visibility for results and options", async () => {
  const seen = [];
  mock.method(leads, "getAnalytics", async filters => { seen.push(filters); return []; });
  await leadService.getAnalytics({ ...auth, role: "marketing" }, { range: "month", assigned_to: "u2" });
  assert.equal(seen.length, 2);
  for (const filters of seen) {
    assert.equal(filters.companyId, "co1");
    assert.equal(filters.viewerUserId, "u1");
    assert.deepEqual(filters.teamIds, ["t1"]);
  }
  assert.equal(seen[0].assignedTo, "u2");
  assert.equal(seen[1].assignedTo, null);
  await assert.rejects(leadService.getAnalytics({ ...auth, role: "expert" }), /not available/);
  await assert.rejects(leadService.getAnalytics(auth, { range: "__proto__" }), /Invalid analytics range/);
});
test("admins cannot mark another employee's personal notification read", async () => {
  mock.method(notifications, "getNotificationById", async () => ({ company_id: "co1", user_id: "u2" }));
  await assert.rejects(notificationService.markRead(auth, "n1"), /only mark your own/);
});
test("personal inbox scope is forced even for managers", async () => {
  let seen;
  mock.method(notifications, "listNotifications", async filters => { seen = filters; return { rows: [], total: 0, unreadCount: 0 }; });
  await notificationService.listNotifications({ ...auth, role: "manager" }, { mine: "1", user_id: "u2" });
  assert.equal(seen.userId, "u1");
  assert.equal(seen.companyId, "co1");
});
test("concurrent cold dashboard requests share one scoped summary calculation", async () => {
  let calls = 0;
  mock.method(dashboards, "getCompanySummary", async () => { calls++; await Promise.resolve(); return { pending_tasks: 3 }; });
  const [a,b] = await Promise.all([dashboardService.getSummary({ ...auth, companyId: "cache-test" }), dashboardService.getSummary({ ...auth, companyId: "cache-test" })]);
  assert.equal(calls, 1);
  assert.equal(a.pending_tasks, 3); assert.equal(b.pending_tasks, 3);
});
