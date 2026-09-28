import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoute, coordinate, mapSegments, metresBetween } from '../src/tracking/routeModel';
import type { TrackEvent } from '../src/tracking/types';

const point = (id: string, seconds: number, longitude: number, extra: Partial<TrackEvent> = {}): TrackEvent => ({
  event_id: id, session_id: 'trip', device_id: 'device', kind: 'point',
  captured_at: new Date(Date.UTC(2026, 8, 24) + seconds * 1000).toISOString(), latitude: 0, longitude, accuracy: 5, ...extra,
});
const start = point('start', 0, 0, { kind: 'start' });

test('full-session distance is chronological and numbered stops match the visit log', () => {
  const events = [start, point('a', 10, 0), point('b', 40, 0.001, { kind: 'reach', label: 'One' }), point('c', 70, 0.002, { kind: 'reach', label: 'Two' })];
  const route = buildRoute([...events].reverse(), 'trip');
  assert.ok(Math.abs(route.metres - 222.39) < 1);
  assert.deepEqual(route.stops.map(stop => [stop.number, stop.event.label]), [[1, 'One'], [2, 'Two']]);
  assert.equal(route.partial, false); assert.equal(route.segments.length, 1);
  assert.deepEqual(events[0], start); // Does not rewrite raw event data.
});

test('stationary noise is not counted and repeated IDs do not duplicate visits', () => {
  const stop = point('stop', 40, 0.00001, { kind: 'reach' });
  const route = buildRoute([start, point('a', 10, 0), stop, stop, point('noise', 70, -0.00001)]);
  assert.equal(route.metres, 0); assert.equal(route.stops.length, 1);
  assert.equal(route.segments[0].length, 1);
});

test('continuous stationary fixes do not create fake missing-GPS gaps', () => {
  const route = buildRoute([start, ...Array.from({ length: 30 }, (_, index) => point(`still-${index}`, 10 + index * 30, 0))]);
  assert.equal(route.metres, 0); assert.equal(route.gaps, 0); assert.equal(route.segments.length, 1);
});

test('bad, mocked and unrealistic points cannot inflate travelled distance', () => {
  const route = buildRoute([start, point('a', 10, 0), point('bad', 20, NaN),
    point('mock', 30, 1, { mocked: true }), point('weak', 40, 2, { accuracy: 500 }),
    point('b', 50, 0), point('teleport', 51, 10), point('c', 60, 0.001)]);
  assert.equal(route.metres, 0); assert.equal(route.rejected, 4);
  assert.equal(coordinate(point('bad', 0, 181)), undefined);
  assert.equal(coordinate(point('bad', 0, 0, { latitude: 91 })), undefined);
});

test('GPS gaps split the route instead of joining missing travel; other sessions are excluded', () => {
  const route = buildRoute([start, point('a', 10, 0), point('b', 40, 0.001), point('c', 500, 1),
    point('d', 530, 1.001), point('other', 560, 30, { session_id: 'other' })], 'trip');
  assert.ok(Math.abs(route.metres - 222.39) < 1);
  assert.equal(route.gaps, 1); assert.equal(route.segments.length, 2);
});

test('missing local start/capped history is labelled partial and empty GPS is not a measured zero', () => {
  assert.equal(buildRoute([point('a', 10, 0)]).partial, true);
  assert.equal(buildRoute([start], 'trip', true).partial, true);
  assert.equal(buildRoute([start]).fixes, 0);
});

test('display simplification leaves distance untouched and retains segment endpoints', () => {
  const points = Array.from({ length: 5000 }, (_, index) => ({ latitude: 0, longitude: index / 100000 }));
  const drawn = mapSegments([points, [points[0], points[1]]]);
  assert.ok(drawn[0].length < points.length);
  assert.deepEqual(drawn[0][0], points[0]); assert.deepEqual(drawn[0].at(-1), points.at(-1));
  assert.equal(drawn.length, 2);
  assert.ok(metresBetween({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }) < 225);
});
