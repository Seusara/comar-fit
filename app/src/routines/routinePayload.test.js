import { describe, expect, it } from 'vitest';
import { routineExercisesFromLocationState } from './routinePayload';

describe('routine payload', () => {
  it('distributes real guided time across the completed exercises', () => {
    const result = routineExercisesFromLocationState({
      source: 'daily-routine',
      elapsedSeconds: 1200,
      exercises: [
        { name: 'Flexiones', sets: 3, reps: 10, duration: 6 },
        { name: 'Sentadillas', sets: 3, reps: 12, duration: 4 },
      ],
    });
    expect(result.map((item) => item.durationMinutes).reduce((sum, value) => sum + value, 0)).toBe(20);
    expect(result.map((item) => item.name)).toEqual(['Flexiones', 'Sentadillas']);
  });
});
