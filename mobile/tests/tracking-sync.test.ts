import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as client from '../src/api/client';
import * as types from '../src/tracking/types';
import type { Session } from '../src/api/types';
const session = { token: 'test-token', user: { company_id: 'c1', user_id: 'u1', role: 'sales' } } as Session;
function fixture() {
  const state = { events: [{ event_id: 'event-one' }] as types.TrackEvent[], requests: [] as any[], acknowledged: [] as string[], error: '', result: { data: { acknowledged: ['event-one'] } } as any, failure: null as Error | null, exists: true };
  const output = ts.transpileModule(readFileSync('src/tracking/sync.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name: string) => {
    if (name === '../api/client') return { ...client, createApiClient: () => async (...args: any[]) => { state.requests.push(args); if (state.failure) throw state.failure; return state.result; } };
    if (name === '../api/runtime') return { API_BASE: 'https://crm.example.test/api' };
    if (name === '../auth/offlineSession') return { loadOfflineSession: async () => session };
    if (name === './database') return { trackingStoreExists: async () => state.exists };
    if (name === './types') return types;
    if (name === './store') return {
      pendingEvents: async (owner: string) => { assert.equal(owner, types.ownerKey(session, 'https://crm.example.test/api')); return state.events; },
      acknowledge: async (_owner: string, ids: string[]) => { state.acknowledged.push(...ids); state.events = []; },
      setTrackingError: async (_owner: string, error: string) => { state.error = error; },
    };
    throw new Error(`Unexpected sync import: ${name}`);
  };
  runInThisContext(`(function(require,module,exports,__DEV__){${output}\n})`)(localRequire, module, module.exports, false);
  return { state, sync: (module.exports as typeof import('../src/tracking/sync')).syncTracking };
}
test('sync authenticates as current employee and acknowledges only the server-confirmed batch', async () => {
  const { state, sync } = fixture();
  await Promise.all([sync(session), sync(session)]);
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0][0], '/field-tracking/sync'); assert.equal(state.requests[0][1], session.token);
  assert.deepEqual(Object.keys(state.requests[0][2]), ['events']);
  assert.deepEqual(state.acknowledged, ['event-one']); assert.equal(state.error, '');
});
test('offline failures retain every event; automatic backoff and explicit retry work', async () => {
  const { state, sync } = fixture(); state.failure = new client.ApiError('Offline');
  await assert.rejects(sync(session), /Pending locations remain/);
  assert.deepEqual(state.acknowledged, []); assert.equal(state.events.length, 1);
  state.failure = null;
  await sync(session); assert.equal(state.requests.length, 1);
  await sync(session, true); assert.equal(state.requests.length, 2); assert.deepEqual(state.acknowledged, ['event-one']);
});
test('partial acknowledgement and rejected authentication never remove pending locations', async () => {
  for (const mode of ['partial', 'unauthorized']) {
    const { state, sync } = fixture();
    if (mode === 'partial') state.result = { data: { acknowledged: [] } };
    else state.failure = new client.ApiError('Expired', 401);
    await assert.rejects(sync(session));
    assert.deepEqual(state.acknowledged, []); assert.equal(state.events.length, 1);
    assert.match(state.error, mode === 'partial' ? /incomplete/ : /same sales account/);
  }
});
test('an employee who never used tracking does not open a queue or issue an upload', async () => {
  const { state, sync } = fixture(); state.exists = false;
  await sync(session); assert.equal(state.requests.length, 0);
});
