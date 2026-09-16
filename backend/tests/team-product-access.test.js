const { test, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");

const forbiddenQuery = async () => { throw new Error("Unexpected database access in test"); };
let queryHandler = forbiddenQuery;
const database = { query: (...args) => queryHandler(...args), withTransaction: async fn => fn(database) };
const connectionPath = require.resolve("../db/connection");
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: database };
const teams = require("../repositories/teamRepository");
const users = require("../repositories/userRepository");
const products = require("../repositories/productRepository");
const companies = require("../repositories/companyRepository");
const leads = require("../repositories/leadRepository");
const tasks = require("../repositories/taskRepository");
const customers = require("../repositories/customerRepository");
const audit = require("../repositories/auditRepository");
const scope = require("../services/accessScopeService");
const productAccess = require("../services/productAccessService");
const productService = require("../services/productService");
const leadService = require("../services/leadService");
const taskService = require("../services/taskService");
const customerService = require("../services/customerService");
const userService = require("../services/userService");
const teamService = require("../services/teamService");
const recent = require("../repositories/recentActivityRepository");
const authenticate = require("../middlewares/authenticate");
const { buildTimedToken } = require("../utils/auth");
const manager = () => ({ role: "manager", companyId: "c1", userId: "m1", email: "manager@example.test" });
const admin = () => ({ ...manager(), role: "admin" });
const product = { product_id: "p1", company_id: "c1", name: "Green HR", team_id: "T1", is_active: 1, mapped_team_ids: ["T3"] };
function teamScope(ids = ["T3"], count = 3) {
  mock.method(teams, "countActiveTeams", async () => count);
  mock.method(teams, "listAccessibleTeamIds", async options => {
    assert.equal(options.includeManaged, true);
    assert.equal(options.includeMembership, true);
    return ids;
  });
  mock.method(teams, "listValidTeamIds", async (companyId, requested) => companyId === "c1" ? requested.filter(id => ["T1", "T2", "T3"].includes(id)) : []);
}
afterEach(() => { mock.restoreAll(); queryHandler = forbiddenQuery; });

test("manager without any configured team fails closed, even when fallback is requested", async () => {
  teamScope([], 0);
  const auth = manager();
  assert.deepEqual(await scope.resolveTeamScope(auth, "c1", [], { allowFallbackWithoutTeams: true }), { teamIds: [], unrestricted: false });
  await assert.rejects(scope.assertRecordTeamAccess(auth, { company_id: "c1", team_id: null }), /allowed teams/);
});

test("managers include membership even for legacy managed-only callers; admin remains company-wide", async () => {
  teamScope(["T3"]);
  assert.deepEqual((await scope.resolveTeamScope(manager(), "c1", [], { includeMembership: false })).teamIds, ["T3"]);
  assert.equal((await scope.resolveTeamScope(admin(), "c1")).teamIds, null);
});

test("member-only managers see their team and shared product, not the product owner's records", async () => {
  mock.method(teams, "countActiveTeams", async () => 3);
  queryHandler = async (sql, params) => {
    assert.match(sql, /FROM team_managers/);
    assert.match(sql, /UNION/);
    assert.match(sql, /FROM team_members/);
    assert.match(sql, /mem.is_active = 1/);
    assert.match(sql, /tm.is_active = 1/);
    assert.equal((sql.match(/t.is_active = 1/g) || []).length, 2);
    assert.deepEqual(params, ["c1", "m1", "c1", "m1"]);
    // Fixture: no team_managers row; only an active T3 membership.
    return [[{ team_id: "T3" }]];
  };
  mock.method(teams, "listTeams", async filters => {
    assert.deepEqual(filters.teamIds, ["T3"]);
    return { rows: [{ company_id: "c1", team_id: "T3", name: "Channel" }], total: 1 };
  });
  mock.method(products, "listProducts", async filters => {
    assert.deepEqual(filters.teamIds, ["T3"]);
    return { rows: [product], total: 1 };
  });
  const auth = manager();
  assert.equal((await teamService.listTeams(auth, {})).items[0].team_id, "T3");
  const catalog = await productService.listProducts(auth, {});
  assert.equal(catalog.items[0].product_id, "p1");
  assert.equal(catalog.items[0].can_manage, false);
  await scope.assertRecordTeamAccess(auth, { company_id: "c1", team_id: "T3" });
  await assert.rejects(scope.assertRecordTeamAccess(auth, { company_id: "c1", team_id: "T1" }), /allowed teams/);
});

