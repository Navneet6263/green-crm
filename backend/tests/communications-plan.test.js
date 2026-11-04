const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
let access = null;
db.query = async () => [[{ service_access: access }]];
const requirePlan = require('../middlewares/requireCommunicationsPlan');
const run = (auth) => new Promise((resolve) => requirePlan({ auth }, {}, (err) => resolve(err || null)));

test('sending to customers is blocked when the plan switches Communications off', async () => {
  access = JSON.stringify({ communications: false });
  const err = await run({ companyId: 'C1', role: 'admin' });
  assert.equal(err.statusCode || err.status, 403);
  assert.match(err.message, /upgrade/);
  assert.equal(await run({ companyId: 'C1', role: 'super-admin' }), null);
  access = { communications: true };
  assert.equal(await run({ companyId: 'C1', role: 'sales' }), null);
  access = null;
  assert.equal(await run({ companyId: 'C1', role: 'sales' }), null);
});
