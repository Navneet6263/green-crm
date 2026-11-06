const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

const db = require('../db/connection');
const calls = [];
const idem = new Map();
const state = { allowedIps: null, deliveries: [], hooks: [{ webhook_id: 'wh_1', events: 'lead.updated,lead.status_changed' }] };
db.query = async (sql, params = []) => {
  calls.push({ sql, params });
  if (/FROM companies WHERE company_id/.test(sql)) return [[{ status: 'active', service_access: '{"developer_api":true}' }]];
  if (/FROM developer_api_keys k LEFT JOIN users/.test(sql)) {
    return [[{ key_id: 'key_1', company_id: 'C1', name: 'Website', scopes: 'leads:read,leads:write', allowed_ips: state.allowedIps, user_id: 'USR1', id: 1, user_name: 'Navneet', email: 'a@b.in', role: 'admin', is_active: 1, user_company_id: 'C1' }]];
  }
  if (/INSERT INTO developer_idempotency/.test(sql)) {
    const k = `${params[0]}|${params[1]}`;
    if (idem.has(k)) throw Object.assign(new Error('duplicate key'), { number: 2627 });
    idem.set(k, { request_hash: params[2], status: 0, response_json: null });
    return [[]];
  }
  if (/FROM developer_idempotency/.test(sql)) return [[idem.get(`${params[0]}|${params[1]}`)].filter(Boolean)];
  if (/UPDATE developer_idempotency SET status/.test(sql)) { Object.assign(idem.get(`${params[2]}|${params[3]}`), { status: params[0], response_json: params[1] }); return [[]]; }
  if (/FROM developer_webhooks WHERE company_id = \? AND is_active = 1/.test(sql)) return [state.hooks];
  if (/INSERT INTO developer_webhook_deliveries/.test(sql)) { state.deliveries.push({ webhook: params[0], event: params[3], payload: params[4] }); return [[]]; }
  if (/SELECT TOP 2 product_id FROM products/.test(sql)) return [[{ product_id: 'P1' }]];
  if (/FROM products WHERE product_id/.test(sql)) return [[{ product_id: 'P1' }]];
  return [[]];
};

const leadService = require('../services/leadService');
const created = [];
const updates = [];
leadService.createLead = async (_auth, payload) => { created.push(payload); return { lead_id: `LD${created.length}` }; };
leadService.updateLead = async (_auth, id, payload) => { updates.push({ id, payload }); return { lead_id: id }; };
leadService.getLead = async (_auth, id) => ({ lead_id: id, contact_person: 'Ravi', company_name: 'Ravi Traders', phone: '9810012345', status: 'new' });

const createApp = require('../app');
const { sign } = require('../services/developer/webhooks');
const { assertPublicUrl } = require('../services/developer/safeUrl');
const delivery = require('../services/developer/webhookDelivery');
const leadEvents = require('../services/developer/leadEvents');
const { hit } = require('../services/developer/limits');

const KEY = `gcrm_${'k'.repeat(32)}`;
let server;
let base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());
const api = (path, { method = 'GET', body, headers = {} } = {}) => fetch(`${base}${path}`, {
  method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
});

test('limits count per window and answer with rate-limit headers', async () => {
  const name = `t-${Date.now()}`;
  assert.equal((await hit(name, 60, 2)).allowed, true);
  assert.equal((await hit(name, 60, 2)).allowed, true);
  assert.equal((await hit(name, 60, 2)).allowed, false);
  const res = await api('/me');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-ratelimit-limit'), '120');
  assert.ok(Number(res.headers.get('x-ratelimit-remaining')) < 120);
});

test('the same Idempotency-Key sends the first answer back and does not create twice', async () => {
  const headers = { 'Idempotency-Key': 'order-2026-0001' };
  const body = { name: 'Ravi', phone: '9810012345' };
  const first = await api('/leads', { method: 'POST', body, headers });
  assert.equal(first.status, 201);
  const again = await api('/leads', { method: 'POST', body, headers });
  assert.equal(again.status, 201);
  assert.equal(again.headers.get('idempotent-replayed'), 'true');
  assert.equal(created.length, 1);
  const other = await api('/leads', { method: 'POST', body: { name: 'Someone else', phone: '1' }, headers });
  assert.equal(other.status, 422);
  assert.equal((await other.json()).code, 'IDEMPOTENCY_KEY_REUSED');
});