test("multiple manager members share team scope and revocation applies on the next request", async () => {
  mock.method(teams, "countActiveTeams", async () => 2);
  const memberships = { m1: ["T3"], m2: ["T3"] };
  const managerMappings = { m3: ["T1"] };
  mock.method(teams, "listAccessibleTeamIds", async options => [...new Set([
    ...(options.includeMembership ? memberships[options.userId] || [] : []),
    ...(options.includeManaged ? managerMappings[options.userId] || [] : []),
  ])]);
  for (const userId of ["m1", "m2"]) {
    assert.deepEqual((await scope.resolveTeamScope({ ...manager(), userId }, "c1")).teamIds, ["T3"]);
  }
  assert.deepEqual((await scope.resolveTeamScope({ ...manager(), userId: "m3" }, "c1")).teamIds, ["T1"]);
  memberships.m1 = [];
  assert.deepEqual((await scope.resolveTeamScope(manager(), "c1")).teamIds, []);
  assert.deepEqual((await scope.resolveTeamScope({ ...manager(), userId: "m2" }, "c1")).teamIds, ["T3"]);
  managerMappings.m2 = ["T3"];
  memberships.m2 = [];
  assert.deepEqual((await scope.resolveTeamScope({ ...manager(), userId: "m2" }, "c1")).teamIds, ["T3"]);
  managerMappings.m2 = [];
  assert.deepEqual((await scope.resolveTeamScope({ ...manager(), userId: "m2" }, "c1")).teamIds, []);
});

test("ordinary sales members retain their role and existing assigned-record restrictions", async () => {
  mock.method(teams, "countActiveTeams", async () => 2);
  mock.method(teams, "listAccessibleTeamIds", async options => {
    assert.equal(options.includeMembership, true);
    return ["T3"];
  });
  const auth = { ...manager(), role: "sales" };
  assert.deepEqual((await scope.resolveTeamScope(auth, "c1")).teamIds, ["T3"]);
  await assert.rejects(productService.mapProductTeams(auth, "p1", { team_ids: ["T1"] }), /Only company admins/);
  mock.method(leads, "getLeadById", async () => ({ company_id: "c1", team_id: "T3", assigned_to: "other-sales", created_by: "other-sales" }));
  mock.method(require("../repositories/leadAssignmentRepository"), "hasSharedUserAccess", async () => false);
  await assert.rejects(leadService.getLead(auth, "l1", { coreOnly: true }), error => error.statusCode === 403);
});

test("manager cannot grant or revoke another manager's authority through member endpoints", async () => {
  teamScope();
  mock.method(teams, "getTeamById", async () => ({ company_id: "c1", team_id: "T3" }));
  mock.method(teams, "listTeamMembers", async () => []);
  mock.method(teams, "listTeamManagers", async () => []);
  mock.method(teams, "listUsersForTeams", async () => ["m2"]);
  mock.method(users, "getUserInCompany", async () => ({ company_id: "c1", user_id: "m2", role: "manager", is_active: 1 }));
  await assert.rejects(teamService.addTeamMember(manager(), "T3", { user_id: "m2" }), /change manager\/admin team memberships/);
  await assert.rejects(teamService.removeTeamMember(manager(), "T3", "m2"), /change manager\/admin team memberships/);
  const writes = [];
  mock.method(teams, "addTeamMember", async row => writes.push(row.user_id));
  await teamService.addTeamMember(admin(), "T3", { user_id: "m2" });
  assert.deepEqual(writes, ["m2"]);
});

test("forged team filters, mixed permitted/forbidden filters and another tenant are denied", async () => {
  teamScope();
  for (const ids of [["T1"], ["T3", "T1"]]) await assert.rejects(scope.resolveTeamScope(manager(), "c1", ids), error => error.statusCode === 403);
  await assert.rejects(scope.resolveTeamScope(manager(), "other"), error => error.statusCode === 403);
  await assert.rejects(scope.assertTeamAccess(admin(), "c1", "other-team"), /not active/);
});

