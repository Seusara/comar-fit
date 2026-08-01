import { describe, expect, it } from 'vitest';
import { compareActiveDays, deriveParticipantActivity } from './activeDays';

const duel = {
  weekStartDate: new Date('2026-07-27T06:00:00.000Z'),
  weekEndDate: new Date('2026-08-03T05:59:59.999Z'),
};

describe('deriveParticipantActivity', () => {
  it('counts duplicate workouts on the same Mexico City date once', () => {
    const workouts = [
      { userId: 'a', performedAt: new Date('2026-07-28T03:30:00Z') },
      { userId: 'a', performedAt: new Date('2026-07-28T04:30:00Z') },
      { userId: 'b', performedAt: new Date('2026-07-28T04:30:00Z') },
    ];

    expect(deriveParticipantActivity(workouts, 'a', duel, new Date('2026-07-29T12:00:00Z')))
      .toMatchObject({ activeDays: 1, percentage: 14 });
  });

  it('excludes workouts outside the duel week and calculates a streak ending today', () => {
    const workouts = [
      { userId: 'a', performedAt: new Date('2026-07-27T15:00:00Z') },
      { userId: 'a', performedAt: new Date('2026-07-28T15:00:00Z') },
      { userId: 'a', performedAt: new Date('2026-07-20T15:00:00Z') },
    ];

    expect(deriveParticipantActivity(workouts, 'a', duel, new Date('2026-07-28T18:00:00Z')))
      .toMatchObject({ activeDays: 2, percentage: 29, streak: 2 });
  });

  it('continues a streak from yesterday and ignores invalid dates', () => {
    const workouts = [
      { userId: 'a', performedAt: new Date('2026-07-27T15:00:00Z') },
      { userId: 'a', performedAt: new Date('2026-07-28T15:00:00Z') },
      { userId: 'a', performedAt: 'not-a-date' },
    ];

    expect(deriveParticipantActivity(workouts, 'a', duel, new Date('2026-07-29T18:00:00Z')).streak)
      .toBe(2);
  });
});

describe('compareActiveDays', () => {
  it.each([
    [3, 2, 'ahead'],
    [2, 3, 'behind'],
    [2, 2, 'tied'],
  ])('compares %s and %s as %s', (mine, rival, expected) => {
    expect(compareActiveDays(mine, rival)).toBe(expected);
  });
});
