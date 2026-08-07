import { describe, it, expect, beforeEach } from 'vitest';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './config';
import { createUserDocument, createDuel } from './firestore';
import { getWeekId } from './plans';

describe('workoutProgress', () => {
  it('creates progress for workout day and enforces revision/counts', async () => {
    const emailA = `wp-a-${Date.now()}@example.com`;
    const emailB = `wp-b-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'A', gender: 'M', age: 30, weight: 70, height: 170, experienceLevel: 'Beginner' });
    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'B', gender: 'M', age: 28, weight: 75, height: 180, experienceLevel: 'Beginner' });

    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelId = await createDuel(uidA, uidB);

    const weekId = getWeekId(new Date());
    // craft a workout day plan snapshot
    const planSnapshot = {
      type: 'workout',
      focus: 'chest_triceps',
      exercises: [
        { id: 'e1', name: 'Push', sets: 3, reps: 10 },
        { id: 'e2', name: 'Bench', sets: 3, reps: 8 },
        { id: 'e3', name: 'Fly', sets: 3, reps: 12 },
        { id: 'e4', name: 'Dips', sets: 3, reps: 8 },
      ],
    };

    const { getOrCreateWorkoutProgress, makeProgressId, toggleExerciseCompletion, getWorkoutProgress } = await import('./workoutProgress');
    const isoWeekday = 1;
    const progress = await getOrCreateWorkoutProgress(duelId, uidA, weekId, isoWeekday, planSnapshot);

    expect(progress.revision).toBe(1);
    expect(progress.totalCount).toBe(4);
    expect(progress.completedCount).toBe(0);
    expect(progress.completionRate).toBe(0);
    expect(progress.status).toBe('pending');

    const progressId = makeProgressId(uidA, weekId, isoWeekday);

    // toggle one exercise
    const updated1 = await toggleExerciseCompletion(duelId, progressId, 'e1', true);
    expect(updated1.revision).toBe(2);
    expect(updated1.completedCount).toBe(1);
    expect(updated1.completionRate).toBe(25);
    expect(updated1.status).toBe('partial');

    // toggle to reach 75% => partial
    await toggleExerciseCompletion(duelId, progressId, 'e2', true);
    await toggleExerciseCompletion(duelId, progressId, 'e3', true);
    const after3 = await getWorkoutProgress(duelId, progressId);
    expect(after3.completedCount).toBe(3);
    expect(after3.completionRate).toBe(75);
    expect(after3.status).toBe('partial');

    // 4/4 => 100% completed
    await toggleExerciseCompletion(duelId, progressId, 'e4', true);
    const afterAll = await getWorkoutProgress(duelId, progressId);
    expect(afterAll.completedCount).toBe(4);
    expect(afterAll.completionRate).toBe(100);
    expect(afterAll.status).toBe('completed');

    // partner can read
    await signInWithEmailAndPassword(auth, emailB, 'secret123');
    const partnerView = await getWorkoutProgress(duelId, progressId);
    expect(partnerView.userId).toBe(uidA);

    // outsider cannot read
    const emailOut = `out-${Date.now()}@example.com`;
    const credOut = await createUserWithEmailAndPassword(auth, emailOut, 'secret123');
    const uidOut = credOut.user.uid;
    await createUserDocument(uidOut, { email: emailOut, displayName: 'Out', gender: 'F', age: 24, weight: 55, height: 160, experienceLevel: 'Beginner' });
    await signInWithEmailAndPassword(auth, emailOut, 'secret123');
    let outsider = null;
    try {
      outsider = await getWorkoutProgress(duelId, progressId);
    } catch (err) {
      outsider = null;
    }
    expect(outsider).toBeNull();
  });

  it('rejects creation for rest/run days', async () => {
    const emailA = `wp2-a-${Date.now()}@example.com`;
    const emailB = `wp2-b-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'A', gender: 'M', age: 30, weight: 70, height: 170, experienceLevel: 'Beginner' });
    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'B', gender: 'M', age: 28, weight: 75, height: 180, experienceLevel: 'Beginner' });

    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelId = await createDuel(uidA, uidB);

    const weekId = getWeekId(new Date());
    const restPlan = { type: 'rest' };
    const runPlan = { type: 'run', target: { distanceMeters: 2000, durationSeconds: 1200 } };

    const { getOrCreateWorkoutProgress, makeProgressId } = await import('./workoutProgress');
    let err = null;
    try {
      await getOrCreateWorkoutProgress(duelId, uidA, weekId, 3, restPlan);
    } catch (e) { err = e; }
    expect(err).not.toBeNull();

    err = null;
    try {
      await getOrCreateWorkoutProgress(duelId, uidA, weekId, 6, runPlan);
    } catch (e) { err = e; }
    expect(err).not.toBeNull();
  });
});
