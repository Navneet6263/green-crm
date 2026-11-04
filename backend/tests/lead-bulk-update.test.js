const { test } = require('node:test');
const assert = require('node:assert/strict');

const leadService = require('../services/leadService');

const admin = { companyId: 'C1', userId: 'A1', role: 'admin' };

test('bulk update is limited to managers and needs a note and a change', async () => {
  await assert.rejects(() => leadService.bulkUpdateLeads({ ...admin, role: 'sales' }, { lead_ids: ['L1'], change_note: 'x', status: 'new' }), /Only managers and admins/);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: [], change_note: 'x', status: 'new' }), /at least one lead/);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: ['L1'], status: 'new' }), /note is required/);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: ['L1'], change_note: 'x' }), /what to change/);
});

test('bulk update refuses bad values and statuses that need details', async () => {
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: ['L1'], change_note: 'x', status: 'nope' }), /Invalid lead status/);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: ['L1'], change_note: 'x', status: 'booked-demo' }), /one lead at a time/);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: ['L1'], change_note: 'x', priority: 'nope' }), /Invalid lead priority/);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: ['L1'], change_note: 'x', follow_up_date: 'soon' }), /Invalid follow-up date/);
  const tooMany = Array.from({ length: 501 }, (_, i) => `L${i}`);
  await assert.rejects(() => leadService.bulkUpdateLeads(admin, { lead_ids: tooMany, change_note: 'x', status: 'new' }), /up to 500/);
});
