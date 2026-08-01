import test from 'node:test';
import assert from 'node:assert/strict';
import { routineDayKey } from './routineDay.js';

test('uses the duel timezone and falls back to Mexico City', () => {
  const instant = new Date('2026-08-01T00:30:00Z');
  assert.equal(routineDayKey(instant, 'Asia/Tokyo'), '2026-08-01');
  assert.equal(routineDayKey(instant, 'America/Mexico_City'), '2026-07-31');
  assert.equal(routineDayKey(instant, 'Invalid/Timezone'), '2026-07-31');
});
