import { doc, getDoc, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import EXERCISES from '../data/exercises';

export const NORMAL_WORKOUT_MIN = 4;
export const NORMAL_WORKOUT_MAX = 6;
export const PLAN_GENERATOR_VERSION = 2;

// Week ID in format YYYY-Www (ISO week number)
export function getWeekId(date = new Date()) {
  // Simple ISO week calculation
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year.
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1)/7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

function deterministicRandom(seed) {
  // simple xorshift-ish deterministic RNG from seed string
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function() {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizedLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  if (level === 'advanced' || level === 'avanzado') return 'advanced';
  if (level === 'intermediate' || level === 'intermedio') return 'intermediate';
  return 'beginner';
}

export function exerciseCountForProfile(profile = {}) {
  const level = normalizedLevel(profile.experienceLevel);
  if (level === 'beginner') return 4;
  if (level === 'intermediate') return 5;
  return Number(profile.previousWeekCompletion) >= 80 ? 6 : 5;
}

function shuffled(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function exerciseMatchesFocus(exercise, muscleGroups) {
  return muscleGroups.includes(exercise.muscleGroup) ||
    exercise.secondaryMuscles.some((group) => muscleGroups.includes(group));
}

function pickExercisesForFocus(rng, muscleGroups, count) {
  const focusedPool = shuffled(EXERCISES.filter(
    (exercise) => exerciseMatchesFocus(exercise, muscleGroups) && exercise.muscleGroup !== 'fullbody',
  ), rng);
  const fullbodyPool = shuffled(EXERCISES.filter((exercise) => exercise.muscleGroup === 'fullbody'), rng);
  const picked = [];
  const pickedIds = new Set();
  const usedPatterns = new Set();

  function add(exercise) {
    if (!exercise || pickedIds.has(exercise.id) || picked.length >= count) return false;
    picked.push(exercise);
    pickedIds.add(exercise.id);
    usedPatterns.add(exercise.substitutionGroup);
    return true;
  }

  // Cover each requested muscle before adding extra variations. Prefer an
  // exercise whose primary muscle matches, then accept a secondary match.
  for (const group of muscleGroups) {
    const candidates = focusedPool.filter((exercise) => (
      exercise.muscleGroup === group || exercise.secondaryMuscles.includes(group)
    ));
    add(candidates.find((exercise) => (
      exercise.muscleGroup === group && !usedPatterns.has(exercise.substitutionGroup)
    )) || candidates.find((exercise) => !usedPatterns.has(exercise.substitutionGroup)) || candidates[0]);
  }

  // Prefer different movement patterns before selecting a close variation.
  for (const exercise of focusedPool) {
    if (!usedPatterns.has(exercise.substitutionGroup)) add(exercise);
  }
  for (const exercise of focusedPool) add(exercise);

  // Full-body movements are optional finishers, not universal filler. They
  // are used freely only on full-body days and at most once elsewhere.
  const allowsFullbody = muscleGroups.includes('fullbody');
  const finisherLimit = allowsFullbody ? count : Math.min(count, picked.length + 1);
  for (const exercise of fullbodyPool) {
    if (picked.length >= finisherLimit) break;
    add(exercise);
  }

  return picked.slice(0, count).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    type: exercise.type,
    substitutionGroup: exercise.substitutionGroup,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    sets: 3,
    reps: exercise.type === 'reps' ? 10 : null,
    durationSeconds: exercise.type === 'duration' ? 60 : null,
  }));
}

export function focusForDayByGender(gender, isoWeekday) {
  // isoWeekday: 1=Monday .. 7=Sunday
  // Rules provided in the brief
  if (isoWeekday === 3 || isoWeekday === 7) return { type: 'rest' };
  if (isoWeekday === 6) return { type: 'run', target: { distanceMeters: 2000, durationSeconds: 1200 } };

  // workouts on 1,2,4,5
  if (gender === 'F') {
    if (isoWeekday === 1) return { type: 'workout', focus: 'legs_glutes' };
    if (isoWeekday === 2) return { type: 'workout', focus: 'upper_body' };
    if (isoWeekday === 4) return { type: 'workout', focus: 'legs_glutes' };
    if (isoWeekday === 5) return { type: 'workout', focus: 'fullbody_core' };
  }
  // default male
  if (isoWeekday === 1) return { type: 'workout', focus: 'chest_triceps' };
  if (isoWeekday === 2) return { type: 'workout', focus: 'back_biceps' };
  if (isoWeekday === 4) return { type: 'workout', focus: 'legs' };
  if (isoWeekday === 5) return { type: 'workout', focus: 'fullbody_shoulder_core' };
  return { type: 'rest' };
}

export function expandFocusToMuscleGroup(focusKey) {
  switch (focusKey) {
    case 'chest_triceps': return ['chest','triceps'];
    case 'back_biceps': return ['back','biceps'];
    case 'legs_glutes': return ['legs','glutes'];
    case 'legs': return ['legs'];
    case 'fullbody_core': return ['fullbody','core'];
    case 'fullbody_shoulder_core': return ['fullbody','shoulder','core'];
    case 'upper_body': return ['chest','back','shoulder','biceps','triceps'];
    default: return [focusKey];
  }
}

export function buildPlanDays(seed, userProfile = {}) {
  const gender = userProfile.gender || 'M';
  const count = exerciseCountForProfile(userProfile);
  const rng = deterministicRandom(`${seed}|${normalizedLevel(userProfile.experienceLevel)}|${count}|v${PLAN_GENERATOR_VERSION}`);
  const days = {};

  for (let day = 1; day <= 7; day += 1) {
    const planSpec = focusForDayByGender(gender, day);
    if (planSpec.type === 'rest') {
      days[String(day)] = { type: 'rest' };
    } else if (planSpec.type === 'run') {
      days[String(day)] = { type: 'run', target: planSpec.target };
    } else {
      const muscleGroups = expandFocusToMuscleGroup(planSpec.focus);
      days[String(day)] = {
        type: 'workout',
        focus: planSpec.focus,
        exercises: pickExercisesForFocus(rng, muscleGroups, count),
      };
    }
  }

  return days;
}

export async function getPlan(duelId, userId, weekId) {
  const docRef = doc(db, 'duels', duelId, 'plans', userId, 'weeks', weekId);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

export async function generatePlanIfMissing(duelId, userId, weekId, userProfile = {}) {
  const docRef = doc(db, 'duels', duelId, 'plans', userId, 'weeks', weekId);
  // Use transaction to avoid race conditions
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(docRef);
    if (existing.exists()) return existing.data();

    // Deterministic seed
    const seed = `${duelId}|${userId}|${weekId}|${userProfile.gender || 'M'}`;
    const days = buildPlanDays(seed, userProfile);

    const payload = {
      userId,
      weekId,
      status: 'generated',
      generatedAt: serverTimestamp(),
      revision: 1,
      days,
    };

    await tx.set(docRef, payload);
    return payload;
  });
}

export default { getWeekId, getPlan, generatePlanIfMissing };
