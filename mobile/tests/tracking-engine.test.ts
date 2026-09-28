import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as types from '../src/tracking/types';
import { describeTracking } from '../src/tracking/status';
import type { Session } from '../src/api/types';

const session = { user: { company_id: 'company', user_id: 'employee', role: 'sales' } } as Session;
const owner = types.ownerKey(session, 'https://crm.test/api');
class TrackingBuildError extends Error {}
function fixture() {
  const state = {
    foreground: true, permission: true, services: true, registered: false, nativeRunning: false,
    setup: 0, started: 0, stopped: 0, exists: true, error: '', serviceError: '', oldBinary: false, grantOnSetup: false,
    active: null as types.ActiveTrip | null, events: [] as types.TrackEvent[],
    wait: async () => {},
  };
  const cancelled = () => { if (!state.foreground) throw new Error('App not active'); };
  const access = async () => ({ foreground: state.permission, background: state.permission, ready: state.permission, services: state.services });
  const store = {
    snapshot: async () => ({ active: state.active, events: [...state.events], pending: state.events.length, error: state.error }),
    beginTrip: async () => {
      state.active = { owner, sessionId: 'trip', deviceId: 'device', startedAt: new Date().toISOString() };
      state.events.push({ event_id: 'start', session_id: 'trip', device_id: 'device', kind: 'start', captured_at: state.active.startedAt });
      return state.active;
    },
    endTrip: async () => {
      if (state.active) state.events.push({ event_id: 'stop', session_id: 'trip', device_id: 'device', kind: 'stop', captured_at: new Date().toISOString() });
      state.active = null;
    },
    setTrackingError: async (_owner: string, error: string) => { state.error = error; },
    getActive: async () => state.active,
  };
  const modules: Record<string, unknown> = {
    'expo-location': {
      Accuracy: { High: 4 },
      hasStartedLocationUpdatesAsync: async () => state.registered,
      startLocationUpdatesAsync: async () => { state.started++; state.registered = true; },
      stopLocationUpdatesAsync: async () => { state.stopped++; state.registered = false; state.nativeRunning = false; },
    },
    'expo-task-manager': { isAvailableAsync: async () => true },
    '../api/runtime': { API_BASE: 'https://crm.test/api' }, './types': types, './store': store,
    './database': { trackingStoreExists: async () => state.exists }, './sync': {}, './status': { describeTracking },
    './permissions': { trackingAccess: access, requireActiveApp: cancelled, setupTrackingPermissions: async () => {
      state.setup++; if (state.grantOnSetup) state.permission = true;
      if (!state.permission) throw new Error('Location not allowed');
    } },
    './nativeService': {
      TrackingBuildError,
      nativeServiceHealth: async () => { if (state.oldBinary) throw new TrackingBuildError('Install new APK'); return { running: state.nativeRunning, error: state.serviceError }; },
      waitForNativeService: async (check: () => void) => { await state.wait(); check(); if (state.serviceError) throw new Error(state.serviceError); state.nativeRunning = true; },
    },
  };
  const code = ts.transpileModule(readFileSync('src/tracking/engine.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${code}\n})`)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected engine import: ${name}`);
    return modules[name];
  }, module, module.exports);
  return { state, engine: module.exports as typeof import('../src/tracking/engine') };
}

test('Start requests missing permissions and records only after they are granted', async () => {
  const { state, engine } = fixture();
  await engine.prepareTracking(); assert.equal(state.setup, 1); assert.equal(state.events.length, 0); assert.equal(state.started, 0);
  state.permission = false;
  await assert.rejects(engine.startTracking(session), /not allowed/);
  assert.equal(state.setup, 2); assert.equal(state.events.length, 0);
  state.grantOnSetup = true;
  await engine.startTracking(session);
  assert.equal(state.started, 1); assert.equal(state.setup, 3);
  assert.equal((await engine.trackingState(session)).status, 'waiting_gps');
});

test('missing native method retains queue/status instead of leaving the screen checking forever', async () => {
  const { state, engine } = fixture();
  await engine.startTracking(session);
  state.oldBinary = true;
  const result = await engine.trackingState(session);
  assert.equal(result.status, 'update_required'); assert.equal(result.running, false);
  assert.equal(result.pending, 1); assert.equal(result.active?.sessionId, 'trip');
  assert.match(result.serviceError || '', /new APK/);
  await engine.stopTracking(); assert.equal(state.events.length, 2);
});

test('inactive app, old APK and disabled location do not create a trip', async () => {
  for (const mode of ['background', 'old', 'disabled']) {
    const { state, engine } = fixture();
    state.foreground = mode !== 'background'; state.oldBinary = mode === 'old'; state.services = mode !== 'disabled';
    await assert.rejects(engine.startTracking(session));
    assert.equal(state.events.length, 0); assert.equal(state.started, 0);
  }
});

test('native startup failure stops collection, closes trip and retains pending events', async () => {
  const { state, engine } = fixture(); state.serviceError = 'SecurityException: start rejected';
  await assert.rejects(engine.startTracking(session), /SecurityException/);
  assert.equal(state.active, null); assert.equal(state.registered, false);
  assert.deepEqual(state.events.map(event => event.kind), ['start', 'stop']);
  assert.match(state.error, /SecurityException/);
});

test('permission revoked / GPS off on resume stops recording without deleting pending data', async () => {
  for (const mode of ['revoked', 'gps-off']) {
    const { state, engine } = fixture();
    await engine.startTracking(session);
    state.permission = mode !== 'revoked'; state.services = mode !== 'gps-off';
    const result = await engine.trackingState(session);
    assert.equal(result.status, mode === 'revoked' ? 'permission_required' : 'location_off');
    assert.equal(result.running, false); assert.equal(result.active, null);
    assert.deepEqual(state.events.map(event => event.kind), ['start', 'stop']);
    state.permission = true; state.services = true;
    assert.equal((await engine.trackingState(session)).status, 'off');
    assert.equal(state.started, 1); // Re-granting permission never auto-restarts.
  }
});

test('Stop/sign-out wins against an in-flight start', async () => {
  const { state, engine } = fixture();
  let entered!: () => void, release!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  state.wait = () => { entered(); return new Promise<void>(resolve => { release = resolve; }); };
  const starting = engine.startTracking(session);
  await waiting;
  await engine.stopTracking('Signed out'); release();
  await assert.rejects(starting, /cancelled/);
  assert.equal(state.registered, false); assert.equal(state.active, null);
  assert.deepEqual(state.events.map(event => event.kind), ['start', 'stop']);
});
