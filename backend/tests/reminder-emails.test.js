const { test } = require('node:test');
const assert = require('node:assert/strict');
const { domainTakesMail, isPermanentRejection, shapeProblem, skipReason } = require('../services/mail/recipientFilter');
const { sendBranded } = require('../services/mail/brandedEmail');
const meetings = require('../services/reminders/meetingReminders');
const weekly = require('../services/reminders/weeklyDigest');
const { bouncedAddress } = require('../services/mail/graphInbox');

test('test and made-up addresses are skipped, real ones are not', () => {
  for (const ok of ['rahul.sharma@gmail.com', 'priya@greencall.in', 'contest@brand.co.in', 'tester@company.com']) assert.equal(shapeProblem(ok), '', ok);
  for (const bad of ['test@gmail.com', 'testing123@gmail.com', 'sales.test@greencall.in', 'dummy_2@yahoo.com', 'fake@x.com', 'a@example.com', 'u@demo.test', 'x@mailinator.com', 'not-an-email', '']) {
    assert.notEqual(shapeProblem(bad), '', bad);
  }
});

test('a domain with no mail server is skipped; a DNS outage is not treated as a bad domain', async () => {
  const noMail = { resolveMx: async () => { const e = new Error('x'); e.code = 'ENOTFOUND'; throw e; }, resolve4: async () => { throw new Error('none'); } };
  assert.equal(await domainTakesMail('no-such-domain-1.in', noMail), false);
  const outage = { resolveMx: async () => { const e = new Error('x'); e.code = 'ETIMEOUT'; throw e; } };
  assert.equal(await domainTakesMail('slow-dns-1.in', outage), true);
  const good = { resolveMx: async () => [{ exchange: 'mx.good.in', priority: 10 }] };
  assert.equal(await skipReason('person@good-1.in', { resolver: good, isSuppressed: async () => false }), '');
  assert.equal(await skipReason('person@good-2.in', { resolver: good, isSuppressed: async () => true }), 'bounced before');
});

test('branded email: skips bad addresses, carries the logo, and blocks an address the server says does not exist', async () => {
  const sent = [];
  const suppressed = [];
  const deps = { skipReason: async (to) => (to.startsWith('test') ? 'looks like a test address' : ''), suppress: async (to) => suppressed.push(to) };
  const skip = await sendBranded('C1', { to: 'test@x.in', subject: 's', heading: 'h', body: '' }, { ...deps, sendEmail: async () => assert.fail('must not send') });
  assert.equal(skip.sent, false);
  const ok = await sendBranded('C1', { to: 'rahul@x.in', subject: 'Hello', heading: 'Hi', body: '<p>x</p>' }, { ...deps, sendEmail: async (id, p) => { sent.push(p); return { delivery: 'email' }; } });
  assert.equal(ok.sent, true);
  assert.match(sent[0].html, /cid:greencrm-logo/);
  assert.equal(sent[0].attachments[0].cid, 'greencrm-logo');
  await sendBranded('C1', { to: 'gone@x.in', subject: 's', heading: 'h', body: '' }, { ...deps, sendEmail: async () => ({ delivery: 'preview', error: '550 5.1.1 User unknown' }) });
  assert.deepEqual(suppressed, ['gone@x.in']);
  assert.equal(isPermanentRejection('421 try again later'), false);
});

const meetingRow = {
  task_id: 'tsk1', company_id: 'C1', title: 'Demo for 20 seats', type: 'meeting', due_date: new Date('2026-11-10T09:30:00Z'), related_to: 'lead', related_id: 'LD100',
  owner_name: 'Rahul Sharma', owner_email: 'rahul@greencall.in', client_name: 'Mr. Mehta', client_company: 'Orbit Pharma', client_email: 'mehta@orbit.in', client_phone: '+91 98100 00000',
};

