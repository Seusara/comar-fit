import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export function makeRunId(userId, weekId, isoWeekday) {
  return `${userId}_${weekId}_d${isoWeekday}`;
}

function runDocRef(duelId, runId) {
  return doc(db, 'duels', duelId, 'runSessions', runId);
}

export async function getRunSession(duelId, runId) {
  const ref = runDocRef(duelId, runId);
  const snap = await getDoc(ref);
  return snap.exists() ? { runId: snap.id, ...snap.data() } : null;
}

// planSnapshot must be the plan's day entry (type === 'run')
export async function getOrCreateRunSession(duelId, userId, weekId, isoWeekday, planSnapshot) {
  const runId = makeRunId(userId, weekId, isoWeekday);
  const ref = runDocRef(duelId, runId);
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) return { runId: existing.id, ...existing.data() };

    if (!planSnapshot || planSnapshot.type !== 'run' || !planSnapshot.target) {
      throw new Error('NOT_A_RUN_DAY');
    }

    const payload = {
      userId,
      duelId,
      weekId,
      day: isoWeekday,
      planPath: `duels/${duelId}/plans/${userId}/weeks/${weekId}`,
      targetDistanceMeters: planSnapshot.target.distanceMeters,
      targetDurationSeconds: planSnapshot.target.durationSeconds,
      distanceMeters: 0,
      durationSeconds: 0,
      averagePaceSecondsPerKm: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revision: 1,
    };

    tx.set(ref, payload);
    return { runId, ...payload };
  });
}

export async function startRunSession(duelId, runId) {
  const ref = runDocRef(duelId, runId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('NOT_FOUND');
    const data = snap.data();
    if (data.status === 'active') return { runId: snap.id, ...data };

    // Only allow transition pending -> active
    if (data.status !== 'pending') throw new Error('INVALID_STATE');

    const newRevision = (typeof data.revision === 'number' ? data.revision : 1) + 1;
    const payload = {
      ...data,
      status: 'active',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revision: newRevision,
    };
    tx.set(ref, payload);
    return { runId: snap.id, ...payload };
  });
}

