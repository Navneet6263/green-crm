const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
const calls = [];
db.query = async (sql, params) => {
  calls.push({ sql, params });
  if (/FROM leads l\s+LEFT JOIN users u/.test(sql)) return [[{ lead_id: 'L1', company_name: 'Kapoor', delete_note: 'Lead archived.\n\nReason:\nDuplicate of L2', deleted_by_name: 'Amit', total_count: 1 }]];
  if (/SELECT TOP 1 l.lead_id, l.company_id FROM leads l/.test(sql)) return [params.includes('L1') ? [{ lead_id: 'L1', company_id: 'C1' }] : []];
  return [[]];
};
db.withTransaction = async (fn) => fn({ query: async (sql, params) => { calls.push({ sql, params }); return [[]]; } });
require('../services/leadService').buildLeadFilters = async () => ({ companyId: 'C1', teamIds: ['T1'] });
require('../repositories/auditRepository').createLog = async () => {};
const deleted = require('../services/leads/deletedLeads');
const admin = { companyId: 'C1', userId: 'A1', role: 'admin' };

test('only admins and managers see deleted leads, scoped and with the reason', async () => {
  await assert.rejects(() => deleted.listDeletedLeads({ ...admin, role: 'sales' }), /Only admins and managers/);
  calls.length = 0;
  const res = await deleted.listDeletedLeads(admin, { page: 1 });
  assert.equal(res.items[0].reason, 'Duplicate of L2');
  assert.match(calls[0].sql, /l\.is_active = 0/);
  assert.ok(calls[0].params.includes('T1'));
  assert.equal((calls[0].sql.match(/\?/g) || []).length, calls[0].params.length);
});

test('restore needs a reason and only works on a deleted lead in scope', async () => {
  await assert.rejects(() => deleted.restoreLead(admin, 'L1', {}), /why/);
  await assert.rejects(() => deleted.restoreLead(admin, 'L9', { change_note: 'x' }), /not found/);
  calls.length = 0;
  const res = await deleted.restoreLead(admin, 'L1', { change_note: 'Deleted by mistake' });
  assert.equal(res.restored, true);
  assert.ok(calls.some((c) => /UPDATE leads SET is_active = 1/.test(c.sql)));
  assert.ok(calls.some((c) => /Lead restored/.test(JSON.stringify(c.params))));
});
