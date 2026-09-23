import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeTracking } from '../src/tracking/status';
import type { TrackState } from '../src/tracking/types';

const now = Date.now();
const access = { foreground: true, background: true, services: true, ready: true };
const base: TrackState = { active: { sessionId: 'trip', owner: 'owner', deviceId: 'device', startedAt: new Date(now - 10000).toISOString() }, pending: 1, error: '', events: [] };

test('registered task/start event alone never claims GPS recording', () => {
  const state = { ...base, events: [{ event_id: 'start', session_id: 'trip', device_id: 'device', kind: 'start' as const, captured_at: new Date(now).toISOString() }] };
  assert.equal(describeTracking(state, access, true).status, 'waiting_gps');
  assert.equal(describeTracking(state, access, false).status, 'interrupted');
});

test('permission revocation and disabled GPS override native registration', () => {
  for (const background of [false, true]) {
    const result = describeTracking(base, { ...access, foreground: false, background, ready: false }, true);
    assert.equal(result.status, 'permission_required'); assert.equal(result.running, false);
  }
  assert.equal(describeTracking(base, { ...access, services: false }, true).status, 'location_off');
});

test('recording requires current-session GPS and stale GPS is explicitly shown', () => {
  const point = { event_id: 'fix', session_id: 'trip', device_id: 'device', kind: 'point' as const, captured_at: new Date(now).toISOString() };
  assert.equal(describeTracking({ ...base, events: [point] }, access, true, now).status, 'recording');
  assert.equal(describeTracking({ ...base, events: [point] }, access, true, now + 180001).status, 'gps_idle');
  assert.equal(describeTracking({ ...base, events: [{ ...point, session_id: 'old-trip' }] }, access, true, now).status, 'waiting_gps');
  assert.equal(describeTracking({ ...base, active: null, events: [point] }, access, true, now).status, 'off');
});
