import { EXERCISES } from '../data/exercises';

const LEVEL = { easy: 0, medium: 1, hard: 2 };

function catalogEntry(exercise) {
  return EXERCISES.find((item) => item.id === exercise?.catalogExerciseId || item.id === exercise?.id || item.name === exercise?.name);
}

export function substitutionOptions(exercise, usedNames = []) {
  const current = catalogEntry(exercise);
  if (!current) return [];
  return EXERCISES.filter((candidate) => (
    candidate.id !== current.id
    && candidate.equipment === 'bodyweight'
    && !usedNames.includes(candidate.name)
    && (candidate.muscleGroup === current.muscleGroup
      || candidate.secondaryMuscles.includes(current.muscleGroup))
  )).sort((a, b) => {
    const samePatternA = a.substitutionGroup === current.substitutionGroup ? 0 : 1;
    const samePatternB = b.substitutionGroup === current.substitutionGroup ? 0 : 1;
    return samePatternA - samePatternB || Math.abs(LEVEL[a.difficulty] - LEVEL[current.difficulty]) - Math.abs(LEVEL[b.difficulty] - LEVEL[current.difficulty]);
  });
}

export function replaceExercise(exercise, replacement) {
  return {
    ...exercise,
    catalogExerciseId: replacement.id,
    name: replacement.name,
    difficulty: replacement.difficulty,
    substitutionGroup: replacement.substitutionGroup,
    reps: replacement.type === 'duration' ? null : exercise.reps,
    durationSeconds: replacement.type === 'duration' ? (exercise.durationSeconds ?? 30) : null,
  };
}

export function adaptExerciseVolume(exercise, mode = 'normal') {
  if (mode === 'normal') return exercise;
  const factor = mode === 'short' ? 0.65 : 0.8;
  return {
    ...exercise,
    sets: Math.max(1, (Number(exercise.sets) || 1) - 1),
    reps: Number.isFinite(exercise.reps) ? Math.max(5, Math.round(exercise.reps * factor)) : exercise.reps,
    durationSeconds: Number.isFinite(exercise.durationSeconds)
      ? Math.max(15, Math.round(exercise.durationSeconds * factor)) : exercise.durationSeconds,
  };
}
