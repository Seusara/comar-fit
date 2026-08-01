import { describe, expect, it } from 'vitest';
import {
  deriveWeeklyDuelHistory,
  endOfMexicoCityDay,
  weekDayNumber,
  weekStartKey,
} from './weeklyHistory';

const duel = {
  userA_uid: 'aaron',
  userB_uid: 'alexandra',
  createdAt: new Date('2026-07-20T18:00:00Z'),
};

describe('weekStartKey', () => {
  it('rolls from Sunday to Monday in Mexico City', () => {
    expect(weekStartKey(new Date('2026-08-03T05:30:00Z'))).toBe('2026-07-27');
    expect(weekStartKey(new Date('2026-08-03T06:30:00Z'))).toBe('2026-08-03');
  });

  it('returns null for invalid dates', () => {
    expect(weekStartKey('invalid')).toBeNull();
  });
});

describe('current Mexico City duel day', () => {
  it('numbers Monday through Sunday from 1 to 7', () => {
    expect(weekDayNumber(new Date('2026-08-03T06:30:00Z'))).toBe(1);
    expect(weekDayNumber(new Date('2026-08-10T05:30:00Z'))).toBe(7);
  });

  it('returns the next Mexico City midnight', () => {
    expect(endOfMexicoCityDay(new Date('2026-08-03T18:00:00Z')).toISOString())
      .toBe('2026-08-04T06:00:00.000Z');
  });
});

describe('deriveWeeklyDuelHistory', () => {
  it('counts duplicate workouts on one day once and determines the winner', () => {
    const workouts = [
      { userId: 'aaron', performedAt: new Date('2026-07-27T18:00:00Z') },
      { userId: 'aaron', performedAt: new Date('2026-07-27T20:00:00Z') },
      { userId: 'aaron', performedAt: new Date('2026-07-28T18:00:00Z') },
      { userId: 'alexandra', performedAt: new Date('2026-07-27T19:00:00Z') },
    ];

    const result = deriveWeeklyDuelHistory(workouts, duel, new Date('2026-08-03T18:00:00Z'));

    expect(result.currentWeek).toMatchObject({
      weekId: '2026-08-03',
      participantA: { activeDays: 0 },
      participantB: { activeDays: 0 },
      result: 'tied',
    });
    expect(result.completedWeeks[0]).toMatchObject({
      weekId: '2026-07-27',
      participantA: { activeDays: 2, dayKeys: ['2026-07-27', '2026-07-28'] },
      participantB: { activeDays: 1, dayKeys: ['2026-07-27'] },
      result: 'participantA',
    });
  });

  it('identifies a participant B win', () => {
    const result = deriveWeeklyDuelHistory([
      { userId: 'aaron', performedAt: new Date('2026-07-27T18:00:00Z') },
      { userId: 'alexandra', performedAt: new Date('2026-07-27T19:00:00Z') },
      { userId: 'alexandra', performedAt: new Date('2026-07-28T19:00:00Z') },
    ], duel, new Date('2026-08-03T18:00:00Z'));

    expect(result.completedWeeks[0].result).toBe('participantB');
  });

  it('ignores invalid timestamps and includes empty completed weeks as ties', () => {
    const result = deriveWeeklyDuelHistory(
      [{ userId: 'aaron', performedAt: 'invalid' }],
      duel,
      new Date('2026-08-03T18:00:00Z'),
    );

    expect(result.completedWeeks.map((week) => week.weekId)).toEqual(['2026-07-27', '2026-07-20']);
    expect(result.completedWeeks.map((week) => week.result)).toEqual(['tied', 'tied']);
  });

  it('falls back to the oldest valid workout when the duel has no createdAt', () => {
    const result = deriveWeeklyDuelHistory([
      { userId: 'aaron', date: '2026-07-28' },
    ], { userA_uid: 'aaron', userB_uid: 'alexandra' }, new Date('2026-08-03T18:00:00Z'));

    expect(result.completedWeeks).toHaveLength(1);
    expect(result.completedWeeks[0].weekId).toBe('2026-07-27');
  });
});