test("shared product use never grants record access to the product's owning team", async () => {
  teamScope();
  mock.method(products, "getProductById", async () => product);
  assert.equal((await productAccess.assertProductForTeam("c1", "p1", "T3")).product_id, "p1");
  await assert.rejects(productAccess.assertProductForTeam("c1", "p1", "T2"), /not mapped/);
  await assert.rejects(productAccess.assertProductForTeam("other", "p1", "T3"), /not active/);
  await assert.rejects(scope.assertRecordTeamAccess(manager(), { company_id: "c1", team_id: "T1" }), /allowed teams/);
  await scope.assertRecordTeamAccess(manager(), { company_id: "c1", team_id: "T3" });
  assert.equal(productAccess.productAllowsTeam({ team_id: null }, "T3"), false);
});

test("manager cannot share, edit or archive another team's mapped product", async () => {
  teamScope();
  mock.method(products, "getProductById", async () => product);
  await assert.rejects(productService.mapProductTeams(manager(), "p1", { team_ids: ["T2"] }), /Only company admins/);
  await assert.rejects(productService.updateProduct(manager(), "p1", { color: "#123456" }), /allowed teams/);
  await assert.rejects(productService.deleteProduct(manager(), "p1"), /allowed teams/);
});

test("admin mapping is same-company, deduplicated and audited in the same transaction", async () => {
  teamScope();
  mock.method(products, "getProductById", async () => product);
  await assert.rejects(productService.mapProductTeams(admin(), "p1", { team_ids: ["foreign"] }), /active in this company/);
  await assert.rejects(productService.mapProductTeams(admin(), "p1", { team_ids: "T3" }), /array/);
  const tx = {};
  const writes = [];
  mock.method(database, "withTransaction", async fn => { await fn(tx); writes.push("commit"); });
  mock.method(products, "replaceTeamMappings", async (company, id, ids, actor, executor) => {
    assert.deepEqual([company, id, ids, actor], ["c1", "p1", ["T3"], "m1"]);
    assert.equal(executor, tx); writes.push("mapping");
  });
  queryHandler = async () => [[]]; // synthetic audit ID allocation only
  mock.method(audit, "createLog", async (entry, executor) => { assert.equal(executor, tx); assert.equal(entry.action, "product.teams_mapped"); writes.push("audit"); });
  await productService.mapProductTeams(admin(), "p1", { team_ids: ["T1", "T3", "T3"] });
  assert.deepEqual(writes, ["mapping", "audit", "commit"]);
});

test("empty mapping list revokes sharing without changing product owner or records", async () => {
  teamScope();
  mock.method(products, "getProductById", async () => product);
  queryHandler = async () => [[]];
  mock.method(audit, "createLog", async () => {});
  mock.method(products, "replaceTeamMappings", async (_company, _id, ids) => assert.deepEqual(ids, []));
  const result = await productService.mapProductTeams(admin(), "p1", { team_ids: [] });
  assert.equal(result.team_id, "T1");
});

test("product list passes team scope and marks shared products non-editable for managers", async () => {
  teamScope();
  mock.method(products, "listProducts", async filters => {
    assert.deepEqual(filters.teamIds, ["T3"]); return { rows: [product], total: 1 };
  });
  const result = await productService.listProducts(manager(), {});
  assert.equal(result.items[0].can_manage, false);
  assert.equal(result.items[0].can_map_teams, false);
});

test("product list/count SQL share tenant-correlated mappings; empty scope does no query", async () => {
  const seen = [];
  const executor = { query: async (sql, params) => { seen.push({ sql, params }); return sql.includes("COUNT(*)") ? [[{ total: 0 }]] : [[]]; } };
  const filters = { companyId: "c1", teamIds: ["T3"], pagination: { offset: 0, limit: 20 } };
  await products.listProducts(filters, executor);
  for (const call of seen) {
    assert.match(call.sql, /m.company_id = p.company_id AND m.product_id = p.product_id/);
    assert.deepEqual(call.params.slice(0, 3), ["c1", "T3", "T3"]);
  }
  seen.length = 0;
  assert.deepEqual(await products.listProducts({ ...filters, teamIds: [] }, executor), { rows: [], total: 0 });
  assert.equal(seen.length, 0);
});

