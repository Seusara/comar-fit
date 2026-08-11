import { describe, expect, it } from 'vitest';
import { adaptExerciseVolume, replaceExercise, substitutionOptions } from './sessionAdaptation';

describe('session adaptation', () => {
  it('offers bodyweight replacements that still train the target muscle', () => {
    const options = substitutionOptions({ id: 'pushups', name: 'Flexiones' });
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((item) => item.equipment === 'bodyweight')).toBe(true);
    expect(options.every((item) => item.muscleGroup === 'chest' || item.secondaryMuscles.includes('chest'))).toBe(true);
  });

  it('keeps the progress id when replacing an exercise', () => {
    const original = { id: 'pushups', name: 'Flexiones', sets: 3, reps: 12 };
    const replacement = substitutionOptions(original)[0];
    expect(replaceExercise(original, replacement)).toMatchObject({ id: 'pushups', name: replacement.name, catalogExerciseId: replacement.id });
  });

  it('reduces volume without removing the exercise', () => {
    expect(adaptExerciseVolume({ id: 'squat', sets: 4, reps: 20 }, 'short')).toMatchObject({ id: 'squat', sets: 3, reps: 13 });
  });
});
