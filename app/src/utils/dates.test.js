import { describe, it, expect } from 'vitest';

import {
  computeWeekBoundariesUTC,
  duelDayNumber,
  endOfCurrentDuelDay,
  formatWorkoutDate,
  isInDuelWeek,
  resolveDuelWeek,
  resolvePerformedAt,
  toDate,
} from './dates';

const WEEK_START = new Date('2026-07-27T00:00:00.000Z'); // Monday, UTC
const WEEK_END = new Date('2026-08-02T23:59:59.999Z'); // Sunday, UTC
const DUEL = { duelId: 'duel-1', weekStartDate: WEEK_START, weekEndDate: WEEK_END };

function timestamp(iso) {
  return { toDate: () => new Date(iso) };
}

describe('toDate', () => {
  it('returns null for missing or unparseable values', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('not a date')).toBeNull();
    expect(toDate(new Date('nope'))).toBeNull();
  });

  it('accepts Date, Firestore Timestamp, ISO string and epoch millis', () => {
    const iso = '2026-07-29T15:30:00.000Z';
    expect(toDate(new Date(iso)).toISOString()).toBe(iso);
    expect(toDate(timestamp(iso)).toISOString()).toBe(iso);
    expect(toDate(iso).toISOString()).toBe(iso);
    expect(toDate(Date.parse(iso)).toISOString()).toBe(iso);
  });

  it('anchors a bare YYYY-MM-DD at noon UTC so it never shifts a calendar day', () => {
    expect(toDate('2026-07-29').toISOString()).toBe('2026-07-29T12:00:00.000Z');
  });
});

describe('resolvePerformedAt / formatWorkoutDate', () => {
  it('prefers the real schema field but falls back to the stub one', () => {
    expect(resolvePerformedAt({ performedAt: timestamp('2026-07-29T18:00:00Z') }).toISOString()).toBe(
      '2026-07-29T18:00:00.000Z'
    );
    expect(resolvePerformedAt({ date: '2026-07-29' })).not.toBeNull();
    expect(resolvePerformedAt({})).toBeNull();
  });

  it('formats both shapes to the same day key and stays empty when unknown', () => {
    expect(formatWorkoutDate({ performedAt: timestamp('2026-07-29T18:00:00Z') })).toBe('2026-07-29');
    expect(formatWorkoutDate({ date: '2026-07-29' })).toBe('2026-07-29');
    expect(formatWorkoutDate({})).toBe('');
  });
});

describe('resolveDuelWeek', () => {
  it('uses the duel document boundaries when present', () => {
    const { weekStart, weekEnd } = resolveDuelWeek(DUEL, new Date('2026-07-29T12:00:00Z'));
    expect(weekStart.toISOString()).toBe(WEEK_START.toISOString());
    expect(weekEnd.toISOString()).toBe(WEEK_END.toISOString());
  });

  it('falls back to the same UTC week computation the duel was created with', () => {
    const now = new Date('2026-07-29T12:00:00Z');
    const { weekStart, weekEnd } = resolveDuelWeek(null, now);
    const expected = computeWeekBoundariesUTC(now);
    expect(weekStart.toISOString()).toBe(expected.weekStart.toISOString());
    expect(weekEnd.toISOString()).toBe(expected.weekEnd.toISOString());
  });

  it('accepts Firestore Timestamps, as the real duel document stores them', () => {
    const duel = {
      weekStartDate: timestamp(WEEK_START.toISOString()),
      weekEndDate: timestamp(WEEK_END.toISOString()),
    };
    expect(resolveDuelWeek(duel).weekStart.toISOString()).toBe(WEEK_START.toISOString());
  });
});

describe('duelDayNumber', () => {
  it('counts days from the duel week start, not the local day-of-week', () => {
    expect(duelDayNumber(DUEL, new Date('2026-07-27T00:00:00Z'))).toBe(1);
    expect(duelDayNumber(DUEL, new Date('2026-07-27T23:59:59Z'))).toBe(1);
    expect(duelDayNumber(DUEL, new Date('2026-07-29T12:00:00Z'))).toBe(3);
    expect(duelDayNumber(DUEL, new Date('2026-08-02T23:00:00Z'))).toBe(7);
  });

  it('clamps outside the week instead of producing Día 0 or Día 9', () => {
    expect(duelDayNumber(DUEL, new Date('2026-07-20T12:00:00Z'))).toBe(1);
    expect(duelDayNumber(DUEL, new Date('2026-08-10T12:00:00Z'))).toBe(7);
  });
});

describe('endOfCurrentDuelDay', () => {
  it('targets the end of the current duel day', () => {
    expect(endOfCurrentDuelDay(DUEL, new Date('2026-07-29T12:00:00Z')).toISOString()).toBe(
      '2026-07-30T00:00:00.000Z'
    );
  });

  it('never targets past the end of the duel week', () => {
    expect(endOfCurrentDuelDay(DUEL, new Date('2026-08-02T22:00:00Z')).toISOString()).toBe(
      WEEK_END.toISOString()
    );
  });
});

describe('isInDuelWeek', () => {
  it('includes workouts inside the duel window and excludes the rest', () => {
    expect(isInDuelWeek({ performedAt: new Date('2026-07-29T12:00:00Z') }, DUEL)).toBe(true);
    expect(isInDuelWeek({ date: '2026-07-27' }, DUEL)).toBe(true);
    expect(isInDuelWeek({ performedAt: new Date('2026-07-26T23:59:59Z') }, DUEL)).toBe(false);
    expect(isInDuelWeek({ performedAt: new Date('2026-08-03T00:00:01Z') }, DUEL)).toBe(false);
    expect(isInDuelWeek({}, DUEL)).toBe(false);
  });
});
