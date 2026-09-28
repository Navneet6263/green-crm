import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { TRACKING_SCHEMA } from '../src/tracking/schema';
import * as types from '../src/tracking/types';
import type { Session } from '../src/api/types';

// Real SQLite SQL/transactions, with only the native connection/crypto bridges replaced.
// This does not claim to validate SQLCipher or background GPS on a physical device.
function fixture() {
  const database = new DatabaseSync(':memory:'); database.exec(TRACKING_SCHEMA);
  const adapter = {
    runAsync: async (sql: string, ...params: any[]) => database.prepare(sql).run(...params),
    getFirstAsync: async (sql: string, ...params: any[]) => database.prepare(sql).get(...params) || null,
    getAllAsync: async (sql: string, ...params: any[]) => database.prepare(sql).all(...params),
  };
  const bridge = { trackingDb: async () => adapter, trackingTransaction: async (action: (tx: any) => Promise<void>) => {
    database.exec('BEGIN IMMEDIATE');
    try { await action(adapter); database.exec('COMMIT'); }
    catch (error) { database.exec('ROLLBACK'); throw error; }
  } };
  function load(): typeof import('../src/tracking/store') {
    const output = ts.transpileModule(readFileSync('src/tracking/store.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    runInThisContext(`(function(require,module,exports){${output}\n})`)((name: string) => {
      if (name === 'expo-crypto') return { randomUUID };
      if (name === './database') return bridge;
      if (name === './types') return types;
      throw new Error(`Unexpected native dependency ${name}`);
    }, module, module.exports);
    return module.exports as typeof import('../src/tracking/store');
  }
  return { database, store: load(), restart: load };
}
const fix = () => ({ timestamp: Date.now(), coords: { latitude: 28.6139, longitude: 77.209, accuracy: 15 } });

test('offline start, route and reached persist across module restart; upload IDs are stable', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('company-a:user-a');
    await f.store.recordFix(trip, fix()); await f.store.recordFix(trip, fix(), 'Customer store');
    const before = await f.store.pendingEvents(trip.owner);
    const restored = f.restart();
    assert.deepEqual(await restored.getActive(), trip);
    assert.deepEqual(await restored.pendingEvents(trip.owner), before);
    assert.deepEqual(before.map(event => event.kind), ['start', 'point', 'reach']);
    await restored.endTrip();
    assert.equal(await restored.getActive(), null);
    assert.equal((await restored.pendingEvents(trip.owner)).at(-1)?.kind, 'stop');
  } finally { f.database.close(); }
});

test('another account cannot see or acknowledge the first account queue', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('company-a:user-a');
    await assert.rejects(f.store.beginTrip('company-b:user-a'), /already exists/);
    const event = (await f.store.pendingEvents(trip.owner))[0];
    await f.store.acknowledge('company-b:user-a', [event.event_id]);
    assert.equal((await f.store.pendingEvents(trip.owner)).length, 1);
    const other = await f.store.snapshot('company-b:user-a');
    assert.equal(other.active, null); assert.equal(other.pending, 0); assert.deepEqual(other.events, []);
    await f.store.endTrip(); await f.store.beginTrip('company-b:user-a');
    assert.equal((await f.store.pendingEvents(trip.owner)).length, 2);
  } finally { f.database.close(); }
});

test('only acknowledged events leave pending; cleanup never deletes unsynced events', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('owner'); await f.store.recordFix(trip, fix()); await f.store.endTrip();
    const events = await f.store.pendingEvents('owner');
    f.database.prepare('UPDATE tracking_events SET stored_at=?').run(Date.now() - 10 * 86400000);
    await f.store.acknowledge('owner', [events[0].event_id]);
    const left = await f.store.pendingEvents('owner');
    assert.deepEqual(left.map(event => event.event_id), events.slice(1).map(event => event.event_id));
    assert.equal((await f.store.snapshot('owner')).events.length, 2);
    await f.store.acknowledge('owner', left.map(event => event.event_id));
    assert.equal((await f.store.pendingEvents('owner')).length, 0);
  } finally { f.database.close(); }
});

