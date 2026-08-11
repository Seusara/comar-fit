import { describe, expect, it } from 'vitest';
import { summarizeWorkouts, workoutMinutes } from './workoutStats';

describe('workout stats', () => {
  it('sums real exercise durations and supports legacy totals', () => {
    expect(workoutMinutes({ exercises: [{ durationMinutes: 8 }, { duration: 4 }] })).toBe(12);
    expect(workoutMinutes({ totalMinutes: 20, exercises: [{ durationMinutes: 8 }] })).toBe(20);
  });

  it('summarizes workouts, minutes and exercises', () => {
    expect(summarizeWorkouts([{ exercises: [{ durationMinutes: 10 }] }, { exercises: [{ durationMinutes: 5 }, { durationMinutes: 7 }] }]))
      .toEqual({ workouts: 2, minutes: 22, exercises: 3 });
  });
});
