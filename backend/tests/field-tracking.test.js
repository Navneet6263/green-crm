const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
let handler;
const connectionPath = require.resolve('../db/connection');
const database = { query: (...args) => handler.query(...args), withTransaction: action => handler.transaction(action) };
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: database };
const repository = require('../repositories/fieldTrackingRepository');
const { normalizeEvent, hashEvent, assertSales, MAX_SESSION_MS } = require('../services/tracking/validation');
const auth = { companyId: 'company-a', userId: 'sales-a', role: 'sales' };
const now = Date.now(), startAt = now - 60000;
function event(kind, extra = {}) {
  return { event_id: randomUUID(), session_id: randomUUID(), device_id: randomUUID(), kind,
    captured_at: new Date(startAt).toISOString(), ...(kind === 'start' ? { consent_version: 1 } : {}),
    ...(['point', 'reach'].includes(kind) ? { latitude: 28.61, longitude: 77.2, accuracy: 10 } : {}),
    ...(kind === 'reach' ? { label: 'Customer store' } : {}), ...extra };
}
function fixture() {
  const state = { sessions: new Map(), events: new Map(), commits: 0, rollbacks: 0, calls: [] };
  const key = params => JSON.stringify(params.slice(0, 3));
  handler = {
    transaction: async action => {
      const before = structuredClone({ sessions: state.sessions, events: state.events });
      try { const result = await action(database); state.commits++; return result; }
      catch (error) { Object.assign(state, before); state.rollbacks++; throw error; }
    },
    query: async (sql, params) => {
      state.calls.push({ sql, params });
      if (sql.includes('sp_getapplock')) return [{ affectedRows: 0 }, { recordset: [{ result: 0 }] }];
      if (sql.startsWith('SELECT payload_hash')) return [[...state.events.has(key(params)) ? [state.events.get(key(params))] : []]];
      if (sql.startsWith('SELECT * FROM field_tracking_sessions') && sql.includes('session_id=?')) return [[...state.sessions.has(key(params)) ? [state.sessions.get(key(params))] : []]];
      if (sql.startsWith('INSERT INTO field_tracking_sessions')) { state.sessions.set(key(params), { device_id: params[3], started_at: params[4], stopped_at: null }); return [[]]; }
      if (sql.startsWith('INSERT INTO field_tracking_events')) { state.events.set(key(params), { session_id: params[3], captured_at: params[5], payload_hash: params[11] }); return [[]]; }
      if (sql.startsWith('SELECT TOP 1 event_id')) {
        const rows = [...state.events].filter(([id, row]) => JSON.parse(id).slice(0, 2).join() === params.slice(0, 2).join() && row.session_id === params[2] && Date.parse(row.captured_at) > Date.parse(params[3]));
        return [rows.map(([id]) => ({ event_id: id }))];
      }
      if (sql.startsWith('UPDATE field_tracking_sessions')) { state.sessions.get(key(params.slice(1))).stopped_at = params[0]; return [[]]; }
      if (sql.includes('OFFSET')) return [[]];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  return state;
}
afterEach(() => { handler = { query: async () => { throw new Error('Unmocked DB access forbidden'); } }; });

test('tracking normalization rejects invalid consent, identifiers, dates and GPS', () => {
  for (const input of [event('start', { consent_version: 0 }), event('start', { event_id: '../file' }), event('point', { latitude: 91 }), event('point', { accuracy: -1 }), event('reach', { accuracy: 101 }), event('reach', { mocked: true }), event('reach', { label: '' }), event('point', { captured_at: '2026-01-01' }), event('point', { captured_at: new Date(now + 600001).toISOString() }), event('stop', { accuracy: {} })]) assert.throws(() => normalizeEvent(input, now));
  assert.throws(() => assertSales({ ...auth, role: 'manager' }));
  assert.throws(() => assertSales({ ...auth, companyId: '' }));
  assertSales(auth);
});
test('normalization excludes forged ownership and canonicalizes hashes for retry', () => {
  const raw = event('reach');
  const first = normalizeEvent(raw, now), second = normalizeEvent({ ...raw, company_id: 'another', user_id: 'another', event_id: raw.event_id.toUpperCase(), label: ' Customer store ' }, now);
  assert.deepEqual(first, second); assert.equal(hashEvent(first), hashEvent(second));
  assert.equal('company_id' in first, false);
});
test('retry after lost acknowledgement stores one copy and acknowledges every event again', async () => {
  const state = fixture();
  const start = normalizeEvent(event('start'), now);
  const point = normalizeEvent(event('point', { session_id: start.session_id, device_id: start.device_id }), now);
  const first = await repository.ingest(auth, [start, point]);
  assert.deepEqual(await repository.ingest(auth, [start, point]), first);
  assert.equal(state.events.size, 2); assert.equal(state.sessions.size, 1);
  assert.deepEqual(first.acknowledged, [start.event_id, point.event_id]);
  const dataCalls = state.calls.filter(call => !call.sql.includes('sp_getapplock'));
  for (const call of dataCalls) assert.deepEqual(call.params.slice(0, 2), [auth.companyId, auth.userId]);
});
test('altered retry payload rejects the entire transaction without overwriting history', async () => {
  const state = fixture(), start = normalizeEvent(event('start'), now);
  await repository.ingest(auth, [start]);
  const point = normalizeEvent(event('point', { session_id: start.session_id, device_id: start.device_id }), now);
  await assert.rejects(repository.ingest(auth, [point, { ...start, label: 'changed' }]), /different data/);
  assert.equal(state.events.size, 1); assert.equal(state.rollbacks, 1);
});
test('session ownership and device scope reject other employees/companies and devices', async () => {
  fixture(); const start = normalizeEvent(event('start'), now); await repository.ingest(auth, [start]);
  const point = normalizeEvent(event('point', { session_id: start.session_id, device_id: start.device_id }), now);
  for (const other of [{ ...auth, companyId: 'other-company' }, { ...auth, userId: 'other-sales' }]) await assert.rejects(repository.ingest(other, [point]), /session start first/);
  await assert.rejects(repository.ingest(auth, [{ ...point, device_id: randomUUID() }]), /same device/);
});
test('stop and twelve-hour limit bound a consented session; duplicate stop remains idempotent', async () => {
  const state = fixture(), start = normalizeEvent(event('start', { captured_at: new Date(now - MAX_SESSION_MS - 120000).toISOString() }), now);
  await repository.ingest(auth, [start]);
  const common = { session_id: start.session_id, device_id: start.device_id };
  const outside = normalizeEvent(event('point', common), now);
  await assert.rejects(repository.ingest(auth, [outside]), /outside the consented/);
  const stop = normalizeEvent(event('stop', { ...common, captured_at: new Date(Date.parse(start.captured_at) + 60000).toISOString() }), now);
  await repository.ingest(auth, [stop]); await repository.ingest(auth, [stop]);
  const after = normalizeEvent(event('point', { ...common, captured_at: new Date(Date.parse(stop.captured_at) + 1000).toISOString() }), now);
  await assert.rejects(repository.ingest(auth, [after]), /outside the consented/);
  assert.equal(state.events.size, 2);
});
test('history queries are bounded and always filtered by the authenticated owner', async () => {
  const state = fixture();
  await repository.listSessions(auth, 2); await repository.listEvents(auth, randomUUID(), 3);
  for (const call of state.calls) { assert.match(call.sql, /WHERE company_id=\? AND user_id=\?/); assert.deepEqual(call.params.slice(0, 2), [auth.companyId, auth.userId]); }
  assert.equal(state.calls[0].params.at(-1), 20); assert.equal(state.calls[1].params.at(-1), 1000);
});
test('SQL Server transaction lock reads raw DECLARE result and fails closed on timeout', async () => {
  const acquire = require('../repositories/transactionLock');
  const { classifyStatement, formatResult } = require('../db/queryResult');
  for (const code of [0, 1]) await acquire({ query: async sql => formatResult({ recordset: [{ result: code }], rowsAffected: [] }, classifyStatement(sql)) }, 'test');
  for (const code of [-1, -2, -3, undefined]) await assert.rejects(acquire({ query: async sql => formatResult({ recordset: [{ result: code }], rowsAffected: [] }, classifyStatement(sql)) }, 'test'), /Upload busy/);
});
