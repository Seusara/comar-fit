import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

function progressDocRef(duelId, progressId) {
  return doc(db, 'duels', duelId, 'workoutProgress', progressId);
}

export function makeProgressId(userId, weekId, isoWeekday) {
  return `${userId}_${weekId}_d${isoWeekday}`;
}

export async function getWorkoutProgress(duelId, progressId) {
  const ref = doc(db, 'duels', duelId, 'workoutProgress', progressId);
  const snap = await getDoc(ref);
  return snap.exists() ? { progressId: snap.id, ...snap.data() } : null;
}

// planSnapshot is the plan document for the user/week (client-provided)
export async function getOrCreateWorkoutProgress(duelId, userId, weekId, isoWeekday, planSnapshot) {
  const progressId = makeProgressId(userId, weekId, isoWeekday);
  const ref = progressDocRef(duelId, progressId);
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) return { progressId: existing.id, ...existing.data() };

    // Only create progress if planSnapshot indicates a workout with exercises
    if (!planSnapshot || planSnapshot.type !== 'workout' || !Array.isArray(planSnapshot.exercises) || planSnapshot.exercises.length === 0) {
      throw new Error('NOT_A_WORKOUT_DAY');
    }

    const exercises = planSnapshot.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.sets,
      reps: e.reps ?? null,
      durationSeconds: e.durationSeconds ?? null,
      substitutionGroup: e.substitutionGroup ?? null,
      completed: false,
    }));

    const totalCount = exercises.length;
    const payload = {
      userId,
      duelId,
      weekId,
      day: isoWeekday,
      planPath: `duels/${duelId}/plans/${userId}/weeks/${weekId}`,
      exercises,
      totalCount,
      completedCount: 0,
      completionRate: 0,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revision: 1,
    };

    tx.set(ref, payload);
    return { progressId, ...payload };
  });
}

export async function toggleExerciseCompletion(duelId, progressId, exerciseId, completed) {
  const ref = progressDocRef(duelId, progressId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('NOT_FOUND');
    const data = snap.data();

    // Find exercise index
    const idx = (data.exercises || []).findIndex((x) => x.id === exerciseId);
    if (idx === -1) throw new Error('EXERCISE_NOT_FOUND');

    // Do not allow adding/removing exercises
    const totalCount = data.totalCount || (data.exercises || []).length;
    if (totalCount !== (data.exercises || []).length) throw new Error('INVALID_TOTAL_COUNT');

    const current = !!data.exercises[idx].completed;
    if (current === !!completed) {
      // No-op, return current
      return { progressId: snap.id, ...data };
    }

    // mutate exercises copy
    const exercises = JSON.parse(JSON.stringify(data.exercises));
    exercises[idx].completed = !!completed;
    // Do not store serverTimestamp inside array elements (unsupported). Rely on top-level updatedAt.

    const completedCount = exercises.filter((e) => e.completed).length;
    const completionRate = Math.round((completedCount / totalCount) * 100);
    const status = completedCount === 0 ? 'pending' : (completionRate >= 80 ? 'completed' : 'partial');

    const newRevision = (typeof data.revision === 'number' ? data.revision : 1) + 1;

    const payload = {
      ...data,
      exercises,
      completedCount,
      completionRate,
      status,
      updatedAt: serverTimestamp(),
      revision: newRevision,
    };

    tx.set(ref, payload);
    return { progressId: snap.id, ...payload };
  });
}

export function subscribeToWorkoutProgress(duelId, progressId, onData, onError) {
  const ref = progressDocRef(duelId, progressId);
  return onSnapshot(ref, (snap) => onData(snap.exists() ? { progressId: snap.id, ...snap.data() } : null), onError);
}
