import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoutineHistory, serializeRoutineHistory } from './routineHistory.js';

test('does not treat today routine as recent history on same-day reload', () => {
  const stored = serializeRoutineHistory('2026-08-01', ['pushups', 'squats']);
  assert.deepEqual(parseRoutineHistory(stored, '2026-08-01'), []);
});

test('uses the prior day exercise IDs to avoid repetition', () => {
  const stored = serializeRoutineHistory('2026-07-31', ['pushups', 'squats']);
  assert.deepEqual(parseRoutineHistory(stored, '2026-08-01'), ['pushups', 'squats']);
});

test('ignores malformed history', () => {
  assert.deepEqual(parseRoutineHistory('{broken', '2026-08-01'), []);
  assert.deepEqual(parseRoutineHistory(JSON.stringify({ dayKey: '2026-07-31', exerciseIds: [12] }), '2026-08-01'), []);
});
