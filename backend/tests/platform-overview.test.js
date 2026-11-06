const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
const calls = [];
const now = Date.now();
db.query = async (sql, params = []) => {
  calls.push({ sql, params });
  if (/AS companies_active/.test(sql)) return [[{ companies: 3, companies_active: 2, leads: 40, leads_new: 12, won_value: '150000.50' }]];
  if (/FROM companies c WHERE .*service_access|c\.service_access/s.test(sql)) {
    return [[
      { company_id: 'C1', name: 'Orbit', status: 'active', created_at: new Date(now - 90 * 864e5), service_access: '{"developer_api":true,"attendance":false}', users_active: 8, last_login_at: new Date(now - 3600e3), leads_period: 9, leads_total: 30 },
      { company_id: 'C2', name: 'Kapoor', status: 'trial', created_at: new Date(now - 60 * 864e5), service_access: null, users_active: 2, last_login_at: new Date(now - 30 * 864e5), leads_period: 0, leads_total: 4 },
    ]];
  }
  if (/GROUP BY CONVERT\(date/.test(sql) && /FROM leads l/.test(sql) && !/closed-won/.test(sql)) {
    return [[{ day: new Date(new Date(now + 330 * 60000).toISOString().slice(0, 10)), n: 5 }]];
  }
  return [[]];
};
const { getOverview, healthOf } = require('../services/superAdmin/platformOverview');

test('health: active, quiet, new, at risk and suspended', () => {
  const base = { status: 'active', created_at: new Date(now - 100 * 864e5), leads_period: 3 };
  assert.equal(healthOf({ ...base, last_login_at: new Date(now - 3600e3) }), 'active');
  assert.equal(healthOf({ ...base, last_login_at: new Date(now - 7 * 864e5) }), 'quiet');
  assert.equal(healthOf({ ...base, last_login_at: null }), 'at_risk');
  assert.equal(healthOf({ ...base, created_at: new Date(now - 2 * 864e5), last_login_at: null }), 'new');
  assert.equal(healthOf({ ...base, status: 'suspended', last_login_at: new Date() }), 'suspended');
});

test('super admin sees every tenant except the platform company, with trend, health and module use', async () => {
  calls.length = 0;
  const data = await getOverview({ role: 'super-admin', userId: 'U1' }, { days: '7' });
  assert.equal(data.days, 7);
  assert.equal(data.totals.won_value, 150000.5);
  assert.equal(data.series.length, 7);
  assert.equal(data.series[6].leads, 5, 'today is the last point');
  assert.deepEqual(data.companies.map((c) => c.health), ['active', 'at_risk']);
  assert.equal(data.totals.developer_companies, 1);
  assert.equal(data.adoption.find((a) => a.key === 'attendance').on, 1, 'off only where switched off');
  assert.equal(data.adoption.find((a) => a.key === 'developer_api').on, 1, 'developer api counts only where switched on');
  assert.ok(!('access' in data.companies[0]), 'raw settings are not sent');
  assert.ok(calls.some((c) => c.params.includes('platform-root')));
});

test('a platform admin with no companies sees nothing, and other roles are refused', async () => {
  calls.length = 0;
  await getOverview({ role: 'platform-admin', managedCompanyIds: [] }, {});
  assert.ok(calls.filter((c) => /FROM (companies|leads|users)/.test(c.sql)).every((c) => /1 = 0/.test(c.sql)));
  await assert.rejects(getOverview({ role: 'admin' }, {}), /platform team/);
});