test("user role/search helpers do not expand an empty team scope", async () => {
  const executor = { query: forbiddenQuery };
  assert.deepEqual(await users.listUsersByRole("c1", "sales", { teamIds: [] }, executor), []);
  assert.deepEqual(await users.listActiveUsersInCompany("c1", { teamIds: [] }, executor), []);
  teamScope();
  mock.method(users, "listUsersByRole", async (_company, _role, options) => { assert.deepEqual(options.teamIds, ["T3"]); return []; });
  mock.method(users, "listActiveUsersInCompany", async (_company, options) => { assert.deepEqual(options.teamIds, ["T3"]); return []; });
  await userService.listUsersByRole(manager(), "sales");
  await userService.searchActiveUsers(manager(), "employee");
});

test("manager cannot edit another team's employee or promote/create manager accounts", async () => {
  teamScope();
  mock.method(teams, "listUsersForTeams", async () => ["own-user"]);
  mock.method(users, "getUserById", async () => ({ user_id: "other-user", company_id: "c1", role: "sales" }));
  await assert.rejects(userService.updateUser(manager(), "other-user", { name: "New name" }), /your teams/);
  await assert.rejects(userService.toggleUser(manager(), "other-user", {}), /your teams/);
  await assert.rejects(userService.createUser(manager(), { role: "manager", name: "Other", email: "other@example.test" }), /employee accounts only/);
  await assert.rejects(teamService.addTeamManager(manager(), "T3", { user_id: "other" }), /change team managers/);
});

test("create lead keeps receiving team T3 instead of product owner T1; foreign assignee is rejected", async () => {
  teamScope();
  mock.method(companies, "getCompanyById", async () => ({ company_id: "c1" }));
  mock.method(products, "getProductById", async () => product);
  mock.method(users, "getUserInCompany", async id => ({ user_id: id, company_id: "c1", is_active: 1, role: "sales" }));
  mock.method(teams, "getPreferredTeamId", async () => "T3");
  mock.method(teams, "listUsersForTeams", async (_company, ids) => { assert.deepEqual(ids, ["T3"]); return ["own-user"]; });
  mock.method(leads, "findLeadByPhoneInTeam", async (_phone, teamId) => { assert.equal(teamId, "T3"); throw new Error("validated-before-create"); });
  const payload = { company_name: "Example", contact_person: "Example", phone: "9999999999", product_id: "p1", assigned_to: "own-user", team_id: "T3" };
  await assert.rejects(leadService.createLead(manager(), payload), /validated-before-create/);
  await assert.rejects(leadService.createLead(manager(), { ...payload, assigned_to: "foreign-user" }), /Lead owner must belong/);
  await assert.rejects(leadService.createLead(manager(), { ...payload, team_id: "T1" }), /requested team scope/);
});

test("inferred foreign teams are checked, not just explicit team_id", async () => {
  teamScope();
  mock.method(users, "getUserInCompany", async id => ({ user_id: id, company_id: "c1", is_active: 1 }));
  mock.method(teams, "getPreferredTeamId", async () => "T1");
  mock.method(teams, "listUsersForTeams", async () => ["foreign-user"]);
  await assert.rejects(taskService.createTask(manager(), { title: "Call", due_date: "2026-09-20", assigned_to: "foreign-user" }), /requested team scope/);
  await assert.rejects(customerService.createCustomer(manager(), { name: "Customer", company_name: "Example", email: "a@example.test", phone: "9999999999", assigned_to: "foreign-user" }), /requested team scope/);
});

test("direct lead/customer/task detail reads deny another team's records", async () => {
  teamScope();
  const row = { company_id: "c1", team_id: "T1", assigned_to: "foreign-user" };
  mock.method(leads, "getLeadById", async () => row);
  mock.method(customers, "getCustomerById", async () => row);
  mock.method(tasks, "getTaskById", async () => row);
  await assert.rejects(leadService.getLead(manager(), "l1", { coreOnly: true }), /allowed teams/);
  await assert.rejects(customerService.getCustomer(manager(), "c1"), /allowed teams/);
  await assert.rejects(taskService.getTask(manager(), "t1"), /allowed teams/);
});

test("recent updates and stats scope leads AND customers to the manager's teams", async () => {
  const seen = [];
  queryHandler = async (sql, params) => { seen.push({ sql, params }); return [[{ total: 0 }]]; };
  await recent.getRecentNotes("c1", { teamIds: ["T3"] });
  for (const entry of seen) {
    assert.match(entry.sql, /l.team_id IN \(\?\)/); assert.match(entry.sql, /c.team_id IN \(\?\)/);
    assert.deepEqual(entry.params, ["c1", "T3", "c1", "T3"]);
  }
  seen.length = 0;
  await recent.getActivityStats("c1", 7, []);
  assert.equal((seen[0].sql.match(/AND 1 = 0/g) || []).length, 4);
});

