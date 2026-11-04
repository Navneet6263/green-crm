const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
const calls = [];
let dueRows = [];
db.query = async (sql, params = []) => {
  calls.push({ sql, params });
  if (/FROM task_email_reminders r/.test(sql)) return [dueRows];
  if (/SELECT task_id, minutes_before FROM task_email_reminders/.test(sql)) return [[{ task_id: 'tsk1', minutes_before: 30 }]];
  return [[]];
};
const reminders = require('../services/reminders/taskReminders');

test('reminder choices: none, minutes before, and the all-day morning; anything else is refused', () => {
  assert.equal(reminders.parseMinutes(null), null);
  assert.equal(reminders.parseMinutes('none'), null);
  assert.equal(reminders.parseMinutes('10'), 10);
  assert.equal(reminders.parseMinutes(-540), -540);
  assert.throws(() => reminders.parseMinutes('soon'), /Choose when/);
  assert.throws(() => reminders.parseMinutes(99999), /Choose when/);
});

test('saving a reminder stores the time to send; moving the task moves it; "none" removes it', async () => {
  calls.length = 0;
  await reminders.setReminder({ task_id: 'tsk1', company_id: 'C1', due_date: '2026-11-04T05:50:00Z' }, 10);
  const merge = calls.find((c) => /MERGE task_email_reminders/.test(c.sql));
  assert.equal(merge.params[2].toISOString(), '2026-11-04T05:40:00.000Z', '11:20 IST task, 10 minutes before = 11:10 IST');
  await reminders.followTask({ task_id: 'tsk1', due_date: '2026-11-05T05:50:00Z' });
  assert.ok(calls.some((c) => /UPDATE task_email_reminders SET remind_at = DATEADD/.test(c.sql)));
  await reminders.setReminder({ task_id: 'tsk1', company_id: 'C1', due_date: '2026-11-04T05:50:00Z' }, 'none');
  assert.ok(calls.some((c) => /DELETE FROM task_email_reminders/.test(c.sql)));
  assert.equal((await reminders.minutesFor(['tsk1'])).get('tsk1'), 30);
});

test('due reminders are marked sent before the email, and the email names the task, time and client', async () => {
  calls.length = 0;
  dueRows = [{ task_id: 'tsk1', company_id: 'C1', title: 'Call Mr. Mehta about pricing', type: 'call', due_date: new Date('2026-11-04T05:50:00Z'), notes: 'Ask about 20 seats',
    related_to: 'lead', related_id: 'LD100', owner_name: 'Navneet Kumar', owner_email: 'spoekn.3764@gmail.com', client_name: 'Mr. Mehta', client_company: 'Orbit Pharma', client_phone: '98100' }];
  const mails = [];
  const order = [];
  const result = await reminders.sendDue(new Date('2026-11-04T05:41:00Z'), { sendBranded: async (id, payload) => { order.push('send'); mails.push(payload); return { sent: true }; } });
  order.unshift(calls.findIndex((c) => /SET sent_at = SYSUTCDATETIME\(\)/.test(c.sql)) >= 0 ? 'marked' : 'not-marked');
  assert.deepEqual(result, { sent: 1 });
  assert.deepEqual(order, ['marked', 'send']);
  assert.equal(mails[0].to, 'spoekn.3764@gmail.com');
  assert.match(mails[0].subject, /^Reminder: Call Mr\. Mehta about pricing · Wed, 4 Nov, 11:20 am/i);
  assert.match(mails[0].body, /Orbit Pharma/);
  assert.match(mails[0].buttons, /Open in CRM/);
  assert.doesNotMatch(mails[0].buttons, /Google Meet/, 'only meetings and demos get the Meet button');
  const sql = calls.find((c) => /FROM task_email_reminders r/.test(c.sql)).sql;
  assert.match(sql, /email_verified_at >= DATEADD/, 'only verified emails');
});
