import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromIst, istParts } from '../src/ui/dates';

test('IST scheduling sends an unambiguous UTC timestamp independent of device timezone', () => {
  assert.equal(fromIst(2026, 8, 23, 10, 0), '2026-09-23T04:30:00.000Z');
  assert.deepEqual(istParts('2026-09-23T04:30:00.000Z'), { year: 2026, month: 8, day: 23, hour: 10, minute: 0 });
  assert.equal(fromIst(2026, 0, 1, 0, 5), '2025-12-31T18:35:00.000Z');
});
test('calendar rejects invalid dates and times instead of silently changing them', () => {
  for (const args of [[2026, 1, 30, 10, 0], [2026, 8, 23, 24, 0], [2026, 8, 23, 10, 60], [2026, 8, 23, NaN, 0]]) {
    assert.throws(() => fromIst(args[0], args[1], args[2], args[3], args[4]));
  }
});
