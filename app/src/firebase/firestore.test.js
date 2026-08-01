import { describe, it, expect } from 'vitest';
import {
  computeWeekBoundaries,
  createUserDocument,
  getUserDocument,
  findUserByEmail,
  findActiveDuelForUser,
  createDuel,
  updateUserProfile,
  updatePhysicalProfile,
} from './firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './config';

describe('computeWeekBoundaries', () => {
  it('returns Monday 00:00 UTC through Sunday 23:59:59.999 UTC for a mid-week date', () => {
    const wednesday = new Date('2024-01-03T15:30:00.000Z');
    const { weekStartDate, weekEndDate } = computeWeekBoundaries(wednesday);

    expect(weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(weekEndDate.toISOString()).toBe('2024-01-07T23:59:59.999Z');
  });

  it('keeps Sunday in the same week as the preceding Monday', () => {
    const sunday = new Date('2024-01-07T10:00:00.000Z');
    const { weekStartDate, weekEndDate } = computeWeekBoundaries(sunday);

    expect(weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(weekEndDate.toISOString()).toBe('2024-01-07T23:59:59.999Z');
  });

  it('maps Monday at midnight to itself as the week start', () => {
    const monday = new Date('2024-01-01T00:00:00.000Z');
    const { weekStartDate, weekEndDate } = computeWeekBoundaries(monday);

    expect(weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(weekEndDate.toISOString()).toBe('2024-01-07T23:59:59.999Z');
  });
});

function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

// Returns the sorted IDs of every duel document naming this uid on either
// side. Must be called while signed in as that uid (the read rule checks the
// caller against userA_uid/userB_uid).
async function countDuelDocsFor(uid) {
  const duelsRef = collection(db, 'duels');
  const [asUserA, asUserB] = await Promise.all([
    getDocs(query(duelsRef, where('userA_uid', '==', uid))),
    getDocs(query(duelsRef, where('userB_uid', '==', uid))),
  ]);
  const ids = new Set([...asUserA.docs, ...asUserB.docs].map((d) => d.id));
  return [...ids].sort();
}

describe('createUserDocument / getUserDocument', () => {
  it('creates a user document and reads it back', async () => {
    const credential = await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const uid = credential.user.uid;
    const profile = {
      email: credential.user.email,
      displayName: 'Comar',
      gender: 'M',
      age: 30,
      weight: 75,
      height: 178,
      experienceLevel: 'Intermediate',
    };

    await createUserDocument(uid, profile);
    const stored = await getUserDocument(uid);

    expect(stored).toMatchObject(profile);
    // The design spec requires uid to be persisted inside the document data
    // itself, not just be the document key.
    expect(stored.uid).toBe(uid);

    const publicSnap = await getDoc(doc(db, 'publicProfiles', uid));
    expect(publicSnap.data()).toEqual({ displayName: 'Comar', avatarUrl: '' });
  });

  it('returns null for a user document that does not exist', async () => {
    const credential = await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const stored = await getUserDocument(credential.user.uid);
    expect(stored).toBeNull();
  });

  it('updates editable profile fields and mirrors the public display name', async () => {
    const credential = await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const uid = credential.user.uid;
    await createUserDocument(uid, {
      email: credential.user.email,
      displayName: 'Nombre anterior',
      gender: 'M', age: 30, weight: 75, height: 178, experienceLevel: 'Intermediate',
    });

    await updateUserProfile(uid, {
      displayName: 'Aaron',
      objective: 'Ganar fuerza',
      notificationsEnabled: true,
    });

    expect(await getUserDocument(uid)).toMatchObject({
      displayName: 'Aaron', objective: 'Ganar fuerza', notificationsEnabled: true,
    });
    expect((await getDoc(doc(db, 'publicProfiles', uid))).data().displayName).toBe('Aaron');
  });

  it('updates physical data in both profile stores when eligible', async () => {
    const credential = await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const uid = credential.user.uid;
    await createUserDocument(uid, {
      email: credential.user.email,
      displayName: 'Aaron',
      gender: 'M', age: 30, weight: 75, height: 178, experienceLevel: 'Intermediate',
    });

    await updatePhysicalProfile(uid, { gender: 'M', weight: 76 });

    expect(await getUserDocument(uid)).toMatchObject({ gender: 'M', weight: 76 });
    expect((await getDoc(doc(db, 'scoringProfiles', uid))).data()).toEqual({ gender: 'M', weight: 76 });
  });
});

describe('findUserByEmail', () => {
  it('finds a user document by email', async () => {
    const email = `find-${Date.now()}@example.com`;
    const credential = await createUserWithEmailAndPassword(auth, email, 'secret123');
    const uid = credential.user.uid;
    await createUserDocument(uid, {
      email,
      displayName: 'Alex',
      gender: 'F',
      age: 28,
      weight: 60,
      height: 165,
      experienceLevel: 'Advanced',
    });

    const found = await findUserByEmail(email);
    expect(found).toMatchObject({ uid, email, displayName: 'Alex' });
  });

  it('finds a user regardless of the casing and whitespace of the query email', async () => {
    const email = `case-${Date.now()}@example.com`;
    const credential = await createUserWithEmailAndPassword(auth, email, 'secret123');
    const uid = credential.user.uid;
    await createUserDocument(uid, {
      email,
      displayName: 'Casey',
      gender: 'F',
      age: 31,
      weight: 62,
      height: 168,
      experienceLevel: 'Beginner',
    });

    const found = await findUserByEmail(`  ${email.toUpperCase()}  `);
    expect(found).toMatchObject({ uid, email });
  });

  it('returns null when no user has that email', async () => {
    await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const found = await findUserByEmail(`nobody-${Date.now()}@example.com`);
    expect(found).toBeNull();
  });
});

describe('createDuel / findActiveDuelForUser', () => {
  it('creates a duel and finds it for both participants', async () => {
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

    // createUserWithEmailAndPassword left the emulator signed in as B; the duel
    // create rule requires the caller to be one of the two participants, so
    // switch back to A before creating it (matching how ConnectPartner calls
    // createDuel as the currently signed-in user in Task 10).
    await signInWithEmailAndPassword(auth, emailA, 'secret123');

    const duelId = await createDuel(userAUid, userBUid);
    expect(duelId).toEqual(expect.any(String));

    // Verify duelId is actually persisted inside the document data itself
    // (not just derivable from the doc ID at read time).
    const rawSnap = await getDoc(doc(db, 'duels', duelId));
    expect(rawSnap.data().duelId).toBe(duelId);
    expect(rawSnap.data()).toMatchObject({
      timezone: 'America/Mexico_City',
      scoringVersion: 1,
      scoringSnapshot: {
        users: {
          [userAUid]: { gender: 'M', weightKg: 80 },
          [userBUid]: { gender: 'F', weightKg: 60 },
        },
        metricsWeight: {
          minutes: 0.25,
          exercises: 0.25,
          reps: 0.25,
          calories: 0.25,
        },
      },
    });

    const duelForA = await findActiveDuelForUser(userAUid);
    expect(duelForA).toMatchObject({
      duelId,
      userA_uid: userAUid,
      userB_uid: userBUid,
      status: 'active',
      participantNames: {
        [userAUid]: 'Aaron',
        [userBUid]: 'Alexandra',
      },
      participantProfiles: {
        [userAUid]: { displayName: 'Aaron', avatarUrl: '' },
        [userBUid]: { displayName: 'Alexandra', avatarUrl: '' },
      },
    });

    // Reading B's side of the duel requires being signed in as B (the read
    // rule checks the caller against userA_uid/userB_uid on each document).
    await signInWithEmailAndPassword(auth, emailB, 'secret123');
    const duelForB = await findActiveDuelForUser(userBUid);
    expect(duelForB).toMatchObject({ duelId, userA_uid: userAUid, userB_uid: userBUid, status: 'active' });
  });

  it('converges on a single duel when both partners run the connect flow', async () => {
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

    // Both users land on /connect-partner after registering, so both enter
    // each other's email. Simulate A connecting first...
    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelIdFromA = await createDuel(userAUid, userBUid);

    // ...and then B doing the same in the opposite direction.
    await signInWithEmailAndPassword(auth, emailB, 'secret123');
    const duelIdFromB = await createDuel(userBUid, userAUid);

    expect(duelIdFromB).toBe(duelIdFromA);

    // Exactly one duel document exists for this pair (as B, who can read any
    // duel document naming them on either side).
    const duelIds = await countDuelDocsFor(userBUid);
    expect(duelIds).toEqual([duelIdFromA]);

    // And both participants resolve to that same duel.
    const duelForB = await findActiveDuelForUser(userBUid);
    expect(duelForB.duelId).toBe(duelIdFromA);

    await signInWithEmailAndPassword(auth, emailA, 'secret123');
    const duelForA = await findActiveDuelForUser(userAUid);
    expect(duelForA.duelId).toBe(duelIdFromA);

    // The surviving document keeps A as userA_uid -- B's call short-circuited
    // rather than writing a second (or overwriting) document.
    expect(duelForA).toMatchObject({ userA_uid: userAUid, userB_uid: userBUid, status: 'active' });
  });

  it('returns null when the user has no active duel', async () => {
    const credential = await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const duel = await findActiveDuelForUser(credential.user.uid);
    expect(duel).toBeNull();
  });
});
