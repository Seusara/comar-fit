export const ROUTINE_CATALOG_VERSION = 1;

export const ROUTINE_CATALOG = [
  { id: 'march', name: 'Marcha activa', phase: 'warmup', goals: ['general', 'resistencia', 'fuerza'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 20 },
  { id: 'arm-circles', name: 'Círculos de brazos', phase: 'warmup', goals: ['general', 'movilidad', 'fuerza'], minLevel: 0, equipment: 'bodyweight', minutes: 2, sets: 1, reps: 12, restSeconds: 15 },
  { id: 'hip-mobility', name: 'Movilidad de cadera', phase: 'warmup', goals: ['general', 'movilidad', 'resistencia'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 10, restSeconds: 15 },
  { id: 'jumping-jacks', name: 'Saltos de tijera', phase: 'warmup', goals: ['resistencia', 'general'], minLevel: 1, equipment: 'bodyweight', minutes: 3, sets: 2, reps: 20, restSeconds: 20 },

  { id: 'pushups', name: 'Flexiones', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 10, restSeconds: 60 },
  { id: 'squats', name: 'Sentadillas', phase: 'main', goals: ['fuerza', 'resistencia', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 15, restSeconds: 60 },
  { id: 'glute-bridge', name: 'Puente de glúteo', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 45 },
  { id: 'plank', name: 'Plancha', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 1, restSeconds: 45 },
  { id: 'mountain-climbers', name: 'Escaladores', phase: 'main', goals: ['resistencia', 'general'], minLevel: 1, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 20, restSeconds: 40 },
  { id: 'burpees', name: 'Burpees', phase: 'main', goals: ['resistencia', 'general'], minLevel: 1, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 8, restSeconds: 60 },
  { id: 'backpack-row', name: 'Remo con mochila', phase: 'main', goals: ['fuerza'], minLevel: 0, equipment: 'Mochila', minutes: 5, sets: 3, reps: 12, restSeconds: 60 },
  { id: 'backpack-deadlift', name: 'Peso muerto con mochila', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'Mochila', minutes: 5, sets: 3, reps: 12, restSeconds: 60 },
  { id: 'band-row', name: 'Remo con banda', phase: 'main', goals: ['fuerza'], minLevel: 0, equipment: 'Bandas', minutes: 5, sets: 3, reps: 12, restSeconds: 60 },
  { id: 'dumbbell-press', name: 'Press con mancuernas', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'Mancuernas', minutes: 5, sets: 3, reps: 10, restSeconds: 60 },

  { id: 'full-stretch', name: 'Estiramiento general', phase: 'recovery', goals: ['general', 'fuerza', 'resistencia', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 0 },
  { id: 'breathing', name: 'Respiración controlada', phase: 'recovery', goals: ['general', 'fuerza', 'resistencia', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 0 },
  { id: 'leg-stretch', name: 'Estiramiento de piernas', phase: 'recovery', goals: ['fuerza', 'resistencia', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 0 },
];

// Exercise form references and tips (Phase 3.1)
// Map exercise names to their form reference data for technique videos and tips
const EXERCISE_REFERENCES = {
  'Flexiones': {
    formReferenceUrl: 'https://www.youtube.com/embed/IODxDxX7oi4',
    formReferenceType: 'youtube',
    tips: ['Elbows at 45 degrees', 'Keep core tight', 'Full range of motion']
  },
  'Sentadillas': {
    formReferenceUrl: 'https://www.youtube.com/embed/Soa3qhHJO6s',
    formReferenceType: 'youtube',
    tips: ['Knees aligned with toes', 'Keep chest up', 'Full depth squat']
  },
  'Burpees': {
    formReferenceUrl: 'https://www.youtube.com/embed/JZQA7VJpgmI',
    formReferenceType: 'youtube',
    tips: ['Controlled plank position', 'Explosive jump', 'Full body engagement']
  },
  'Escaladores': {
    formReferenceUrl: 'https://www.youtube.com/embed/nmwgirgXLYM',
    formReferenceType: 'youtube',
    tips: ['Fast controlled movement', 'Hip alignment', 'Core engaged']
  },
  'Plancha': {
    formReferenceUrl: 'https://www.youtube.com/embed/pSHjTRCQxIw',
    formReferenceType: 'youtube',
    tips: ['Neutral spine', 'Shoulders over wrists', 'Engage core']
  },
  'Puente de glúteo': {
    formReferenceUrl: 'https://www.youtube.com/embed/wPM8icPu4WM',
    formReferenceType: 'youtube',
    tips: ['Glutes at top', 'Full hip extension', 'Squeeze at peak']
  },
};

/**
 * Find exercise reference data (form video URL + tips) by exercise name.
 * Returns null if no reference exists for the exercise.
 * @param {string} exerciseName - Display name of the exercise
 * @returns {Object|null} Reference data with formReferenceUrl, formReferenceType, tips
 */
export function findExerciseReference(exerciseName) {
  return EXERCISE_REFERENCES[exerciseName] || null;
}