test("recent controller enforces selected team for feed, exports and stats; forged team is denied", async () => {
  teamScope(["T1", "T3"]);
  const controller = require("../controllers/recentActivityController");
  const response = { json: value => value };
  const fail = error => { throw error; };
  const notes = mock.method(recent, "getRecentNotes", async (companyId, options) => {
    assert.equal(companyId, "c1");
    assert.deepEqual(options.teamIds, ["T3"]);
    return { items: [], total: 0, page: 1, limit: options.limit, totalPages: 1 };
  });
  for (const limit of [20, 10000]) {
    await controller.getRecentNotes({ auth: manager(), query: { team_id: "T3", limit: String(limit) } }, response, fail);
  }
  assert.equal(notes.mock.callCount(), 2);
  await assert.rejects(controller.getRecentNotes({ auth: manager(), query: { team_id: "T2" } }, response, fail), error => error.statusCode === 403);
  assert.equal(notes.mock.callCount(), 2);
  mock.method(recent, "getActivityStats", async (_company, _days, teamIds) => {
    assert.deepEqual(teamIds, ["T3"]); return {};
  });
  await controller.getActivityStats({ auth: manager(), query: { team_id: "T3" } }, response, fail);
});

test("recent own-notes mode cannot be broadened by additional user filters", async () => {
  const queries = [];
  queryHandler = async (sql, params) => { queries.push({ sql, params }); return [[{ total: 0 }]]; };
  await recent.getMyRecentNotes("c1", "self", { teamIds: ["T3"], userIds: ["someone-else"] });
  for (const { sql, params } of queries) {
    assert.deepEqual(params, ["c1", "T3", "self", "c1", "T3", "self"]);
    assert.match(sql, /l.company_id = ln.company_id/);
    assert.match(sql, /c.company_id = cn.company_id/);
    assert.match(sql, /l.team_id/);
    assert.match(sql, /c.team_id/);
  }
});

test("non-manager recent feed ignores requested author and empty membership never broadens scope", async () => {
  mock.method(teams, "countActiveTeams", async () => 3);
  mock.method(teams, "listAccessibleTeamIds", async () => []);
  const controller = require("../controllers/recentActivityController");
  mock.method(recent, "getRecentNotes", async (_company, options) => {
    assert.deepEqual(options.teamIds, []);
    assert.equal(options.userId, "m1");
    assert.deepEqual(options.userIds, ["m1"]);
    return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  });
  await controller.getRecentNotes({ auth: { ...manager(), role: "sales" }, query: { users: "other" } }, { json: () => {} }, error => { throw error; });
});

test("cached authentication never reuses a previous request's team-scope cache", async () => {
  mock.method(users, "getUserById", async () => ({ user_id: "cache-manager", company_id: "c1", role: "manager", is_active: 1 }));
  const token = buildTimedToken({ sub: "cache-manager" }, 300);
  async function request() {
    const req = { headers: { authorization: `Bearer ${token}` } };
    await new Promise((resolve, reject) => authenticate(req, {}, error => error ? reject(error) : resolve()));
    return req.auth;
  }
  const a = await request(); a.__teamScopeCache.set("previous", ["T1"]);
  const b = await request();
  assert.notEqual(a, b); assert.notEqual(a.__teamScopeCache, b.__teamScopeCache);
  assert.equal(b.__teamScopeCache.size, 0);
});

test("fresh SQL bootstrap preserves foreign-key constraint syntax for product mappings", () => {
  const statements = require("../db/schema").getSchemaStatements();
  const mapping = statements.find(sql => sql.includes("CREATE TABLE [dbo].[product_team_mappings]"));
  assert.ok(mapping);
  assert.match(mapping, /CONSTRAINT fk_product_mapping_product FOREIGN KEY/);
  assert.match(mapping, /CONSTRAINT fk_product_mapping_team FOREIGN KEY/);
  assert.doesNotMatch(mapping, /\[CONSTRAINT\]/);
  assert.ok(statements.some(sql => sql.includes("CREATE UNIQUE INDEX [uq_products_company_product]")));
});
