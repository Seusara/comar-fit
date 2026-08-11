import { describe, expect, it } from 'vitest';
import EXERCISES from '../data/exercises';
import {
  buildPlanDays,
  exerciseCountForProfile,
  exerciseMatchesFocus,
  expandFocusToMuscleGroup,
} from './plans';

const exerciseById = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]));
const workoutDays = (days) => Object.values(days).filter((day) => day.type === 'workout');

describe('deterministic weekly plan generation', () => {
  it('generates at least 4 and never more than 6 exercises on normal workout days', () => {
    for (const profile of [
      { gender: 'M', experienceLevel: 'Beginner' },
      { gender: 'M', experienceLevel: 'Intermediate' },
      { gender: 'F', experienceLevel: 'Advanced', previousWeekCompletion: 100 },
    ]) {
      for (const day of workoutDays(buildPlanDays('quantity-seed', profile))) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(4);
        expect(day.exercises.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it('uses difficulty and previous completion to choose workout volume', () => {
    expect(exerciseCountForProfile({ experienceLevel: 'Beginner' })).toBe(4);
    expect(exerciseCountForProfile({ experienceLevel: 'Intermediate' })).toBe(5);
    expect(exerciseCountForProfile({ experienceLevel: 'Advanced', previousWeekCompletion: 79 })).toBe(5);
    expect(exerciseCountForProfile({ experienceLevel: 'Advanced', previousWeekCompletion: 80 })).toBe(6);
  });

  it('generates zero exercises on rest days', () => {
    const days = buildPlanDays('rest-seed', { gender: 'M', experienceLevel: 'Intermediate' });
    for (const day of Object.values(days).filter((item) => item.type === 'rest')) {
      expect(day.exercises ?? []).toHaveLength(0);
    }
  });

  it('produces the same plan from the same seed and profile', () => {
    const profile = { gender: 'F', experienceLevel: 'Intermediate' };
    expect(buildPlanDays('repeatable-seed', profile)).toEqual(buildPlanDays('repeatable-seed', profile));
  });

  it('selects exercises that correspond to the muscle focus of each day', () => {
    const days = buildPlanDays('focus-seed', { gender: 'M', experienceLevel: 'Advanced', previousWeekCompletion: 100 });
    for (const day of workoutDays(days)) {
      const groups = expandFocusToMuscleGroup(day.focus);
      for (const selected of day.exercises) {
        const catalogExercise = exerciseById.get(selected.id);
        expect(catalogExercise).toBeTruthy();
        expect(
          exerciseMatchesFocus(catalogExercise, groups) || catalogExercise.muscleGroup === 'fullbody',
        ).toBe(true);
      }
    }
  });

  it('does not repeat an exercise within the same workout', () => {
    const days = buildPlanDays('unique-seed', { gender: 'F', experienceLevel: 'Advanced', previousWeekCompletion: 100 });
    for (const day of workoutDays(days)) {
      expect(new Set(day.exercises.map((exercise) => exercise.id)).size).toBe(day.exercises.length);
    }
  });
});
