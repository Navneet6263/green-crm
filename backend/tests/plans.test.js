const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
let access = {};
db.query = async (sql) => (/FROM companies WHERE company_id/.test(sql) ? [[{ service_access: JSON.stringify(access) }]] : [[]]);

const { forgetModuleAccess, requireModule } = require('../middlewares/requireModule');
const { PLANS, planFor } = require('../constants/plans');
const { publicCompany } = require('../utils/publicCompany');

const run = (mw, auth) => new Promise((resolve) => mw({ auth }, {}, (error) => resolve(error || null)));

test('tracking plan: tracking and attendance on, CRM off, 1 admin / 1 manager / 1 sales', () => {
  const plan = planFor('tracking');
  assert.equal(plan.access.field_tracking, true);
  assert.equal(plan.access.attendance, true);
  assert.equal(plan.access.leads, false);
  assert.equal(plan.access.customers, false);
  assert.deepEqual([plan.limits.admin, plan.limits.manager, plan.limits.sales, plan.limits.marketing], [1, 1, 1, 0]);
  assert.equal(planFor('nope'), null);
  assert.equal(PLANS.full.access, null, 'full CRM leaves every module on');
});

test('a switched-off module blocks its API; platform roles and other modules pass', async () => {
  access = PLANS.tracking.access;
  forgetModuleAccess();
  const blocked = await run(requireModule('leads'), { companyId: 'C1', role: 'admin' });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.code, 'MODULE_OFF');
  assert.equal(await run(requireModule('field_tracking'), { companyId: 'C1', role: 'sales' }), null);
  assert.equal((await run(requireModule('tasks', 'calendar'), { companyId: 'C1', role: 'admin' })).code, 'MODULE_OFF', 'off only when every key is off');
  access = { ...PLANS.tracking.access, calendar: true };
  forgetModuleAccess('C1');
  assert.equal(await run(requireModule('tasks', 'calendar'), { companyId: 'C1', role: 'admin' }), null, 'any key on is enough');
  assert.equal(await run(requireModule('leads'), { companyId: 'C1', role: 'super-admin' }), null);

  access = {};
  forgetModuleAccess('C1');
  assert.equal(await run(requireModule('leads'), { companyId: 'C1', role: 'admin' }), null, 'existing companies keep everything');
});

test('company data sent to the browser never carries the mail password', () => {
  const out = publicCompany({ company_id: 'C1', smtp_host: 'smtp.x.in', smtp_password: 'secret' });
  assert.equal(out.smtp_password, undefined);
  assert.equal(out.smtp_password_set, true);
  assert.equal(publicCompany(null), null);
});
