import { DateTime } from 'luxon';

const DEFAULT_TIMEZONE = 'America/Mexico_City';

const MET_BY_EXERCISE = {
  pushups: 6,
  squats: 5,
  crunches: 3.8,
  planks: 3,
  burpees: 8,
  mountainclimbers: 8,
  dips: 6,
  pistolsquats: 6,
  clappushups: 8,
  bulgariansquats: 6,
  sideplanks: 3,
  activemarch: 3.5,
  armcircles: 3,
  hipmobility: 2.5,
  jumpingjacks: 8,
  glutebridge: 4,
  backpackrow: 6,
  backpackdeadlift: 6,
  bandrow: 5,
  dumbbellpress: 6,
  stretching: 2.5,
  controlledbreathing: 1.5,
  legstretch: 2.5,
};

const EXERCISE_ALIASES = {
  flexiones: 'pushups',
  pushups: 'pushups',
  sentadillas: 'squats',
  squats: 'squats',
  abdominales: 'crunches',
  crunches: 'crunches',
  planchas: 'planks',
  planks: 'planks',
  burpees: 'burpees',
  mountainclimbers: 'mountainclimbers',
  fondos: 'dips',
  dips: 'dips',
  sentadillasconpistol: 'pistolsquats',
  pistolsquats: 'pistolsquats',
  lagartijasconpalmadas: 'clappushups',
  clappushups: 'clappushups',
  sentadillasbulgaras: 'bulgariansquats',
  bulgariansquats: 'bulgariansquats',
  planchaslaterales: 'sideplanks',
  sideplanks: 'sideplanks',
  marchaactiva: 'activemarch',
  circulosdebrazos: 'armcircles',
  movilidaddecadera: 'hipmobility',
  saltosdetijera: 'jumpingjacks',
  puentedegluteo: 'glutebridge',
  plancha: 'planks',
  escaladores: 'mountainclimbers',
  remoconmochila: 'backpackrow',
  pesomuertoconmochila: 'backpackdeadlift',
  remoconbanda: 'bandrow',
  pressconmancuernas: 'dumbbellpress',
  estiramientogeneral: 'stretching',
  respiracioncontrolada: 'controlledbreathing',
  estiramientodepiernas: 'legstretch',
};

function normalizeExerciseId(exercise) {
  const normalized = getExerciseId(exercise)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return EXERCISE_ALIASES[normalized] ?? normalized;
}

function getExerciseId(exercise) {
  return String(exercise.exerciseId ?? exercise.id ?? exercise.name ?? '').trim();
}

function toDateTime(value, timezone) {
  if (DateTime.isDateTime(value)) return value.setZone(timezone);
  if (value instanceof Date) return DateTime.fromJSDate(value, { zone: timezone });
  if (value && typeof value.toDate === 'function') {
    return DateTime.fromJSDate(value.toDate(), { zone: timezone });
  }

  return DateTime.fromISO(value, { zone: timezone, setZone: true }).setZone(timezone);
}

function metricPercent(value, target) {
  return Math.max(0, Math.min(100, (value / target) * 100));
}

export function deriveWorkoutMetrics(exercises, weightKg) {
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const weight = Number(weightKg) || 0;
  const exerciseIds = new Set();
  let minutes = 0;
  let reps = 0;
  let calories = 0;

  for (const exercise of safeExercises) {
    const rawExerciseId = getExerciseId(exercise);
    const exerciseId = normalizeExerciseId(exercise);
    const durationMinutes = Number(exercise.durationMinutes ?? exercise.duration) || 0;
    const sets = Number(exercise.sets) || 0;
    const repetitions = Number(exercise.reps) || 0;
    const met = MET_BY_EXERCISE[exerciseId] ?? 0;

    if (rawExerciseId) exerciseIds.add(rawExerciseId);
    minutes += durationMinutes;
    reps += sets * repetitions;
    calories += met * weight * (durationMinutes / 60);
  }

  return {
    minutes,
    exerciseCount: exerciseIds.size,
    reps,
    calories,
  };
}

export function calculateWeeklyScore(metrics, gender) {
  const isFemale = String(gender).toUpperCase() === 'F';
  const minutes = metricPercent(Number(metrics.minutes) || 0, isFemale ? 50 : 60);
  const exercises = metricPercent(Number(metrics.exerciseCount) || 0, 8);
  const reps = metricPercent(Number(metrics.reps) || 0, isFemale ? 150 : 200);
  const calories = metricPercent(Number(metrics.calories) || 0, isFemale ? 300 : 400);

  return Math.round((minutes + exercises + reps + calories) * 0.25);
}

export function getWeekWindow(date, timezone = DEFAULT_TIMEZONE) {
  const localDate = toDateTime(date, timezone);
  const start = localDate.startOf('day').minus({ days: localDate.weekday - 1 });

  return { start, end: start.plus({ weeks: 1 }) };
}

export function calculateStreak(days, today) {
  const trainedDays = new Set(
    (Array.isArray(days) ? days : [])
      .map((day) => toDateTime(day, DEFAULT_TIMEZONE))
      .filter((day) => day.isValid)
      .map((day) => day.toISODate()),
  );
  const currentDay = toDateTime(today, DEFAULT_TIMEZONE).startOf('day');
  let cursor = trainedDays.has(currentDay.toISODate())
    ? currentDay
    : currentDay.minus({ days: 1 });
  let streak = 0;

  while (trainedDays.has(cursor.toISODate())) {
    streak += 1;
    cursor = cursor.minus({ days: 1 });
  }

  return streak;
}
