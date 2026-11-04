const { test } = require('node:test');
const assert = require('node:assert/strict');

// Stub data access and mail before the services capture them.
const db = require('../db/connection');
const calls = [];
db.query = async (sql, params) => {
  calls.push({ sql, params });
  if (/FROM users WHERE company_id = \? AND is_active = 1 AND user_id IN/.test(sql)) {
    return [params.slice(1).filter((id) => id !== 'NOMAIL').map((id) => ({ user_id: id, name: id === 'U1' ? 'Rahul Sharma' : 'Priya Verma', email: `${id.toLowerCase()}@example.test`, role: 'sales' }))];
  }
  if (/INSERT INTO email_nudges/.test(sql)) return [[{ id: '11111111-2222-3333-4444-555555555555' }]];
  if (/SELECT user_id, name, email, role, phone, last_login_at/.test(sql)) return [[{ user_id: params[1], name: 'Rahul Sharma', email: 'u1@example.test', role: 'sales', is_active: 1 }]];
  return [[]];
};
const leadService = require('../services/leadService');
leadService.getLead = async (auth, id) => {
  if (id === 'LX') { const e = new Error('Lead not found.'); e.statusCode = 404; throw e; }
  return { lead_id: id, company_name: 'Thompson <Press>', contact_person: 'Mr. Rao', phone: '98100', status: 'contacted', follow_up_date: new Date(Date.now() - 3 * 86400000).toISOString(), assigned_to_name: 'Rahul Sharma', latest_note: 'Called, wants a quote\n\nChanges:\nStatus: A -> B' };
};
const leadRepository = require('../repositories/leadRepository');
const activities = [];
leadRepository.createActivity = async (a) => { activities.push(a); };
const auditRepository = require('../repositories/auditRepository');
auditRepository.createLog = async () => {};
const managed = require('../services/communication/managedEmailService');
const sent = [];
let delivery = 'email';
managed.sendManagedEmail = async (companyId, payload) => { sent.push(payload); return { delivery, message_id: '<abc@example.test>', from: 'crm@example.test', error: delivery === 'email' ? null : 'auth failed' }; };
managed.resolveEmailCapability = async () => ({ enabled: true });

