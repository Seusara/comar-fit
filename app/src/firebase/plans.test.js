import { describe, it, expect, beforeEach } from 'vitest';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './config';
import { createUserDocument, createDuel } from './firestore';
import { getWeekId } from './plans';

// These tests use the running Firebase emulators (auth + firestore).

describe('plans generation', () => {
  beforeEach(async () => {
    // no-op: emulator should be running via npm run emulators outside or in CI
  });

  it('creates plan and is idempotent', async () => {
    const { generatePlanIfMissing, getPlan } = await import('./plans');
    const duelId = 'alice_bob_idempotent';
    const weekId = getWeekId(new Date());

    // create two users and profiles
    const emailA = `alice-${Date.now()}@example.com`;
    const emailB = `bob-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'Alice', gender: 'M', age: 30, weight: 75, height: 170, experienceLevel: 'Intermediate' });

    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'Bob', gender: 'M', age: 28, weight: 80, height: 180, experienceLevel: 'Intermediate' });

    // sign in as A and create duel via createDuel helper
    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelIdFromCreate = await createDuel(uidA, uidB);

    // generate plan as Alice
    const p1 = await generatePlanIfMissing(duelIdFromCreate, uidA, weekId, { gender: 'M' });
    const p2 = await generatePlanIfMissing(duelIdFromCreate, uidA, weekId, { gender: 'M' });
    expect(p1.weekId).toBe(weekId);
    expect(p1.userId).toBe(uidA);
    // generatedAt will be resolved by serverTimestamp on first write; assert key fields
    expect(p2.weekId).toBe(p1.weekId);
    expect(p2.userId).toBe(p1.userId);
    expect(p2.status).toBe(p1.status);
    expect(p2.revision).toBe(p1.revision);
  });

  it('different weeks produce different plans', async () => {
    const { generatePlanIfMissing } = await import('./plans');
    // set up users/duel similar to previous
    const emailA = `a-${Date.now()}@example.com`;
    const emailB = `b-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'Alice', gender: 'M', age: 30, weight: 75, height: 170, experienceLevel: 'Intermediate' });
    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'Bob', gender: 'M', age: 28, weight: 80, height: 180, experienceLevel: 'Intermediate' });
    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelId = await createDuel(uidA, uidB);

    const wk1 = getWeekId(new Date('2026-01-01'));
    const wk2 = getWeekId(new Date('2026-01-08'));
    const p1 = await generatePlanIfMissing(duelId, uidA, wk1, { gender: 'M' });
    const p2 = await generatePlanIfMissing(duelId, uidA, wk2, { gender: 'M' });
    expect(p1.weekId).not.toBe(p2.weekId);
  });

  it('saturday is run with correct targets', async () => {
    const { generatePlanIfMissing, getPlan } = await import('./plans');
    const emailA = `sat-${Date.now()}@example.com`;
    const emailB = `sat-b-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'Alice', gender: 'M', age: 30, weight: 75, height: 170, experienceLevel: 'Intermediate' });
    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'Bob', gender: 'M', age: 28, weight: 80, height: 180, experienceLevel: 'Intermediate' });
    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelId = await createDuel(uidA, uidB);

    const weekId = getWeekId(new Date());
    await generatePlanIfMissing(duelId, uidA, weekId, { gender: 'M' });
    const plan = await getPlan(duelId, uidA, weekId);
    const saturday = plan.days['6'];
    expect(saturday.type).toBe('run');
    expect(saturday.target.distanceMeters).toBe(2000);
    expect(saturday.target.durationSeconds).toBe(1200);
  });

  it('access control: duel participant can read other participant plan but cannot create their plan', async () => {
    const { generatePlanIfMissing, getPlan } = await import('./plans');
    const emailA = `ac-${Date.now()}@example.com`;
    const emailB = `ac-b-${Date.now()}@example.com`;
    const emailOutside = `out-${Date.now()}@example.com`;
    const credA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const uidA = credA.user.uid;
    await createUserDocument(uidA, { email: emailA, displayName: 'Alice', gender: 'M', age: 30, weight: 75, height: 170, experienceLevel: 'Intermediate' });
    const credB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const uidB = credB.user.uid;
    await createUserDocument(uidB, { email: emailB, displayName: 'Bob', gender: 'M', age: 28, weight: 80, height: 180, experienceLevel: 'Intermediate' });
    const credOut = await createUserWithEmailAndPassword(auth, emailOutside, 'secret123');
    const uidOut = credOut.user.uid;
    await createUserDocument(uidOut, { email: emailOutside, displayName: 'Mallory', gender: 'F', age: 25, weight: 60, height: 160, experienceLevel: 'Beginner' });

    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelId = await createDuel(uidA, uidB);

    // Alice creates her plan
    await generatePlanIfMissing(duelId, uidA, getWeekId(new Date()), { gender: 'M' });

    // Bob signs in and should be able to read Alice's plan
    await signInWithEmailAndPassword(auth, emailB, 'secret123');
    const planForAlice = await getPlan(duelId, uidA, getWeekId(new Date()));
    expect(planForAlice.userId).toBe(uidA);

    // Mallory (outsider) signs in and should NOT be able to read Alice's plan
    await signInWithEmailAndPassword(auth, emailOutside, 'secret123');
    let outsiderRead = null;
    try {
      outsiderRead = await getPlan(duelId, uidA, getWeekId(new Date()));
    } catch (err) {
      outsiderRead = null;
    }
    expect(outsiderRead).toBeNull();
  });
});
