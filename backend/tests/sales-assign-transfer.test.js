// Sales can hand leads to teammates; leads go to other teams only through Transfer.
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
const leadAssignments = require("../repositories/leadAssignmentRepository");
const leadService = require("../services/leadService");
const transfer = require("../services/leads/crossTeamTransfer");

const sales = () => ({ role: "sales", companyId: "c1", userId: "s1", email: "sales@example.test" });
const marketing = () => ({ ...sales(), role: "marketing", userId: "mk1" });
const product = { product_id: "p1", company_id: "c1", name: "Green HR", team_id: "T1", is_active: 1, mapped_team_ids: ["T2"] };
const TEAM_PEOPLE = { T1: ["s1", "s2"], T2: ["x1"], T3: ["y1"] };

function salesScope() {
  mock.method(teams, "countActiveTeams", async () => 3);
  mock.method(teams, "listAccessibleTeamIds", async () => ["T1"]);
  mock.method(teams, "listValidTeamIds", async (_c, ids) => ids.filter(id => ["T1", "T2", "T3"].includes(id)));
  mock.method(teams, "listUsersForTeams", async (_c, ids) => ids.flatMap(id => TEAM_PEOPLE[id] || []));
  mock.method(teams, "getPreferredTeamId", async () => "T1");
  mock.method(companies, "getCompanyById", async () => ({ company_id: "c1" }));
  mock.method(products, "getProductById", async () => product);
  mock.method(users, "getUserInCompany", async id => ({ user_id: id, company_id: "c1", is_active: 1, role: "sales" }));
}
afterEach(() => { mock.restoreAll(); queryHandler = forbiddenQuery; });

test("sales can create a lead for a teammate, but not for someone in another team", async () => {
  salesScope();
  mock.method(leads, "findLeadByPhoneInTeam", async () => { throw new Error("passed-owner-checks"); });
  const payload = { company_name: "Example", contact_person: "Example", phone: "9999999999", product_id: "p1", team_id: "T1" };
  await assert.rejects(leadService.createLead(sales(), { ...payload, assigned_to: "s2" }), /passed-owner-checks/);
  await assert.rejects(leadService.createLead(sales(), { ...payload, assigned_to: "x1" }), /Lead owner must belong/);
  await assert.rejects(leadService.createLead(marketing(), { ...payload, assigned_to: "s2" }), /assign leads to someone else/);
});

test("sales cannot reassign a lead that is only shared with them", async () => {
  salesScope();
  const lead = { lead_id: "L1", company_id: "c1", team_id: "T1", assigned_to: "s2", product_id: "p1", contact_person: "Asha", company_name: "Acme", phone: "9999999999", status: "new", workflow_stage: "sales", is_active: 1 };
  mock.method(leads, "getLeadById", async () => lead);
  mock.method(leadAssignments, "hasSharedUserAccess", async () => true);
  queryHandler = async () => [[]];
  await assert.rejects(leadService.assignLead(sales(), "L1", { assigned_to: "s1", change_note: "mine" }), /reassign only their own/);
});

test("transfer inside the lead's team keeps the team; outside picks the person's primary team", async () => {
  mock.method(teams, "listUsersForTeams", async (_c, ids) => ids.flatMap(id => TEAM_PEOPLE[id] || []));
  mock.method(products, "getProductById", async () => product);
  mock.method(leads, "findLeadByPhoneInTeam", async () => null);
  queryHandler = async (sql, params) => {
    assert.match(sql, /team_members/);
    return [[{ team_id: params[1] === "x1" ? "T2" : "T3" }]];
  };
  const lead = { lead_id: "L1", company_id: "c1", team_id: "T1", product_id: "p1", phone: "9999999999" };
  assert.equal(await transfer.resolveTransferTeam(lead, "s2"), null);
  assert.equal(await transfer.resolveTransferTeam(lead, "x1"), "T2");
  await assert.rejects(transfer.resolveTransferTeam(lead, "y1"), /product is not shared/);
});

test("transfer outside the team stops on a duplicate phone or a person with no team", async () => {
  mock.method(teams, "listUsersForTeams", async () => ["s1"]);
  mock.method(products, "getProductById", async () => product);
  mock.method(leads, "findLeadByPhoneInTeam", async () => ({ contact_person: "Asha" }));
  const lead = { lead_id: "L1", company_id: "c1", team_id: "T1", product_id: "p1", phone: "9999999999" };
  queryHandler = async () => [[{ team_id: "T2" }]];
  await assert.rejects(transfer.resolveTransferTeam(lead, "x1"), /already has this phone number under Asha/);
  queryHandler = async () => [[]];
  await assert.rejects(transfer.resolveTransferTeam(lead, "nobody"), /not in any team/);
});

test("transfer recipients list is company-wide, skips me and needs a search word", async () => {
  assert.deepEqual(await transfer.listTransferRecipients(sales(), "  "), []);
  queryHandler = async (sql, params) => {
    assert.match(sql, /u\.company_id = \?/);
    assert.deepEqual(params.slice(0, 2), ["c1", "s1"]);
    return [[{ user_id: "x1", name: "Xavier", team_names: "Staffing" }]];
  };
  const rows = await transfer.listTransferRecipients(sales(), "xav");
  assert.equal(rows[0].team_names, "Staffing");
});

test("sales reassigning their own lead to another team is stopped, so Transfer must be used", async () => {
  salesScope();
  const lead = { lead_id: "L1", company_id: "c1", team_id: "T1", assigned_to: "s1", product_id: "p1", contact_person: "Asha", company_name: "Acme", phone: "9999999999", status: "new", workflow_stage: "sales", is_active: 1 };
  mock.method(leads, "getLeadById", async () => lead);
  queryHandler = async () => [[]];
  await assert.rejects(leadService.assignLead(sales(), "L1", { assigned_to: "x1", change_note: "move" }), /Lead owner must belong/);
});
