import { describe, it, expect } from 'vitest';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config';
import { createUserDocument, createDuel } from './firestore';
import { getWeekId } from './plans';

describe('runSessions', () => {
  it('creates runSession only on run day and transitions pending->active', async () => {
    const emailA = `rs-a-${Date.now()}@example.com`;
    const emailB = `rs-b-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'A', gender: 'M', age: 30, weight: 70, height: 170, experienceLevel: 'Beginner' });
    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'B', gender: 'M', age: 28, weight: 75, height: 180, experienceLevel: 'Beginner' });

    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelId = await createDuel(uidA, uidB);
    const weekId = getWeekId(new Date());

    const runPlan = { type: 'run', target: { distanceMeters: 2000, durationSeconds: 1200 } };
    const workoutPlan = { type: 'workout', exercises: [{id:'e1'}] };

    const { getOrCreateRunSession, makeRunId, getRunSession, startRunSession } = await import('./runSessions');

    let err = null;
    try {
      await getOrCreateRunSession(duelId, uidA, weekId, 1, workoutPlan);
    } catch (e) { err = e; }
    expect(err).not.toBeNull();

    // create run session on day 6 (Saturday)
    const session = await getOrCreateRunSession(duelId, uidA, weekId, 6, runPlan);
    expect(session.revision).toBe(1);
    expect(session.status).toBe('pending');
    expect(session.distanceMeters).toBe(0);
    expect(session.durationSeconds).toBe(0);

    const runId = makeRunId(uidA, weekId, 6);

    // starting the run should set status active and increment revision
    const started = await startRunSession(duelId, runId);
    expect(started.status).toBe('active');
    expect(started.revision).toBe(2);

    // partner can read
    await signInWithEmailAndPassword(auth, emailB, 'secret123');
    const partnerView = await getRunSession(duelId, runId);
    expect(partnerView.userId).toBe(uidA);

    // outsider cannot read
    const emailOut = `rs-out-${Date.now()}@example.com`;
    const credOut = await createUserWithEmailAndPassword(auth, emailOut, 'secret123');
    const uidOut = credOut.user.uid;
    await createUserDocument(uidOut, { email: emailOut, displayName: 'Out', gender: 'F', age: 24, weight: 55, height: 160, experienceLevel: 'Beginner' });
    await signInWithEmailAndPassword(auth, emailOut, 'secret123');
    let outsider = null;
    try {
      outsider = await getRunSession(duelId, runId);
    } catch (e) { outsider = null; }
    expect(outsider).toBeNull();
  });
});