const nudges = require('../services/nudges/nudgeService');
const admin = { companyId: 'C1', userId: 'A1', id: 1, role: 'admin', name: 'Vivek Kumar', email: 'vivek@example.test' };
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString('base64')}`;

test('only admins can send', async () => {
  await assert.rejects(() => nudges.sendNudge({ ...admin, role: 'manager' }, { lead_id: 'L1', to_user_ids: ['U1'], message: 'x' }), /Only admins/);
  assert.equal((await nudges.getConfig({ ...admin, role: 'sales' })).can_send, false);
});

test('lead email: summary, screenshot, CC, link and a ref code', async () => {
  sent.length = 0; activities.length = 0; calls.length = 0;
  const res = await nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['U1'], cc: 'Vivek@Example.test, boss@example.test', message: 'Please call today.', screenshot: PNG });
  const mail = sent[0];
  assert.deepEqual(mail.to, ['u1@example.test']);
  assert.deepEqual(mail.cc, ['vivek@example.test', 'boss@example.test']);
  assert.match(mail.subject, /^Follow-up needed: Thompson <Press> \[Ref N-[0-9A-F]{6}\]$/);
  assert.match(mail.html, /Thompson &lt;Press&gt;/, 'lead name is escaped');
  assert.match(mail.html, /3 days overdue/);
  assert.match(mail.html, /\/leads\/L1/);
  assert.doesNotMatch(mail.html, /Changes:/);
  assert.equal(mail.attachments[0].cid.startsWith('shot-'), true);
  assert.match(mail.html, new RegExp(`cid:${mail.attachments[0].cid}`));
  assert.match(res.ref_code, /^N-/);
  assert.match(activities[0].description, /Vivek Kumar emailed Rahul Sharma \(CC vivek@example.test, boss@example.test\)/);
  assert.ok(calls.some((c) => /INSERT INTO notifications/.test(c.sql) && c.params.includes('U1')));
  for (const c of calls) assert.equal((c.sql.match(/\?/g) || []).length, c.params.length, c.sql.slice(0, 60));
});

test('bad input is refused before anything is sent', async () => {
  sent.length = 0;
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: [], message: 'x' }), /who should get/);
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['NOMAIL'], message: 'x' }), /email address/);
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['U1'], message: 'x', cc: 'not-an-email' }), /valid email/);
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['U1'], message: '' }), /short message/);
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['U1'], message: 'x', screenshot: 'data:image/svg+xml;base64,PHN2Zz4=' }), /PNG or JPEG/);
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['U1'], message: 'x', screenshot: `data:image/png;base64,${Buffer.from('hello').toString('base64')}` }), /could not be read/);
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'LX', to_user_ids: ['U1'], message: 'x' }), /Lead not found/);
  assert.equal(sent.length, 0);
});

test('a failed send is saved as failed and reported', async () => {
  delivery = 'preview-fallback'; calls.length = 0;
  await assert.rejects(() => nudges.sendNudge(admin, { lead_id: 'L1', to_user_ids: ['U1'], message: 'x' }), /could not be sent: auth failed/);
  const insert = calls.find((c) => /INSERT INTO email_nudges/.test(c.sql));
  assert.ok(insert.params.includes('failed'));
  delivery = 'email';
});

test('person email carries the numbers and the Excel', async () => {
  const report = require('../services/reports/personReport');
  report.getPersonReport = async () => ({
    person: { user_id: 'U1', name: 'Rahul Sharma', role: 'sales', teams: 'Delhi' },
    widgets: { kpis: { data: { now: { total: 120, open_leads: 40, overdue: 7, pipeline_value: 500000 }, cohort: { won: 9 }, tasks: { overdue: 2 } } } },
    activity: { updates: 31 }, overdue: { total: 1, items: [{ company_name: 'Kapoor Steels', follow_up_date: new Date().toISOString() }] },
  });
  report.buildPersonExcel = async () => ({ buffer: Buffer.from('xlsx'), filename: 'GreenCRM-Rahul.xlsx' });
  delete require.cache[require.resolve('../services/reports/personEmail')];
  const { emailPersonReport } = require('../services/reports/personEmail');
  sent.length = 0;
  await emailPersonReport(admin, { about_user_id: 'U1', message: 'Your week.', attach_report: true });
  assert.deepEqual(sent[0].to, ['u1@example.test']);
  assert.match(sent[0].html, /Follow-ups overdue/);
  assert.match(sent[0].html, /Kapoor Steels/);
  assert.match(sent[0].html, /\/people\/U1/);
  assert.equal(sent[0].attachments[0].filename, 'GreenCRM-Rahul.xlsx');
});

test('people who are not admins only see emails sent to them', async () => {
  calls.length = 0;
  await nudges.listNudges({ ...admin, role: 'sales', userId: 'U1' }, {});
  const sql = calls.find((c) => /FROM email_nudges/.test(c.sql));
  assert.match(sql.sql, /to_user_ids/);
  assert.ok(sql.params.includes('%,U1,%'));
  await assert.rejects(() => nudges.getNudge(admin, 'not-a-guid'), /not found/);
});

test('customer emails from the Email page are kept, and never break the send', async () => {
  calls.length = 0;
  const id = await nudges.recordCustomerEmail(admin, { leadId: 'L1', to: 'Buyer@Client.test', cc: [], subject: 'Quote', body: 'Please find the quote.', delivery: { delivery: 'email', message_id: '<q1@x>' } });
  assert.equal(id, '11111111-2222-3333-4444-555555555555');
  const insert = calls.find((c) => /INSERT INTO email_nudges/.test(c.sql));
  assert.ok(insert.params.includes('customer'));
  assert.ok(insert.params.includes('buyer@client.test'));
  assert.ok(insert.params.includes('/leads/L1'));
  assert.equal(await nudges.recordCustomerEmail(admin, { leadId: 'L1', to: 'not an email', subject: 'x', body: 'y', delivery: {} }), null);
});

test('the Sent list can show only team or only customer emails; others see what they sent too', async () => {
  calls.length = 0;
  await nudges.listNudges({ ...admin, role: 'sales', userId: 'U1' }, { scope: 'customer' });
  const sql = calls.find((c) => /FROM email_nudges/.test(c.sql));
  assert.match(sql.sql, /n\.kind IN \(\?\)/);
  assert.ok(sql.params.includes('customer'));
  assert.match(sql.sql, /n\.sent_by = \?/);
  assert.equal((sql.sql.match(/\?/g) || []).length, sql.params.length);
  calls.length = 0;
  await nudges.listRecentReplies({ ...admin, role: 'sales', userId: 'U1' }, {});
  const replies = calls.find((c) => /FROM email_replies r JOIN email_nudges/.test(c.sql));
  assert.equal((replies.sql.match(/\?/g) || []).length, replies.params.length);
});