test('meeting links come filled with time, title and the client email', () => {
  const m = meetings.meetingDetails(meetingRow);
  const google = new URL(meetings.googleCalendarLink(m));
  assert.equal(google.searchParams.get('action'), 'TEMPLATE');
  assert.equal(google.searchParams.get('dates'), '20261110T093000Z/20261110T100000Z');
  assert.equal(google.searchParams.get('add'), 'mehta@orbit.in');
  assert.equal(google.searchParams.get('text'), 'Demo for 20 seats');
  const outlook = new URL(meetings.outlookCalendarLink(m));
  assert.equal(outlook.searchParams.get('to'), 'mehta@orbit.in');
  const ics = meetings.icsFile(m, 'tsk1').content;
  assert.match(ics, /DTSTART:20261110T093000Z/);
  assert.match(ics, /UID:tsk1@greencrm/);
  // The client sees the event text, so no CRM link goes in it.
  assert.doesNotMatch(m.description, /http/);
});

test('meeting emails: saved and today versions', () => {
  const saved = meetings.buildEmail(meetingRow, 'scheduled');
  assert.equal(saved.subject, 'Meeting saved: Mr. Mehta, Orbit Pharma');
  assert.match(saved.buttons, /Create Google Meet/);
  assert.match(saved.buttons, /calendar\.google\.com/);
  assert.equal(saved.attachments[0].filename, 'meeting.ics');
  const today = meetings.buildEmail(meetingRow, 'today');
  assert.match(today.subject, /^Today: meeting with/);
  assert.match(today.text, /Open in CRM: .*\/leads\/LD100/);
});

test('weekly summary goes out on Monday from 09:00 IST, once per week', async () => {
  assert.equal(weekly.weekWindow(new Date('2026-11-09T03:45:00Z')).isSendTime, true); // Mon 09:15 IST
  assert.equal(weekly.weekWindow(new Date('2026-11-09T02:00:00Z')).isSendTime, false); // Mon 07:30 IST
  assert.equal(weekly.weekWindow(new Date('2026-11-10T05:00:00Z')).isSendTime, false); // Tuesday
  assert.equal(weekly.weekWindow(new Date('2026-11-15T10:00:00Z')).weekStart, '2026-11-09'); // Sunday belongs to that week
  assert.deepEqual(await weekly.sendDue(new Date('2026-11-10T05:00:00Z'), { loadCounts: async () => assert.fail('not Monday') }), { sent: 0, skipped: 0 });

  const people = [
    { user_id: 'U1', company_id: 'C1', name: 'Rahul Sharma', email: 'rahul@greencall.in', newLeads: 3, weekFollowUps: 2, weekTasks: 1, overdueFollowUps: 4, overdueTasks: 0 },
    { user_id: 'U2', company_id: 'C1', name: 'Priya', email: 'priya@greencall.in', newLeads: 1, weekFollowUps: 0, weekTasks: 0, overdueFollowUps: 0, overdueTasks: 0 },
  ];
  const mails = [];
  const result = await weekly.sendDue(new Date('2026-11-09T04:00:00Z'), {
    loadCounts: async () => people,
    claim: async (userId) => userId === 'U1', // U2 already got this week's email
    sendBranded: async (id, payload) => { mails.push(payload); return { sent: true }; },
  });
  assert.deepEqual(result, { sent: 1, skipped: 0 });
  assert.equal(mails[0].subject, 'Your week: 3 new, 3 pending, 4 overdue');
  assert.match(mails[0].buttons, /Open CRM/);
});

test('bounce notices give the address that does not exist; normal replies give nothing', () => {
  assert.equal(bouncedAddress({ from: { emailAddress: { address: 'postmaster@greencall.in' } }, subject: 'Undeliverable: Your week in GreenCRM', body: { content: "Your message to fake.sales@gmail.com couldn't be delivered. fake.sales wasn't found at gmail.com." } }), 'fake.sales@gmail.com');
  assert.equal(bouncedAddress({ from: { emailAddress: { address: 'mailer-daemon@googlemail.com' } }, subject: 'Delivery Status Notification (Failure)', body: { content: "Address not found Your message wasn't delivered to nobody123@gmail.com because the address couldn't be found." } }), 'nobody123@gmail.com');
  assert.equal(bouncedAddress({ from: { emailAddress: { address: 'mehta@orbit.in' } }, subject: 'Re: Proposal', body: { content: 'Thanks, your message to us was received.' } }), '');
});
