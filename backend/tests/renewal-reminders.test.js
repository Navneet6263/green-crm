const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
const calls = [];
let open = [];
let due = [];
db.query = async (sql, params) => {
  calls.push({ sql, params });
  if (/FROM renewal_reminders WHERE kind = \? AND entity_id = \? AND reminded_at IS NULL/.test(sql)) return [open];
  if (/INSERT INTO renewal_reminders/.test(sql)) return [[{ id: 'R1' }]];
  if (/FROM renewal_reminders r LEFT JOIN users u/.test(sql)) return [due];
  return [[]];
};
const tasks = [];
require('../repositories/taskRepository').createTask = async (t) => { tasks.push(t); return t; };
const renewals = require('../services/renewals/renewalReminders');
const inDays = (n) => new Date(Date.now() + n * 86400000 + 330 * 60000).toISOString().slice(0, 10);
const lead = { lead_id: 'L1', company_id: 'C1', company_name: 'Kapoor Steels', assigned_to: 'U1', team_id: 'T1', status: 'closed-won', client_tenure: inDays(90) };

test('reminder is 10 days before the end at 10:00 IST, or soon if that has passed', () => {
  const at = renewals.reminderTime('2027-11-20', Date.parse('2026-11-03T00:00:00Z'));
  assert.equal(at.toISOString(), '2027-11-10T04:30:00.000Z');
  const now = Date.parse('2027-11-15T00:00:00Z');
  assert.ok(Math.abs(renewals.reminderTime('2027-11-20', now).getTime() - (now + 3600000)) < 5);
  assert.equal(renewals.dayKey('2027-11-20'), '2027-11-20');
  assert.equal(renewals.dayKey('garbage'), null);
});

test('a won lead with a plan end gets one calendar task; not won or ended plans get none', async () => {
  open = []; tasks.length = 0; calls.length = 0;
  await renewals.scheduleLeadRenewal(lead, 'A1');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].assigned_to, 'U1');
  assert.equal(tasks[0].related_to, 'lead');
  assert.match(tasks[0].title, /Renewal due: Kapoor Steels plan ends/);
  assert.ok(calls.some((c) => /INSERT INTO renewal_reminders/.test(c.sql)));
  tasks.length = 0;
  await renewals.scheduleLeadRenewal({ ...lead, status: 'negotiation' });
  await renewals.scheduleLeadRenewal({ ...lead, client_tenure: inDays(-3) });
  assert.equal(tasks.length, 0);
});

test('saving the same end again does nothing; a new end date moves the task', async () => {
  tasks.length = 0; calls.length = 0;
  open = [{ id: 'R1', end_date: lead.client_tenure, task_id: 'T9' }];
  await renewals.scheduleLeadRenewal(lead, 'A1');
  assert.equal(tasks.length, 0);
  assert.ok(!calls.some((c) => /UPDATE/.test(c.sql)));
  await renewals.scheduleLeadRenewal({ ...lead, client_tenure: inDays(200) }, 'A1');
  assert.ok(calls.some((c) => /UPDATE renewal_reminders SET end_date/.test(c.sql)));
  assert.ok(calls.some((c) => /UPDATE tasks SET due_date/.test(c.sql) && c.params.includes('T9')));
  assert.equal(tasks.length, 0);
});

test('due reminders send a notification and an email once', async () => {
  calls.length = 0;
  due = [{ id: 'R1', company_id: 'C1', kind: 'lead', entity_id: 'L1', end_date: inDays(10), title: 'Renewal due: Kapoor Steels', related_to: 'lead', related_id: 'L1', owner_id: 'U1', owner_email: 'rahul@example.test', owner_name: 'Rahul' }];
  const mails = [];
  const { sent } = await renewals.sendDue({ sendEmail: async (companyId, payload) => { mails.push(payload); return { delivery: 'email' }; } });
  assert.equal(sent, 1);
  assert.equal(mails[0].to, 'rahul@example.test');
  assert.match(mails[0].html, /\/leads\/L1/);
  assert.ok(calls.some((c) => /INSERT INTO notifications/.test(c.sql) && c.params.includes('U1')));
  assert.ok(calls.some((c) => /UPDATE renewal_reminders SET reminded_at/.test(c.sql)));
  for (const c of calls) assert.equal((c.sql.match(/\?/g) || []).length, (c.params || []).length);
});
