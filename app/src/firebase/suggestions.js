/**
 * Firebase helpers for reading and acting on progression suggestions.
 *
 * Collection: duels/{duelId}/suggestions/{userId}_{weekId}
 * Schema:
 *   { userId, weekId, duelId, status: 'pending'|'accepted'|'dismissed',
 *     days: { "1": [{exerciseId, action, delta, reason, proposed}], ... },
 *     generatedAt: Timestamp, respondedAt?: Timestamp }
 */

import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { recordAcceptedSuggestion } from './progressionHistory';

/**
 * Fetches the pending suggestion doc for the current user + week.
 * Returns null when there is no suggestion or when it has already been acted on.
 */
export async function getPendingSuggestion(duelId, userId, weekId) {
  const db = getFirestore();
  const docId = `${userId}_${weekId}`;
  const ref = doc(db, `duels/${duelId}/suggestions/${docId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.status === 'pending' ? { id: snap.id, ...data } : null;
}

/**
 * Marks a suggestion as accepted and writes a progression history entry.
 */
export async function acceptSuggestion(duelId, userId, weekId, days) {
  const db = getFirestore();
  const docId = `${userId}_${weekId}`;
  const ref = doc(db, `duels/${duelId}/suggestions/${docId}`);
  await updateDoc(ref, { status: 'accepted', respondedAt: serverTimestamp() });
  if (days) {
    await recordAcceptedSuggestion(duelId, userId, weekId, days).catch(() => {});
  }
}

/**
 * Marks a suggestion as dismissed (keep current plan unchanged).
 */
export async function dismissSuggestion(duelId, userId, weekId) {
  const db = getFirestore();
  const docId = `${userId}_${weekId}`;
  const ref = doc(db, `duels/${duelId}/suggestions/${docId}`);
  await updateDoc(ref, { status: 'dismissed', respondedAt: serverTimestamp() });
}
