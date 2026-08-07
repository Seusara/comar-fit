import { doc, getDoc, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import EXERCISES from '../data/exercises';

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

function pickExercisesForFocus(rng, focus, count = 4) {
  // focus is a simple keyword like 'chest' or 'legs' or 'fullbody' or 'glutes'
  const pool = EXERCISES.filter(e => e.muscleGroup === focus || e.secondaryMuscles.includes(focus) || e.muscleGroup === 'fullbody');
  const picked = [];
  const poolCopy = [...pool];
  while (picked.length < Math.min(count, poolCopy.length)) {
    const idx = Math.floor(rng() * poolCopy.length);
    picked.push(poolCopy.splice(idx,1)[0]);
  }
  return picked.map(e => ({ id: e.id, name: e.name, type: e.type, substitutionGroup: e.substitutionGroup, equipment: e.equipment, difficulty: e.difficulty, sets: 3, reps: (e.type === 'reps' ? 10 : null), durationSeconds: (e.type === 'duration' ? 60 : null) }));
}

function focusForDayByGender(gender, isoWeekday) {
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

function expandFocusToMuscleGroup(focusKey) {
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
    const rng = deterministicRandom(seed);

    // build days 1..7 (ISO weekday)
    const days = {};
    for (let d = 1; d <= 7; d++) {
      const planSpec = focusForDayByGender(userProfile.gender || 'M', d);
      if (planSpec.type === 'rest') {
        days[String(d)] = { type: 'rest' };
      } else if (planSpec.type === 'run') {
        days[String(d)] = { type: 'run', target: planSpec.target };
      } else if (planSpec.type === 'workout') {
        const muscleGroups = expandFocusToMuscleGroup(planSpec.focus);
        // pick primary muscle group deterministically from list
        const primary = muscleGroups[Math.floor(rng()*muscleGroups.length)];
        const exercises = pickExercisesForFocus(rng, primary, 4);
        days[String(d)] = { type: 'workout', focus: planSpec.focus, exercises };
      }
    }

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
