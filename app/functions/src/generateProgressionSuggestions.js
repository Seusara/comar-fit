/**
 * generateProgressionSuggestions
 *
 * Runs at the end of each duel week (Sunday 23:45 MX).
 * For every active duel:
 *   1. Reads the current week plan for each participant.
 *   2. Reads difficulty feedback stored on workoutProgress documents.
 *   3. Runs the progression engine.
 *   4. Writes suggestions to:
 *        duels/{duelId}/suggestions/{userId}_{weekId}
 *      with status: 'pending' so the UI can display them next Monday.
 *
 * Idempotent: re-running for the same weekId merges into the same doc.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { generateWeekSuggestions } from './progressionEngine.js';

const TIMEZONE = 'America/Mexico_City';

/**
 * Returns the ISO week-id string (e.g. "2026-W32") for the given DateTime.
 * Matches the format used by the plans module.
 * Exported for testing.
 */
export function toWeekId(dt) {
  const monday = dt.startOf('week');
  return `${monday.weekYear}-W${String(monday.weekNumber).padStart(2, '0')}`;
}

/**
 * Collects difficulty feedback from all workoutProgress documents for a user
 * in the current week.
 */
async function collectFeedback(db, duelId, userId, weekId) {
  const progressSnap = await db
    .collection(`duels/${duelId}/workoutProgress`)
    .where('userId', '==', userId)
    .where('weekId', '==', weekId)
    .get();

  const entries = [];
  for (const doc of progressSnap.docs) {
    const data = doc.data();
    const dayNumber = data.dayNumber ?? data.day ?? null;
    for (const exercise of data.exercises ?? []) {
      if (exercise.difficulty && exercise.id) {
        entries.push({ exerciseId: exercise.id, difficulty: exercise.difficulty, dayNumber });
      }
    }
  }
  return entries;
}

async function fetchPlan(db, duelId, userId, weekId) {
  const snap = await db.doc(`duels/${duelId}/plans/${userId}/weeks/${weekId}`).get();
  return snap.exists ? snap.data() : null;
}

function suggestionsMapToObject(map) {
  const obj = {};
  for (const [dayKey, daySuggestions] of map.entries()) {
    obj[dayKey] = daySuggestions;
  }
  return obj;
}

export async function generateProgressionSuggestions({ db, now, weekId: overrideWeekId, serverTimestamp: serverTimestampOverride }) {
  const fieldValue = serverTimestampOverride ?? FieldValue.serverTimestamp;
  const currentTime = now ?? DateTime.now().setZone(TIMEZONE);
  const weekId = overrideWeekId ?? toWeekId(currentTime);

  const duelsSnap = await db.collection('duels').where('status', '==', 'active').get();
  let processed = 0;

  for (const duelDoc of duelsSnap.docs) {
    const duelId = duelDoc.id;
    const duel = duelDoc.data();
    const participants = [duel.userA_uid, duel.userB_uid].filter(Boolean);

    for (const userId of participants) {
      try {
        const [plan, feedback] = await Promise.all([
          fetchPlan(db, duelId, userId, weekId),
          collectFeedback(db, duelId, userId, weekId),
        ]);

        if (!plan) continue;

        const suggestionsMap = generateWeekSuggestions(plan, feedback);
        if (suggestionsMap.size === 0) continue;

        const docId = `${userId}_${weekId}`;
        await db.doc(`duels/${duelId}/suggestions/${docId}`).set({
          userId,
          weekId,
          duelId,
          days: suggestionsMapToObject(suggestionsMap),
          status: 'pending',
          generatedAt: typeof fieldValue === 'function' ? fieldValue() : fieldValue,
        }, { merge: true });

        processed += 1;
      } catch (err) {
        console.error(`[generateProgressionSuggestions] ${duelId}/${userId}:`, err);
      }
    }
  }

  return processed;
}
