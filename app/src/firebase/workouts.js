import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';

const workoutsCollection = (duelId) => collection(db, 'duels', duelId, 'workouts');

export async function createWorkout(duelId, userId, exercises) {
  const ref = await addDoc(workoutsCollection(duelId), {
    userId,
    duelId,
    exercises,
    performedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    revision: 0,
  });
  return ref.id;
}

export async function updateWorkout(duelId, workoutId, exercises) {
  await updateDoc(doc(db, 'duels', duelId, 'workouts', workoutId), {
    exercises,
    updatedAt: serverTimestamp(),
    revision: Date.now(),
  });
}

export function deleteWorkout(duelId, workoutId) {
  return deleteDoc(doc(db, 'duels', duelId, 'workouts', workoutId));
}

export function subscribeToWorkouts(duelId, userId, onData, onError) {
  const workoutsQuery = query(
    workoutsCollection(duelId),
    where('userId', '==', userId),
    orderBy('performedAt', 'desc'),
  );
  return onSnapshot(
    workoutsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ workoutId: item.id, ...item.data() }))),
    onError,
  );
}

export function subscribeToDuelWorkouts(duelId, onData, onError) {
  const workoutsQuery = query(
    workoutsCollection(duelId),
    orderBy('performedAt', 'desc'),
  );
  return onSnapshot(
    workoutsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ workoutId: item.id, ...item.data() }))),
    onError,
  );
}

export function subscribeToDuelWeek(duelId, weekId, onData, onError) {
  return onSnapshot(
    doc(db, 'duels', duelId, 'weeks', weekId),
    (snapshot) => onData(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}
