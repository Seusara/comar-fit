import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { recalculateDuelWeek } from './src/recalculateDuelWeek.js';
import { sendWorkoutReminders } from './src/sendWorkoutReminders.js';
import { generateProgressionSuggestions } from './src/generateProgressionSuggestions.js';

initializeApp();
const db = getFirestore();

export const calculateScore = onDocumentWritten(
  'duels/{duelId}/workouts/{workoutId}',
  async (event) => recalculateDuelWeek({
    db,
    duelId: event.params.duelId,
    workoutId: event.params.workoutId,
    before: event.data?.before,
    after: event.data?.after,
  }),
);

export const workoutReminders = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'America/Mexico_City', region: 'us-central1' },
  () => sendWorkoutReminders({ db }),
);

// Runs every Sunday at 23:45 MX time. Reads the week's difficulty feedback
// and writes progression suggestions for each participant in every active duel.
export const weeklyProgressionSuggestions = onSchedule(
  { schedule: '45 23 * * 0', timeZone: 'America/Mexico_City', region: 'us-central1' },
  () => generateProgressionSuggestions({ db, serverTimestamp: FieldValue.serverTimestamp }),
);
