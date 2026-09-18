export const ROUTINE_CATALOG_VERSION = 3;

export const ROUTINE_CATALOG = [
  { id: 'high-knees', name: 'Rodillas altas', phase: 'warmup', goals: ['general', 'resistencia', 'fuerza'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 20 },
  { id: 'arm-circles', name: 'Círculos de brazos', phase: 'warmup', goals: ['general', 'movilidad', 'fuerza'], minLevel: 0, equipment: 'bodyweight', minutes: 2, sets: 1, reps: 12, restSeconds: 15 },
  { id: 'leg-swings', name: 'Balanceos de pierna', phase: 'warmup', goals: ['general', 'movilidad', 'resistencia'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 10, restSeconds: 15 },
  { id: 'jumping-jacks', name: 'Saltos de tijera', phase: 'warmup', goals: ['resistencia', 'general'], minLevel: 1, equipment: 'bodyweight', minutes: 3, sets: 2, reps: 20, restSeconds: 20 },

  { id: 'pushups', name: 'Flexiones', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 10, restSeconds: 60 },
  { id: 'incline-pushups', name: 'Flexiones inclinadas', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 45 },
  { id: 'knee-pushups', name: 'Flexiones con rodillas', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 45 },
  { id: 'diamond-pushups', name: 'Flexiones diamante', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 8, restSeconds: 60 },
  { id: 'pike-pushups', name: 'Flexiones pike', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 8, restSeconds: 60 },
  { id: 'shoulder-taps', name: 'Toques de hombro en plancha', phase: 'main', goals: ['fuerza', 'resistencia', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 16, restSeconds: 40 },
  { id: 'squats', name: 'Sentadillas', phase: 'main', goals: ['fuerza', 'resistencia', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 15, restSeconds: 60 },
  { id: 'curtsy-lunge', name: 'Zancada cruzada', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 10, restSeconds: 50 },
  { id: 'lateral-lunges', name: 'Zancadas laterales', phase: 'main', goals: ['fuerza', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 10, restSeconds: 50 },
  { id: 'cossack-squat', name: 'Sentadilla cosaca', phase: 'main', goals: ['fuerza'], minLevel: 0, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 10, restSeconds: 60 },
  { id: 'calf-raises', name: 'Elevaciones de pantorrilla', phase: 'main', goals: ['fuerza', 'resistencia'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 20, restSeconds: 35 },
  { id: 'wall-sit', name: 'Sentadilla en pared', phase: 'main', goals: ['fuerza', 'resistencia'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 1, restSeconds: 45 },
  { id: 'glute-bridge', name: 'Puente de glúteo', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 45 },
  { id: 'single-leg-bridge', name: 'Puente de glúteo a una pierna', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 10, restSeconds: 50 },
  { id: 'donkey-kicks', name: 'Patadas de glúteo', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 40 },
  { id: 'fire-hydrants', name: 'Abducciones en cuadrupedia', phase: 'main', goals: ['fuerza', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 40 },
  { id: 'plank', name: 'Plancha', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 1, restSeconds: 45 },
  { id: 'side-plank', name: 'Plancha lateral', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 1, restSeconds: 40 },
  { id: 'dead-bug', name: 'Dead bug', phase: 'main', goals: ['fuerza', 'movilidad', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 10, restSeconds: 35 },
  { id: 'bicycle-crunch', name: 'Abdominal bicicleta', phase: 'main', goals: ['fuerza', 'resistencia'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 16, restSeconds: 40 },
  { id: 'bird-dog', name: 'Bird dog', phase: 'main', goals: ['fuerza', 'movilidad', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 10, restSeconds: 35 },
  { id: 'superman', name: 'Superman', phase: 'main', goals: ['fuerza', 'general'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 40 },
  { id: 'reverse-snow-angels', name: 'Ángeles invertidos', phase: 'main', goals: ['fuerza', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 12, restSeconds: 40 },
  { id: 'mountain-climbers', name: 'Escaladores', phase: 'main', goals: ['resistencia', 'general'], minLevel: 1, equipment: 'bodyweight', minutes: 4, sets: 3, reps: 20, restSeconds: 40 },
  { id: 'burpees', name: 'Burpees', phase: 'main', goals: ['resistencia', 'general'], minLevel: 1, equipment: 'bodyweight', minutes: 5, sets: 3, reps: 8, restSeconds: 60 },
  { id: 'backpack-row', name: 'Remo con mochila', phase: 'main', goals: ['fuerza'], minLevel: 0, equipment: 'Mochila', minutes: 5, sets: 3, reps: 12, restSeconds: 60 },
  { id: 'backpack-deadlift', name: 'Peso muerto con mochila', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'Mochila', minutes: 5, sets: 3, reps: 12, restSeconds: 60 },
  { id: 'band-row', name: 'Remo con banda', phase: 'main', goals: ['fuerza'], minLevel: 0, equipment: 'Bandas', minutes: 5, sets: 3, reps: 12, restSeconds: 60 },
  { id: 'dumbbell-press', name: 'Press con mancuernas', phase: 'main', goals: ['fuerza'], minLevel: 1, equipment: 'Mancuernas', minutes: 5, sets: 3, reps: 10, restSeconds: 60 },

  { id: 'worlds-greatest-stretch', name: 'Estiramiento dinámico completo', phase: 'recovery', goals: ['general', 'fuerza', 'resistencia', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 0 },
  { id: 'breathing', name: 'Respiración controlada', phase: 'recovery', goals: ['general', 'fuerza', 'resistencia', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 0 },
  { id: 'hamstring-stretch', name: 'Estiramiento de isquiotibiales', phase: 'recovery', goals: ['fuerza', 'resistencia', 'movilidad'], minLevel: 0, equipment: 'bodyweight', minutes: 3, sets: 1, reps: 1, restSeconds: 0 },
];

// Exercise form references and tips (Phase 3.1)
// Map exercise names to their form reference data for technique videos and tips
const EXERCISE_REFERENCES = {
  'Flexiones': { formReferenceType: 'sprite', spriteSlug: 'push-up',
    tips: ['Codos a 45 grados', 'Core apretado', 'Rango completo de movimiento'] },
  'Sentadillas': { formReferenceType: 'sprite', spriteSlug: 'bodyweight-squat',
    tips: ['Rodillas alineadas con tobillos', 'Pecho arriba', 'Profundidad completa'] },
  'Abdominales': {
    formReferenceUrl: 'https://www.youtube.com/embed/jSv7X4YHT3w',
    formReferenceType: 'youtube',
    tips: ['Baja lento y controlado', 'No jales el cuello', 'Exhala al subir']
  },
  'Burpees': { formReferenceType: 'sprite', spriteSlug: 'burpee',
    tips: ['Posición de plancha controlada', 'Salto explosivo', 'Cuerpo completo'] },
  'Escaladores': { formReferenceType: 'sprite', spriteSlug: 'mountain-climber',
    tips: ['Movimiento rápido controlado', 'Caderas alineadas', 'Core activado'] },
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
  'Plancha': { formReferenceType: 'sprite', spriteSlug: 'plank',
    tips: ['Columna neutra', 'Hombros sobre muñecas', 'Core contraído'] },
  'Planchas laterales': {
    formReferenceUrl: 'https://www.youtube.com/embed/zfiOU4yxLKo',
    formReferenceType: 'youtube',
    tips: ['Cadera alineada', 'Hombro sobre codo', 'No dejes caer la cadera']
  },
  'Rodillas altas': { formReferenceType: 'sprite', spriteSlug: 'high-knees',
    tips: ['Lleva las rodillas a la altura de la cadera', 'Mantén el torso erguido', 'Ritmo rápido y controlado'] },
  'Círculos de brazos': { formReferenceType: 'sprite', spriteSlug: 'arm-circles',
    tips: ['Movimiento amplio y controlado', 'Ambas direcciones', 'Hombros relajados'] },
  'Balanceos de pierna': { formReferenceType: 'sprite', spriteSlug: 'leg-swings-stretch',
    tips: ['Sostente de un apoyo si lo necesitas', 'Rango controlado, sin forzar', 'Ambas piernas por igual'] },
  'Saltos de tijera': { formReferenceType: 'sprite', spriteSlug: 'jumping-jack',
    tips: ['Aterriza suave', 'Brazos y piernas sincronizados', 'Ritmo constante'] },
  'Puente de glúteo': { formReferenceType: 'sprite', spriteSlug: 'glute-bridge',
    tips: ['Glúteos en la parte superior', 'Extensión de cadera completa', 'Aprieta al pico'] },
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
  'Estiramiento dinámico completo': { formReferenceType: 'sprite', spriteSlug: 'worlds-greatest-stretch',
    tips: ['Combina zancada, rotación de torso y estiramiento de isquiotibiales', 'Movimiento fluido, sin prisa', 'Alterna ambos lados'] },
  'Respiración controlada': {
    formReferenceType: 'text_tips',
    tips: ['Inhala por la nariz', 'Exhala lento por la boca', 'Relaja los hombros']
  },
  'Estiramiento de isquiotibiales': { formReferenceType: 'sprite', spriteSlug: 'hamstring-stretch',
    tips: ['Sin rebotes', 'Mantén la espalda recta', 'Sostén 20-30 segundos por lado'] },
  'Flexiones diamante': { formReferenceType: 'sprite', spriteSlug: 'diamond-push-up',
    tips: ['Forma un diamante con las manos', 'Mantén los codos cerca del cuerpo', 'Conserva el cuerpo alineado'] },
  'Flexiones pike': { formReferenceType: 'sprite', spriteSlug: 'pike-push-up',
    tips: ['Cadera alta en forma de V', 'Lleva la cabeza delante de las manos', 'Empuja con los hombros'] },
  'Dead bug': { formReferenceType: 'sprite', spriteSlug: 'dead-bug',
    tips: ['Mantén el abdomen activo', 'Extiende brazo y pierna opuestos', 'Evita arquear la zona lumbar'] },
  'Zancada cruzada': { formReferenceType: 'sprite', spriteSlug: 'curtsy-lunge',
    tips: ['Cruza la pierna por detrás en diagonal', 'Rodilla delantera alineada con el pie', 'Vuelve al centro con control'] },
  'Sentadillas Búlgaras': {
    formReferenceUrl: 'https://www.youtube.com/embed/PV4idpJqRaE',
    formReferenceType: 'youtube-short',
    tips: ['Apoya el pie trasero en una superficie firme', 'Mantén la rodilla alineada', 'Desciende con control']
  },
  'Flexiones inclinadas': { formReferenceType: 'sprite', spriteSlug: 'incline-push-up',
    tips: ['Manos apoyadas en una superficie elevada', 'Cuerpo en línea recta de cabeza a talones', 'Baja controlado hasta acercar el pecho al borde'] },
  'Flexiones con rodillas': { formReferenceType: 'sprite', spriteSlug: 'knee-push-up',
    tips: ['Rodillas apoyadas en el suelo, alineadas con la cadera', 'Mantén el torso recto, sin hundir la espalda baja', 'Baja controlado y empuja con el pecho al subir'] },
  'Toques de hombro en plancha': { formReferenceType: 'sprite', spriteSlug: 'plank-shoulder-tap',
    tips: ['Pies bien separados para dar estabilidad', 'Evita rotar la cadera al tocar el hombro', 'Core apretado durante todo el movimiento'] },
  'Zancadas laterales': { formReferenceType: 'sprite', spriteSlug: 'lateral-lunge',
    tips: ['Da un paso amplio hacia el costado', 'Rodilla de apoyo alineada con el pie', 'Empuja con el talón para volver al centro'] },
  'Sentadilla cosaca': { formReferenceType: 'sprite', spriteSlug: 'cossack-squat',
    tips: ['Pies bien separados, puntas hacia afuera', 'Desplaza el peso a un lado sin levantar el talón de apoyo', 'La pierna extendida se mantiene recta'] },
  'Elevaciones de pantorrilla': { formReferenceType: 'sprite', spriteSlug: 'calf-raise',
    tips: ['Sube hasta quedar en punta de pies', 'Aprieta la pantorrilla arriba un segundo', 'Baja despacio y con control'] },
  'Sentadilla en pared': { formReferenceType: 'sprite', spriteSlug: 'wall-sit',
    tips: ['Espalda totalmente pegada a la pared', 'Rodillas a 90 grados, alineadas con los tobillos', 'Mantén el abdomen activo durante todo el tiempo'] },
  'Puente de glúteo a una pierna': { formReferenceType: 'sprite', spriteSlug: 'single-leg-glute-bridge',
    tips: ['Una pierna extendida, la otra apoyada firme', 'Empuja con el talón de apoyo para subir la cadera', 'Evita rotar la cadera hacia los lados'] },
  'Patadas de glúteo': { formReferenceType: 'sprite', spriteSlug: 'donkey-kick',
    tips: ['Manos bajo los hombros, rodillas bajo la cadera', 'El movimiento nace del glúteo, no de la espalda baja', 'Sube solo hasta alinear el muslo con el torso'] },
  'Abducciones en cuadrupedia': { formReferenceType: 'sprite', spriteSlug: 'fire-hydrant',
    tips: ['Espalda neutra, sin arquear', 'Rodilla flexionada a 90 grados durante todo el movimiento', 'Sube la pierna hacia afuera sin girar la cadera'] },
  'Plancha lateral': { formReferenceType: 'sprite', spriteSlug: 'side-plank',
    tips: ['Codo alineado justo debajo del hombro', 'Cuerpo en línea recta, sin dejar caer la cadera', 'Cadera y hombros mirando al frente'] },
  'Abdominal bicicleta': { formReferenceType: 'sprite', spriteSlug: 'bicycle-crunch',
    tips: ['Protege el cuello, no jales con las manos', 'Lleva el codo hacia la rodilla contraria', 'Movimiento lento y controlado, no rápido'] },
  'Bird dog': { formReferenceType: 'sprite', spriteSlug: 'bird-dog',
    tips: ['Extiende brazo y pierna opuestos a la vez', 'Mantén la espalda recta, sin girar el torso', 'Baja con control antes de cambiar de lado'] },
  'Superman': { formReferenceType: 'sprite', spriteSlug: 'superman',
    tips: ['Eleva brazos y piernas a la vez desde el suelo', 'Aprieta glúteos y espalda baja arriba', 'Sube solo hasta donde no sientas dolor lumbar'] },
  'Ángeles invertidos': { formReferenceType: 'sprite', spriteSlug: 'reverse-snow-angel',
    tips: ['Boca abajo, brazos en forma de W', 'Aprieta los omóplatos al subir los brazos', 'Movimiento lento, sin usar impulso'] },
};

function asShortDemo(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}rel=0&playsinline=1&start=0&end=45`;
}

/**
 * Find exercise reference data (form video URL + tips) by exercise name.
 * Returns null if no reference exists for the exercise.
 * @param {string} exerciseName - Display name of the exercise
 * @returns {Object|null} Reference data with formReferenceUrl, formReferenceType, tips
 */
export function findExerciseReference(exerciseName) {
  if (!exerciseName) return null;
  const exact = EXERCISE_REFERENCES[exerciseName];
  const reference = exact || Object.entries(EXERCISE_REFERENCES).find(
    ([name]) => name.localeCompare(exerciseName, 'es', { sensitivity: 'base' }) === 0,
  )?.[1];
  if (!reference) return null;
  if (!reference.formReferenceUrl) return { ...reference };
  return { ...reference, formReferenceUrl: asShortDemo(reference.formReferenceUrl) };
}