test('reached rejects stale, inaccurate, mocked, invalid GPS and a stopped session', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('owner');
    await assert.rejects(f.store.recordFix(trip, { ...fix(), timestamp: Date.now() - 60000 }, 'Store'), /fresh/);
    await assert.rejects(f.store.recordFix(trip, { ...fix(), coords: { ...fix().coords, accuracy: 150 } }, 'Store'), /fresh/);
    await assert.rejects(f.store.recordFix(trip, { ...fix(), mocked: true }, 'Store'), /non-mocked/);
    await assert.rejects(f.store.recordFix(trip, { ...fix(), coords: { ...fix().coords, latitude: 999 } }, 'Store'), /GPS fix unavailable/);
    await f.store.endTrip();
    await assert.rejects(f.store.recordFix(trip, fix(), 'Store'), /Tracking has stopped/);
    await f.store.recordFix(trip, fix()); // A late passive OS callback must not reopen the session.
    assert.deepEqual((await f.store.pendingEvents('owner')).map(event => event.kind), ['start', 'stop']);
  } finally { f.database.close(); }
});

test('failed event persistence rolls back and retains the active trip', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('owner');
    f.database.exec("CREATE TRIGGER reject_write BEFORE INSERT ON tracking_events BEGIN SELECT RAISE(ABORT, 'disk full simulation'); END;");
    await assert.rejects(f.store.endTrip(), /disk full simulation/);
    assert.deepEqual(await f.store.getActive(), trip);
    assert.equal((await f.store.pendingEvents('owner')).length, 1);
  } finally { f.database.close(); }
});
test('a small device clock correction cannot put stop before an already captured point', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('owner');
    const timestamp = Date.now() + 60000;
    await f.store.recordFix(trip, { ...fix(), timestamp }); await f.store.endTrip();
    const events = await f.store.pendingEvents('owner');
    assert.ok(Date.parse(events.at(-1)!.captured_at) >= timestamp);
  } finally { f.database.close(); }
});

test('server acknowledgement must exactly match the submitted batch, with capped retry delays', () => {
  const events = [{ event_id: 'one' }, { event_id: 'two' }] as types.TrackEvent[];
  assert.deepEqual(types.acknowledgedIds(events, { acknowledged: ['two', 'one'] }).sort(), ['one', 'two']);
  for (const acknowledged of [[], ['one'], ['one', 'one'], ['one', 'unexpected'], ['one', 'two', 'extra']]) {
    assert.throws(() => types.acknowledgedIds(events, { acknowledged }));
  }
  assert.throws(() => types.acknowledgedIds(events, {}));
  assert.ok(types.retryDelay(1) > 0); assert.ok(types.retryDelay(99) <= 300000);
  const session = { user: { company_id: 'one', user_id: 'employee' } } as Session;
  assert.notEqual(types.ownerKey(session, 'https://a/api'), types.ownerKey(session, 'https://b/api'));
  assert.notEqual(types.ownerKey(session, 'https://a/api'), types.ownerKey({ user: { company_id: 'two', user_id: 'employee' } } as Session, 'https://a/api'));
});

test('selected route includes more than 500 events without leaking another owner or session', async () => {
  const f = fixture();
  try {
    const trip = await f.store.beginTrip('owner');
    const insert = f.database.prepare('INSERT INTO tracking_events(owner,event_id,session_id,payload,stored_at) VALUES(?,?,?,?,?)');
    for (let index = 0; index < 610; index++) {
      const event = { event_id: `event-${index}`, session_id: trip.sessionId, device_id: trip.deviceId, kind: 'point', captured_at: trip.startedAt, latitude: 0, longitude: index / 10000, accuracy: 5 };
      insert.run('owner', event.event_id, trip.sessionId, JSON.stringify(event), Date.now());
    }
    insert.run('other', 'private', trip.sessionId, JSON.stringify({ event_id: 'private', session_id: trip.sessionId }), Date.now());
    const state = await f.store.snapshot('owner');
    assert.equal(state.events.length, 611); assert.equal(state.routeTruncated, false);
    assert.equal(state.events[0].kind, 'start');
    assert.ok(state.events.every(event => event.event_id !== 'private'));
    await f.store.endTrip();
    const next = await f.store.beginTrip('owner');
    assert.deepEqual((await f.store.snapshot('owner')).events.map(event => event.session_id), [next.sessionId]);
  } finally { f.database.close(); }
});
