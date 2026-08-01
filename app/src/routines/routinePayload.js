import { ROUTINE_CATALOG } from './catalog.js';

const LIMITS = { sets: 20, reps: 500, duration: 300, exercises: 20, nameLength: 80 };
const ROUTINE_NAMES = new Set(ROUTINE_CATALOG.map((exercise) => exercise.name));

function positiveNumber(value, maximum, integer = false) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 && number <= maximum && (!integer || Number.isInteger(number));
}

export function routineExercisesFromLocationState(state) {
  if (state?.source !== 'daily-routine' || !Array.isArray(state.exercises)) return null;
  if (state.exercises.length < 1 || state.exercises.length > LIMITS.exercises) return null;

  const valid = state.exercises.every((exercise) => (
    typeof exercise?.name === 'string' && exercise.name.trim().length > 0 &&
    exercise.name.trim().length <= LIMITS.nameLength && ROUTINE_NAMES.has(exercise.name.trim()) &&
    positiveNumber(exercise.sets, LIMITS.sets, true) &&
    positiveNumber(exercise.reps, LIMITS.reps, true) &&
    positiveNumber(exercise.duration, LIMITS.duration)
  ));
  if (!valid) return null;

  return state.exercises.map((exercise) => ({
    exerciseId: exercise.name.trim(),
    name: exercise.name.trim(),
    sets: Number(exercise.sets),
    reps: Number(exercise.reps),
    durationMinutes: Number(exercise.duration),
    difficulty_feedback: null,
    feedback_timestamp: null,
  }));
}
