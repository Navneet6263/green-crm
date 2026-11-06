const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db/connection');
const calls = [];
const state = { access: { developer_api: true }, status: 'active', keyRow: null, form: null, existing: null };
db.query = async (sql, params = []) => {
  calls.push({ sql, params });
  if (/FROM companies WHERE company_id/.test(sql)) return [[{ status: state.status, service_access: JSON.stringify(state.access) }]];
  if (/FROM developer_api_keys k LEFT JOIN users/.test(sql)) return [state.keyRow ? [state.keyRow] : []];
  if (/FROM lead_capture_forms WHERE token/.test(sql)) return [state.form ? [state.form] : []];
  if (/FROM users WHERE user_id = \?/.test(sql)) return [[{ user_id: 'USR1', id: 1, name: 'Navneet', email: 'a@b.in', role: 'admin', company_id: 'C1', is_active: 1 }]];
  if (/FROM leads\s+WHERE company_id/.test(sql)) return [state.existing ? [state.existing] : []];
  if (/next_owner = next_owner \+ 1/.test(sql)) return [[{ turn: 3 }]];
  if (/SELECT user_id FROM users WHERE company_id/.test(sql)) return [params.slice(1).map((id) => ({ user_id: id }))];
  return [[]];
};

const leadService = require('../services/leadService');
const created = [];
const notes = [];
leadService.createLead = async (auth, payload) => { created.push({ auth, payload }); return { lead_id: 'LD9' }; };
leadService.addLeadNote = async (auth, leadId, payload) => { notes.push({ leadId, payload }); return { created: true }; };
leadService.getLead = async (_auth, leadId) => ({ lead_id: leadId, contact_person: 'Ravi', company_name: 'Ravi Traders', status: 'new' });

const { parseLead } = require('../services/developer/leadFields');
const { guardServiceAccess, forget } = require('../services/developer/access');
const { hashKey } = require('../services/developer/apiKeys');
const createApp = require('../app');

let server;
let base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());

test('form fields from websites, Google Ads, IndiaMART and Facebook become one lead', () => {
  const site = parseLead({ 'your-name': 'Ravi Kumar', 'your-email': 'RAVI@Example.com', mobile: '+91 98100 12345', 'your-message': 'Need 20 seats', utm_source: 'google', _redirect: 'https://x.in' });
  assert.deepEqual([site.name, site.email, site.phone, site.message], ['Ravi Kumar', 'ravi@example.com', '9810012345', 'Need 20 seats']);
  assert.deepEqual(site.extras, [['utm_source', 'google']], 'form settings like _redirect are not saved');

  const google = parseLead({ user_column_data: [{ column_id: 'FULL_NAME', string_value: 'Asha' }, { column_id: 'PHONE_NUMBER', string_value: '09810012345' }, { column_name: 'Budget', string_value: '5L' }], google_key: 'k', is_test: true });
  assert.deepEqual([google.name, google.phone, google.isTest], ['Asha', '9810012345', true]);
  assert.deepEqual(google.extras, [['Budget', '5L']]);

  const indiamart = parseLead({ RESPONSE: { SENDER_NAME: 'Mehta', SENDER_MOBILE: '+91-9810012345', SENDER_COMPANY: 'Orbit', QUERY_MESSAGE: 'Price?' } });
  assert.deepEqual([indiamart.name, indiamart.company, indiamart.phone, indiamart.message], ['Mehta', 'Orbit', '9810012345', 'Price?']);

  const facebook = parseLead({ field_data: [{ name: 'full_name', values: ['Neha'] }, { name: 'email', values: ['neha@x.in'] }] });
  assert.deepEqual([facebook.name, facebook.email], ['Neha', 'neha@x.in']);
});

test('only the super admin can switch the Developer API on or off', () => {
  assert.equal(guardServiceAccess('platform-admin', { developer_api: false }, { leads: true, developer_api: true }).developer_api, undefined);
  assert.equal(guardServiceAccess('platform-admin', { developer_api: true }, { leads: true }).developer_api, true, 'other changes keep it on');
  assert.equal(guardServiceAccess('super-admin', { developer_api: true }, { developer_api: false }).developer_api, false);
});

test('API keys: missing, valid, wrong permission and switched-off company', async () => {
  const raw = `gcrm_${'a'.repeat(32)}`;
  state.keyRow = { key_id: 'key_1', company_id: 'C1', name: 'Zapier', scopes: 'leads:read', user_id: 'USR1', id: 1, user_name: 'Navneet', email: 'a@b.in', role: 'admin', is_active: 1, user_company_id: 'C1' };

  let res = await fetch(`${base}/me`);
  assert.equal(res.status, 401);

  res = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${raw}` } });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.key.name, 'Zapier');
  assert.ok(calls.some((c) => c.params.includes(hashKey(raw))), 'looked up by hash, never by the key itself');

  res = await fetch(`${base}/leads`, { method: 'POST', headers: { 'X-API-Key': raw, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'SCOPE_MISSING');

  state.access = { developer_api: false };
  forget('C1');
  res = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${raw}` } });
  assert.equal(res.status, 403);
  state.access = { developer_api: true };
  forget('C1');
});

test('lead capture: new lead goes to the next owner in turn; a repeat gets a note; spam is dropped', async () => {
  const token = `lc_${'b'.repeat(24)}`;
  state.form = { form_id: 'lcf_1', company_id: 'C1', name: 'Website form', token, lead_source: 'website', product_id: 'PRD1', owner_ids: '["U1","U2"]', is_active: 1, created_by: 'USR1' };

  let res = await fetch(`${base}/capture/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name=Ravi&phone=9810012345&message=Hi' });
  assert.equal(res.status, 201);
  assert.equal(created[0].payload.assigned_to, 'U2', 'turn 3 of 2 people = second person');
  assert.equal(created[0].payload.product_id, 'PRD1');
  assert.equal(created[0].auth.role, 'admin');

  state.existing = { lead_id: 'LD1', assigned_to: 'U1' };
  res = await fetch(`${base}/capture/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ravi@x.in' }) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.duplicate, true);
  assert.equal(notes[0].leadId, 'LD1');

  res = await fetch(`${base}/capture/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '1', _gotcha: 'bot' }) });
  assert.equal(res.status, 201);
  assert.equal(created.length, 1, 'spam is not saved');

  res = await fetch(`${base}/capture/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' }, body: 'name=NoContact' });
  assert.equal(res.status, 422);
  assert.match(await res.text(), /phone number or an email/);

  res = await fetch(`${base}/capture/lc_unknown`, { method: 'POST' });
  assert.equal(res.status, 404);
});

test('a form cannot send visitors to another website after posting', async () => {
  state.existing = null;
  state.form.redirect_url = 'https://greencall.in/thank-you';
  const post = (extra) => fetch(`${base}/capture/${state.form.token}`, { method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' }, body: `name=Asha&phone=98100${Date.now() % 100000}${extra}` });
  let res = await post('&_redirect=https://evil.example/login');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://greencall.in/thank-you');
  res = await post('&_redirect=https://greencall.in/thanks-hindi');
  assert.equal(res.headers.get('location'), 'https://greencall.in/thanks-hindi');
});
