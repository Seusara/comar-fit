import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { recalculateDuelWeek } from './src/recalculateDuelWeek.js';

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
