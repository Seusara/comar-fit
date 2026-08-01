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
    formReferenceUrl: 'https://www.youtube.com/embed/5HL5WY0WVJQ',
    formReferenceType: 'youtube',
    tips: ['Codos a 45 grados', 'Core apretado', 'Rango completo de movimiento']
  },
  'Sentadillas': {
    formReferenceUrl: 'https://www.youtube.com/embed/qsAkuNORgmk',
    formReferenceType: 'youtube',
    tips: ['Rodillas alineadas con tobillos', 'Pecho arriba', 'Profundidad completa']
  },
  'Abdominales': {
    formReferenceUrl: 'https://www.youtube.com/embed/jSv7X4YHT3w',
    formReferenceType: 'youtube',
    tips: ['Baja lento y controlado', 'No jales el cuello', 'Exhala al subir']
  },
  'Burpees': {
    formReferenceUrl: 'https://www.youtube.com/embed/IYusabTdFEo',
    formReferenceType: 'youtube',
    tips: ['Posición de plancha controlada', 'Salto explosivo', 'Cuerpo completo']
  },
  'Escaladores': {
    formReferenceUrl: 'https://www.youtube.com/embed/FPLXxBxYcmE',
    formReferenceType: 'youtube',
    tips: ['Movimiento rápido controlado', 'Caderas alineadas', 'Core activado']
  },
  'Fondos de tríceps': {
    formReferenceUrl: 'https://www.youtube.com/embed/bR9d6yRH3iA',
    formReferenceType: 'youtube',
    tips: ['Codos hacia atrás', 'Baja controlado', 'No bloquees los codos arriba']
  },
  'Sentadillas con pistola': {
    formReferenceUrl: 'https://www.youtube.com/embed/XZR_jZ6L67U',
    formReferenceType: 'youtube',
    tips: ['Balance en una pierna', 'Baja lento', 'Usa apoyo si es necesario']
  },
  'Lagartijas con palmadas': {
    formReferenceUrl: 'https://www.youtube.com/embed/TfEDoyuEmuc',
    formReferenceType: 'youtube',
    tips: ['Explosividad controlada', 'Aterriza suave', 'Mantén el core firme']
  },
  'Sentadillas búlgaras': {
    formReferenceUrl: 'https://www.youtube.com/embed/6d6HlPWgAUs',
    formReferenceType: 'youtube',
    tips: ['Pie trasero elevado', 'Rodilla delantera alineada', 'Baja controlado']
  },
  'Plancha': {
    formReferenceUrl: 'https://www.youtube.com/embed/AD1YG9b88bk',
    formReferenceType: 'youtube',
    tips: ['Columna neutra', 'Hombros sobre muñecas', 'Core contraído']
  },
  'Planchas laterales': {
    formReferenceUrl: 'https://www.youtube.com/embed/zfiOU4yxLKo',
    formReferenceType: 'youtube',
    tips: ['Cadera alineada', 'Hombro sobre codo', 'No dejes caer la cadera']
  },
  'Marcha activa': {
    formReferenceUrl: 'https://www.youtube.com/embed/jzA7WzdW524',
    formReferenceType: 'youtube',
    tips: ['Rodillas altas', 'Ritmo constante', 'Brazos activos']
  },
  'Círculos de brazos': {
    formReferenceUrl: 'https://www.youtube.com/embed/YTueIW_xapc',
    formReferenceType: 'youtube',
    tips: ['Movimiento amplio y controlado', 'Ambas direcciones', 'Hombros relajados']
  },
  'Movilidad de cadera': {
    formReferenceUrl: 'https://www.youtube.com/embed/v-M4sixNiio',
    formReferenceType: 'youtube',
    tips: ['Movimiento lento y controlado', 'Rango completo', 'Respira profundo']
  },
  'Saltos de tijera': {
    formReferenceUrl: 'https://www.youtube.com/embed/CcSADh4EbXc',
    formReferenceType: 'youtube',
    tips: ['Aterriza suave', 'Brazos y piernas sincronizados', 'Ritmo constante']
  },
  'Puente de glúteo': {
    formReferenceUrl: 'https://www.youtube.com/embed/Y572Gf2v4ZI',
    formReferenceType: 'youtube',
    tips: ['Glúteos en la parte superior', 'Extensión de cadera completa', 'Aprieta al pico']
  },
  'Remo con mochila': {
    formReferenceUrl: 'https://www.youtube.com/embed/3glCe1wl4_w',
    formReferenceType: 'youtube',
    tips: ['Espalda recta', 'Jala con codos', 'Aprieta omóplatos']
  },
  'Peso muerto con mochila': {
    formReferenceUrl: 'https://www.youtube.com/embed/eEFw05wsO9s',
    formReferenceType: 'youtube',
    tips: ['Espalda neutra', 'Cadera hacia atrás', 'Peso cerca del cuerpo']
  },
  'Remo con banda': {
    formReferenceUrl: 'https://www.youtube.com/embed/zqRiAFTcjCc',
    formReferenceType: 'youtube',
    tips: ['Postura estable', 'Jala hacia el abdomen', 'Controla el regreso']
  },
  'Press con mancuernas': {
    formReferenceUrl: 'https://www.youtube.com/embed/97gthxw02QY',
    formReferenceType: 'youtube',
    tips: ['Muñecas firmes', 'Empuja recto hacia arriba', 'Controla la bajada']
  },
  'Estiramiento general': {
    formReferenceUrl: 'https://www.youtube.com/embed/pDQ8M4T62NE',
    formReferenceType: 'youtube',
    tips: ['Sin rebotes', 'Respira profundo', 'Mantén cada postura 20-30s']
  },
  'Respiración controlada': {
    formReferenceUrl: 'https://www.youtube.com/embed/TuPaMCsnxes',
    formReferenceType: 'youtube',
    tips: ['Inhala por la nariz', 'Exhala lento por la boca', 'Relaja los hombros']
  },
  'Estiramiento de piernas': {
    formReferenceUrl: 'https://www.youtube.com/embed/txsha7BIlDo',
    formReferenceType: 'youtube',
    tips: ['Sin rebotes', 'Mantén la postura', 'Respira y relaja']
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