test('test mode lists every problem and saves nothing; updates carry a change note', async () => {
  const res = await api('/leads', { method: 'POST', body: { status: 'maybe', email: 'not-an-email' }, headers: { 'X-Dry-Run': 'true' } });
  const body = await res.json();
  assert.equal(res.status, 422);
  assert.deepEqual(body.details.problems.map((p) => p.field).sort(), ['contact_person', 'email', 'status']);
  assert.ok(body.request_id, 'errors carry a request id for support');
  const ok = await api('/leads', { method: 'POST', body: { name: 'Asha', phone: '9810000000' }, headers: { 'X-Dry-Run': 'true' } });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).data.dry_run, true);
  assert.equal(created.length, 1, 'nothing saved in test mode');

  const patch = await api('/leads/LD1', { method: 'PATCH', body: { status: 'contacted' } });
  assert.equal(patch.status, 200);
  assert.match(updates[0].payload.change_note, /Updated through the API \(key: Website\)/);
});

test('lists check their filters, and fields= trims the answer', async () => {
  assert.equal((await api('/leads?sort=random')).status, 400);
  assert.equal((await api('/leads?cursor=abc&sort=oldest')).status, 400);
  assert.equal((await api('/leads?fields=id,password')).status, 400);
  assert.equal((await api('/leads?updated_since=yesterday')).status, 400);
});

test('a key limited to some addresses refuses others', async () => {
  state.allowedIps = '203.0.113.7';
  const res = await api('/me');
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'IP_NOT_ALLOWED');
  state.allowedIps = '127.0.0.1,::1';
  assert.equal((await api('/me')).status, 200);
  state.allowedIps = null;
});

test('OpenAPI description is served without a key', async () => {
  const res = await fetch(`${base}/openapi.json`);
  const spec = await res.json();
  assert.equal(res.status, 200);
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.paths['/leads'].post);
  assert.ok(spec.webhooks['lead.created']);
});

test('webhooks: only public https addresses, signed calls, and status changes queue their own event', async () => {
  await assert.rejects(assertPublicUrl('http://example.com/hook'), /https/);
  await assert.rejects(assertPublicUrl('https://inside.example/hook', async () => [{ address: '10.0.0.5' }]), /private network/);
  await assert.rejects(assertPublicUrl('https://127.0.0.1/hook'), /private network/);
  assert.ok(await assertPublicUrl('https://hooks.example.com/crm', async () => [{ address: '93.184.216.34' }]));

  const header = sign('whsec_test', '{"a":1}', 1700000000);
  const expected = crypto.createHmac('sha256', 'whsec_test').update('1700000000.{"a":1}').digest('hex');
  assert.equal(header, `t=1700000000,v1=${expected}`);

  leadEvents.updated({ status: 'new', assigned_to: 'U1' }, { lead_id: 'LD1', company_id: 'C1', status: 'contacted', assigned_to: 'U1' }, [{ label: 'Status', before: 'new', after: 'contacted' }], { userId: 'USR1' });
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(state.deliveries.map((d) => d.event), ['lead.updated', 'lead.status_changed']);
  assert.equal(JSON.parse(state.deliveries[1].payload).data.to, 'contacted');
});

test('a delivery posts the signed body and never follows a private address', async () => {
  let seen = null;
  const request = (url, options, onResponse) => {
    const req = new EventEmitter();
    req.end = (body) => { seen = { url: String(url), options, body }; const res = new EventEmitter(); res.statusCode = 204; res.resume = () => {}; onResponse(res); setImmediate(() => res.emit('end')); };
    req.destroy = () => {};
    return req;
  };
  const result = await delivery.post('https://hooks.example.com/crm', '{"x":1}', { 'X-GreenCRM-Signature': 't=1,v1=abc' }, { request });
  assert.equal(result.status, 204);
  assert.equal(seen.options.headers['X-GreenCRM-Signature'], 't=1,v1=abc');
  assert.equal(seen.body, '{"x":1}');

  const blocked = await new Promise((resolve) => delivery.guardedLookup('localhost', {}, (error) => resolve(error)));
  assert.match(String(blocked?.message), /private network/);
});
