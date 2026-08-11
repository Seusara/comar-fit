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

  const elapsedMinutes = Number.isFinite(Number(state.elapsedSeconds)) && Number(state.elapsedSeconds) > 0
    ? Math.max(state.exercises.length, Math.round(Number(state.elapsedSeconds) / 60))
    : null;
  const estimatedTotal = state.exercises.reduce((sum, exercise) => sum + Number(exercise.duration), 0);
  const actualDurations = elapsedMinutes
    ? state.exercises.map((exercise) => 1 + Math.floor(
      (elapsedMinutes - state.exercises.length) * (Number(exercise.duration) / estimatedTotal),
    ))
    : null;
  if (actualDurations) {
    const assigned = actualDurations.reduce((sum, value) => sum + value, 0);
    actualDurations[0] += elapsedMinutes - assigned;
  }

  return state.exercises.map((exercise, index) => {
    let durationMinutes = Number(exercise.duration);
    if (actualDurations) durationMinutes = actualDurations[index];
    return {
      exerciseId: exercise.name.trim(),
      name: exercise.name.trim(),
      sets: Number(exercise.sets),
      reps: Number(exercise.reps),
      durationMinutes,
      difficulty_feedback: null,
      feedback_timestamp: null,
    };
  });
}
