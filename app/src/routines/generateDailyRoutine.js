import { ROUTINE_CATALOG, ROUTINE_CATALOG_VERSION } from './catalog.js';

const LEVELS = { beginner: 0, principiante: 0, intermediate: 1, intermedio: 1, advanced: 2, avanzado: 2 };
const PHASE_LABELS = { warmup: 'Calentamiento', main: 'Bloque principal', recovery: 'Recuperación' };

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function goalFor(value) {
  const goal = normalize(value);
  if (goal.includes('fuerza') || goal.includes('musculo')) return 'fuerza';
  if (goal.includes('resistencia') || goal.includes('cardio')) return 'resistencia';
  if (goal.includes('movilidad') || goal.includes('flexibilidad')) return 'movilidad';
  return 'general';
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function seededOrder(items, seed) {
  return [...items].sort((left, right) => hash(`${seed}:${left.id}`) - hash(`${seed}:${right.id}`));
}

function scaleExercise(exercise, level) {
  const multiplier = [0.8, 1, 1.25][level] ?? 0.8;
  return {
    ...exercise,
    sets: Math.max(1, Math.round(exercise.sets * multiplier)),
    reps: Math.max(1, Math.round(exercise.reps * multiplier)),
  };
}

function selectWithinMinutes(items, targetMinutes, minimumCount) {
  const selected = [];
  let total = 0;
  for (const item of items) {
    if (selected.length >= minimumCount && total + item.minutes > targetMinutes) continue;
    selected.push(item);
    total += item.minutes;
    if (total >= targetMinutes) break;
  }
  return selected;
}

export function routineProgressKey(uid, dayKey) {
  return `comar-fit:routine-progress:${uid}:${dayKey}`;
}

export function routineHistoryKey(uid) {
  return `comar-fit:routine-history:${uid}`;
}

export function generateDailyRoutine({ profile = {}, uid = 'guest', dayKey, recentExerciseIds = [] }) {
  const equipment = Array.isArray(profile.equipment) ? profile.equipment : [];
  const normalizedEquipment = new Set(equipment.map(normalize));
  const hasCoreProfile = Boolean(profile.experienceLevel && profile.objective && profile.preferredWorkoutMinutes);
  const isFallback = !hasCoreProfile;
  const level = isFallback ? 0 : (LEVELS[normalize(profile.experienceLevel)] ?? 0);
  const goal = isFallback ? 'general' : goalFor(profile.objective);
  const preferredMinutes = isFallback ? 20 : Math.min(60, Math.max(15, Number(profile.preferredWorkoutMinutes) || 20));
  const seed = `${uid}:${dayKey}:${ROUTINE_CATALOG_VERSION}`;

  const eligible = ROUTINE_CATALOG.filter((exercise) => (
    exercise.minLevel <= level &&
    (exercise.equipment === 'bodyweight' || normalizedEquipment.has(normalize(exercise.equipment))) &&
    (!isFallback || exercise.equipment === 'bodyweight')
  ));

  const recent = new Set(Array.isArray(recentExerciseIds) ? recentExerciseIds : []);
  const choose = (phase, target, minimum) => {
    const phaseItems = eligible.filter((exercise) => exercise.phase === phase);
    const goalMatches = phaseItems.filter((exercise) => exercise.goals.includes(goal));
    const otherMatches = phaseItems.filter((exercise) => !exercise.goals.includes(goal));
    const candidates = [...seededOrder(goalMatches, `${seed}:${phase}:goal`), ...seededOrder(otherMatches, `${seed}:${phase}:other`)];
    const ordered = [...candidates.filter((exercise) => !recent.has(exercise.id)), ...candidates.filter((exercise) => recent.has(exercise.id))];
    return selectWithinMinutes(ordered, target, minimum).map((exercise) => scaleExercise(exercise, level));
  };

  const short = preferredMinutes <= 18;
  const medium = preferredMinutes <= 24;
  const warmupTarget = short ? 3 : medium ? 4 : Math.max(5, Math.round(preferredMinutes * 0.18));
  const recoveryTarget = short ? 3 : medium ? 3 : Math.max(5, Math.round(preferredMinutes * 0.18));
  const mainTarget = Math.max(8, preferredMinutes - warmupTarget - recoveryTarget);

  const phases = [
    { id: 'warmup', label: PHASE_LABELS.warmup, exercises: choose('warmup', warmupTarget, short ? 1 : 2) },
    { id: 'main', label: PHASE_LABELS.main, exercises: choose('main', mainTarget, short ? 2 : 3) },
    { id: 'recovery', label: PHASE_LABELS.recovery, exercises: choose('recovery', recoveryTarget, short || medium ? 1 : 2) },
  ];
  const durationMinutes = phases.flatMap((phase) => phase.exercises).reduce((total, exercise) => total + exercise.minutes, 0);

  return { id: `${uid}:${dayKey}:v${ROUTINE_CATALOG_VERSION}`, dayKey, durationMinutes, isFallback, phases };
}
