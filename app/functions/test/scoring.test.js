import { describe, expect, it } from 'vitest';

import {
  calculateStreak,
  calculateWeeklyScore,
  deriveWorkoutMetrics,
  getWeekWindow,
} from '../src/scoring.js';

describe('deriveWorkoutMetrics', () => {
  it('calculates push-up calories from duration, MET, and body weight', () => {
    const metrics = deriveWorkoutMetrics([
      { exerciseId: 'pushups', durationMinutes: 30, sets: 4, reps: 10 },
    ], 80);

    expect(metrics).toEqual({
      minutes: 30,
      exerciseCount: 1,
      reps: 40,
      calories: 240,
    });
  });

  it('counts each exercise ID once while summing all its repetitions', () => {
    const metrics = deriveWorkoutMetrics([
      { exerciseId: 'pushups', durationMinutes: 10, sets: 3, reps: 10 },
      { exerciseId: 'pushups', durationMinutes: 15, sets: 2, reps: 12 },
      { exerciseId: 'squats', durationMinutes: 5, sets: 1, reps: 20 },
    ], 60);

    expect(metrics.exerciseCount).toBe(2);
    expect(metrics.reps).toBe(74);
    expect(metrics.minutes).toBe(30);
  });
});

describe('calculateWeeklyScore', () => {
  it('weights the four normalized male metrics and rounds only the final score', () => {
    const score = calculateWeeklyScore({
      minutes: 50,
      exerciseCount: 2,
      reps: 135,
      calories: 540,
    }, 'M');

    expect(score).toBe(69);
  });

  it('clamps scores to 100', () => {
    expect(calculateWeeklyScore({
      minutes: 100,
      exerciseCount: 10,
      reps: 300,
      calories: 600,
    }, 'F')).toBe(100);
  });

  it('clamps negative metric values to zero', () => {
    expect(calculateWeeklyScore({
      minutes: -1,
      exerciseCount: -1,
      reps: -1,
      calories: -1,
    }, 'M')).toBe(0);
  });
});

describe('getWeekWindow', () => {
  it('uses Mexico City Monday midnight boundaries for a Sunday instant', () => {
    const window = getWeekWindow('2026-08-03T04:59:59.999Z', 'America/Mexico_City');

    expect(window.start.toISO()).toBe('2026-07-27T00:00:00.000-06:00');
    expect(window.end.toISO()).toBe('2026-08-03T00:00:00.000-06:00');
  });

  it('advances the window at Monday midnight in Mexico City across a year boundary', () => {
    const window = getWeekWindow('2025-12-29T06:00:00.000Z', 'America/Mexico_City');

    expect(window.start.toISO()).toBe('2025-12-29T00:00:00.000-06:00');
    expect(window.end.toISO()).toBe('2026-01-05T00:00:00.000-06:00');
  });
});

describe('calculateStreak', () => {
  it('deduplicates local workout days and counts back from today when trained today', () => {
    const streak = calculateStreak([
      '2026-07-31T01:00:00.000-06:00',
      '2026-07-31T20:00:00.000-06:00',
      '2026-07-30T18:00:00.000-06:00',
      '2026-07-29T18:00:00.000-06:00',
    ], '2026-07-31T12:00:00.000-06:00');

    expect(streak).toBe(3);
  });

  it('counts from yesterday when no workout exists today', () => {
    const streak = calculateStreak([
      '2026-07-30T18:00:00.000-06:00',
      '2026-07-29T18:00:00.000-06:00',
    ], '2026-07-31T12:00:00.000-06:00');

    expect(streak).toBe(2);
  });

  it('stops at a missing local day', () => {
    const streak = calculateStreak([
      '2026-07-31T18:00:00.000-06:00',
      '2026-07-29T18:00:00.000-06:00',
    ], '2026-07-31T12:00:00.000-06:00');

    expect(streak).toBe(1);
  });
});
