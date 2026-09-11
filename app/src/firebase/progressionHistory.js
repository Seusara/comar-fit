/**
 * Progression history helpers.
 *
 * When a user accepts progression suggestions, a history entry is written to:
 *   duels/{duelId}/progressionHistory/{userId}_{weekId}
 *
 * Schema:
 *   { userId, weekId, duelId, acceptedAt: Timestamp,
 *     days: { "1": [{exerciseId, action, delta, reason, proposed}], ... },
 *     summary: { increases: number, reduces: number, exercisesChanged: string[] } }
 *
 * Reading: ordered by acceptedAt descending so the newest entry comes first.
 */

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Derives a short human-readable summary from a suggestions.days object.
 * { increases: number, reduces: number, exercisesChanged: string[] }
 */
export function buildSummary(days = {}) {
  const allSuggestions = Object.values(days).flat();
  const changed = allSuggestions.filter((s) => s.action !== 'maintain');
  return {
    increases: changed.filter((s) => s.action === 'increase').length,
    reduces: changed.filter((s) => s.action === 'reduce').length,
    exercisesChanged: [...new Set(changed.map((s) => s.exerciseId))],
  };
}

/**
 * Writes a history entry when a user accepts their suggestions.
 * Called from acceptSuggestion; no-op when days has no non-maintain entries.
 */
export async function recordAcceptedSuggestion(duelId, userId, weekId, days) {
  const summary = buildSummary(days);
  if (summary.exercisesChanged.length === 0) return; // nothing to record

  const db = getFirestore();
  const docId = `${userId}_${weekId}`;
  const ref = doc(db, `duels/${duelId}/progressionHistory/${docId}`);
  await setDoc(ref, {
    userId,
    weekId,
    duelId,
    acceptedAt: serverTimestamp(),
    days,
    summary,
  });
}

/**
 * Reads the last N history entries for a user in a duel, newest first.
 * Returns: { id, userId, weekId, acceptedAt, days, summary }[]
 */
export async function getProgressionHistory(duelId, userId, maxEntries = 8) {
  const db = getFirestore();
  const col = collection(db, `duels/${duelId}/progressionHistory`);
  const q = query(
    col,
    orderBy('acceptedAt', 'desc'),
    limit(maxEntries),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((entry) => entry.userId === userId);
}
