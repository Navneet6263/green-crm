const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
const calls = [];
db.query = async (sql, params) => { calls.push({ sql, params }); return [[]]; };
const repo = require('../repositories/leadRepository');
const page = { limit: 25, offset: 0, pageSize: 25, page: 1 };
const last = () => calls[calls.length - 1];
const placeholders = (sql) => (sql.match(/\?/g) || []).length;

test('only known columns can be sorted on; anything else uses the default', async () => {
  await repo.listLeads({ companyId: 'C1', sort: 'estimated_value', sortDir: 'desc' }, page);
  assert.match(calls.find((c) => /OFFSET/.test(c.sql)).sql, /ORDER BY l\.estimated_value DESC, l\.id DESC/);
  calls.length = 0;
  await repo.listLeads({ companyId: 'C1', sort: 'l.id; DROP TABLE leads', sortDir: 'asc' }, page);
  const sql = calls.find((c) => /OFFSET/.test(c.sql)).sql;
  assert.doesNotMatch(sql, /DROP TABLE/);
  assert.match(sql, /ORDER BY l\.created_at DESC, l\.id DESC/);
});

test('follow-up, stale and high priority filters keep SQL and values in step', async () => {
  for (const filters of [{ followUp: 'overdue' }, { followUp: 'today' }, { followUp: 'unscheduled' }, { stale: true }, { priority: 'high-urgent' }]) {
    calls.length = 0;
    await repo.listLeads({ companyId: 'C1', ...filters }, page);
    const call = calls.find((c) => /OFFSET/.test(c.sql));
    assert.equal(placeholders(call.sql), call.params.length, JSON.stringify(filters));
  }
});

test('counts query lines up its values with its placeholders', async () => {
  await repo.getLeadCounts({ companyId: 'C1', assignedTo: 'U1', teamIds: ['T1'] });
  assert.equal(placeholders(last().sql), last().params.length);
});
