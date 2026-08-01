import { describe, it, expect } from 'vitest';
import { createWorkout, updateWorkout } from './workouts';
import { createUserDocument, createDuel } from './firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

// Sets up two registered users with completed profiles and an active duel
// between them, signed in as user A (the caller createWorkout/updateWorkout
// will act as), matching how firestore.test.js establishes a duel fixture.
async function setUpDuel() {
  const emailA = randomEmail();
  const emailB = randomEmail();

  const credentialA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
  const userAUid = credentialA.user.uid;
  await createUserDocument(userAUid, {
    email: emailA,
    displayName: 'Aaron',
    gender: 'M',
    age: 30,
    weight: 80,
    height: 178,
    experienceLevel: 'Intermediate',
  });

  const credentialB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
  const userBUid = credentialB.user.uid;
  await createUserDocument(userBUid, {
    email: emailB,
    displayName: 'Alexandra',
    gender: 'F',
    age: 28,
    weight: 60,
    height: 165,
    experienceLevel: 'Advanced',
  });

  await signInWithEmailAndPassword(auth, emailA, 'secret123');
  const duelId = await createDuel(userAUid, userBUid);

  return { duelId, userAUid };
}

async function readWorkout(duelId, workoutId) {
  const snapshot = await getDoc(doc(db, 'duels', duelId, 'workouts', workoutId));
  return snapshot.data();
}

describe('createWorkout / updateWorkout difficulty feedback round-trip', () => {
  it('persists a rated difficulty_feedback value and its feedback_timestamp unchanged', async () => {
    const { duelId, userAUid } = await setUpDuel();
    const feedbackTimestamp = '2026-08-01T12:00:00.000Z';
    const exercises = [
      {
        exerciseId: 'Flexiones',
        name: 'Flexiones',
        sets: 3,
        reps: 10,
        durationMinutes: 5,
        difficulty_feedback: 'easy',
        feedback_timestamp: feedbackTimestamp,
      },
    ];

    const workoutId = await createWorkout(duelId, userAUid, exercises);
    const stored = await readWorkout(duelId, workoutId);

    expect(stored.exercises[0].difficulty_feedback).toBe('easy');
    expect(stored.exercises[0].feedback_timestamp).toBe(feedbackTimestamp);
  });

  it('persists the default null difficulty_feedback and feedback_timestamp without stripping them', async () => {
    const { duelId, userAUid } = await setUpDuel();
    const exercises = [
      {
        exerciseId: 'Sentadillas',
        name: 'Sentadillas',
        sets: 3,
        reps: 12,
        durationMinutes: 5,
        difficulty_feedback: null,
        feedback_timestamp: null,
      },
    ];

    const workoutId = await createWorkout(duelId, userAUid, exercises);
    const stored = await readWorkout(duelId, workoutId);

    expect(stored.exercises[0]).toHaveProperty('difficulty_feedback', null);
    expect(stored.exercises[0]).toHaveProperty('feedback_timestamp', null);
  });

  it('carries difficulty_feedback and feedback_timestamp through updateWorkout unchanged', async () => {
    const { duelId, userAUid } = await setUpDuel();
    const initialExercises = [
      {
        exerciseId: 'Plancha',
        name: 'Plancha',
        sets: 1,
        reps: 1,
        durationMinutes: 2,
        difficulty_feedback: null,
        feedback_timestamp: null,
      },
    ];
    const workoutId = await createWorkout(duelId, userAUid, initialExercises);

    const feedbackTimestamp = '2026-08-01T12:05:00.000Z';
    const updatedExercises = [
      {
        exerciseId: 'Plancha',
        name: 'Plancha',
        sets: 1,
        reps: 1,
        durationMinutes: 2,
        difficulty_feedback: 'moderate',
        feedback_timestamp: feedbackTimestamp,
      },
    ];
    await updateWorkout(duelId, workoutId, updatedExercises);
    const stored = await readWorkout(duelId, workoutId);

    expect(stored.exercises[0].difficulty_feedback).toBe('moderate');
    expect(stored.exercises[0].feedback_timestamp).toBe(feedbackTimestamp);
  });
});
