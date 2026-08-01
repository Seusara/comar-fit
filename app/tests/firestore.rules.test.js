// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, afterAll, afterEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    // Deliberately NOT 'comar-fit-dev' (used by src/firebase/*.test.js):
    // Vitest runs test files in parallel and this suite's afterEach
    // clearFirestore() would otherwise wipe data mid-flight for those suites.
    projectId: 'comar-fit-rules-test',
    firestore: {
      rules: readFileSync(fileURLToPath(new URL('../firestore.rules', import.meta.url)), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('firestore.rules', () => {
  it('lets a user create their own user document', async () => {
    const alice = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
    const ref = doc(alice.firestore(), 'users', 'alice-uid');
    await assertSucceeds(setDoc(ref, {
      uid: 'alice-uid',
      email: 'alice@example.com',
      displayName: 'Alice',
      gender: 'F',
      age: 28,
      weight: 60,
      height: 165,
      experienceLevel: 'Advanced',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it("blocks a user from creating another user's document", async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    const ref = doc(alice.firestore(), 'users', 'bob-uid');
    await assertFails(setDoc(ref, { email: 'bob@example.com' }));
  });

  it('blocks unauthenticated writes to a user document', async () => {
    const anon = testEnv.unauthenticatedContext();
    const ref = doc(anon.firestore(), 'users', 'alice-uid');
    await assertFails(setDoc(ref, { email: 'alice@example.com' }));
  });

  it("blocks a user from reading another user's private profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'bob-uid'), {
        uid: 'bob-uid',
        email: 'bob@example.com',
        displayName: 'Bob',
        gender: 'M',
        weight: 80,
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    await assertFails(getDoc(doc(alice.firestore(), 'users', 'bob-uid')));
  });

  it.each([
    ['uid', 'mallory-uid'],
    ['email', 'mallory@example.com'],
  ])('blocks the owner from changing immutable private field %s', async (field, value) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'alice-uid'), {
        uid: 'alice-uid',
        email: 'alice@example.com',
        displayName: 'Alice',
        gender: 'M',
        weight: 70,
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    await assertFails(updateDoc(doc(alice.firestore(), 'users', 'alice-uid'), { [field]: value }));
  });

  it('allows profile preferences but rejects a physical update before 30 days', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'alice-uid'), {
        uid: 'alice-uid', email: 'alice@example.com', displayName: 'Alice',
        gender: 'F', weight: 60,
        physicalProfileUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const userRef = doc(alice.firestore(), 'users', 'alice-uid');
    await assertSucceeds(updateDoc(userRef, {
      notificationsEnabled: true,
      hideScreenshotLocation: true,
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(userRef, {
      weight: 61,
      physicalProfileUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  it('allows an atomic physical update after 30 days and keeps scoring profile in sync', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'users', 'alice-uid'), {
        uid: 'alice-uid', email: 'alice@example.com', displayName: 'Alice',
        gender: 'F', weight: 60,
        physicalProfileUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)),
      });
      await setDoc(doc(adminDb, 'scoringProfiles', 'alice-uid'), { gender: 'F', weight: 60 });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const aliceDb = alice.firestore();
    const batch = writeBatch(aliceDb);
    batch.update(doc(aliceDb, 'users', 'alice-uid'), {
      gender: 'F', weight: 62,
      physicalProfileUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.update(doc(aliceDb, 'scoringProfiles', 'alice-uid'), { gender: 'F', weight: 62 });
    await assertSucceeds(batch.commit());
  });

  it.each([
    ['an unsupported gender', { gender: 'X', weight: 62 }],
    ['a negative weight', { gender: 'F', weight: -1 }],
    ['an implausible weight', { gender: 'F', weight: 900 }],
    ['unchanged physical data', { gender: 'F', weight: 60 }],
  ])('rejects %s even when the monthly window is open', async (_case, physical) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'users', 'alice-uid'), {
        uid: 'alice-uid', email: 'alice@example.com', displayName: 'Alice',
        gender: 'F', weight: 60,
        physicalProfileUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)),
      });
      await setDoc(doc(adminDb, 'scoringProfiles', 'alice-uid'), { gender: 'F', weight: 60 });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const aliceDb = alice.firestore();
    const batch = writeBatch(aliceDb);
    batch.update(doc(aliceDb, 'users', 'alice-uid'), {
      ...physical, physicalProfileUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.update(doc(aliceDb, 'scoringProfiles', 'alice-uid'), physical);
    await assertFails(batch.commit());
  });

  it('allows only the owner to write an allow-listed public profile', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    const aliceRef = doc(alice.firestore(), 'publicProfiles', 'alice-uid');
    const bobRef = doc(alice.firestore(), 'publicProfiles', 'bob-uid');

    await assertSucceeds(setDoc(aliceRef, { displayName: 'Alice', avatarUrl: '' }));
    await assertFails(setDoc(bobRef, { displayName: 'Bob', avatarUrl: '' }));
    await assertFails(setDoc(aliceRef, { displayName: 'Alice', avatarUrl: '', email: 'secret@example.com' }));
  });

  it('allows authenticated reads of public profiles but blocks anonymous reads', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'publicProfiles', 'bob-uid'), {
        displayName: 'Bob',
        avatarUrl: '',
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(alice.firestore(), 'publicProfiles', 'bob-uid')));
    await assertFails(getDoc(doc(anon.firestore(), 'publicProfiles', 'bob-uid')));
  });

  it('allows an authenticated user to publish and read a minimal email lookup', async () => {
    const alice = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
    const ref = doc(alice.firestore(), 'emailLookups', 'alice@example.com');

    await assertSucceeds(setDoc(ref, { uid: 'alice-uid' }));

    const bob = testEnv.authenticatedContext('bob-uid');
    await assertSucceeds(getDoc(doc(bob.firestore(), 'emailLookups', 'alice@example.com')));
    await assertFails(updateDoc(ref, { uid: 'mallory-uid' }));
  });

  it('lets a duel participant read the duel document', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'duels', 'duel-1'), {
        userA_uid: 'alice-uid',
        userB_uid: 'bob-uid',
        status: 'active',
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const ref = doc(alice.firestore(), 'duels', 'duel-1');
    await assertSucceeds(getDoc(ref));
  });

  it('blocks a non-participant from reading the duel document', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'duels', 'duel-1'), {
        userA_uid: 'alice-uid',
        userB_uid: 'bob-uid',
        status: 'active',
      });
    });

    const carol = testEnv.authenticatedContext('carol-uid');
    const ref = doc(carol.firestore(), 'duels', 'duel-1');
    await assertFails(getDoc(ref));
  });

  it('lets a user create a duel where they are userA_uid', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const firestore = ctx.firestore();
      await setDoc(doc(firestore, 'users', 'alice-uid'), { gender: 'F', weight: 60 });
      await setDoc(doc(firestore, 'users', 'bob-uid'), { gender: 'M', weight: 80 });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const ref = doc(alice.firestore(), 'duels', 'alice-uid_bob-uid');
    await assertSucceeds(
      setDoc(ref, {
        duelId: 'alice-uid_bob-uid',
        userA_uid: 'alice-uid',
        userB_uid: 'bob-uid',
        status: 'active',
        weekStartDate: new Date(),
        weekEndDate: new Date(),
        timezone: 'America/Mexico_City',
        scoringVersion: 1,
        scoringSnapshot: {
          users: {
            'alice-uid': { gender: 'F', weightKg: 60 },
            'bob-uid': { gender: 'M', weightKg: 80 },
          },
          metricsWeight: { minutes: 0.25, exercises: 0.25, reps: 0.25, calories: 0.25 },
        },
        rules: {
          normalizeByGender: true,
          metricsWeight: { minutes: 0.25, exercises: 0.25, reps: 0.25, calories: 0.25 },
        },
        createdAt: new Date(),
      })
    );
  });

  it('blocks a user from creating a duel where they are only userB_uid', async () => {
    const bob = testEnv.authenticatedContext('bob-uid');
    const ref = doc(bob.firestore(), 'duels', 'alice-uid_bob-uid');
    await assertFails(
      setDoc(ref, { userA_uid: 'alice-uid', userB_uid: 'bob-uid', status: 'active' })
    );
  });

  it.each([
    ['members', { userB_uid: 'mallory-uid' }],
    ['status', { status: 'completed' }],
    ['timezone', { timezone: 'UTC' }],
    ['scoring version', { scoringVersion: 999 }],
    ['rules', { rules: { normalizeByGender: false } }],
    ['scoring snapshot', { scoringSnapshot: { userA: { gender: 'F', weightKg: 1 } } }],
  ])('blocks participants from taking over duel %s', async (_field, mutation) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'duels', 'alice-uid_bob-uid'), {
        duelId: 'alice-uid_bob-uid',
        userA_uid: 'alice-uid',
        userB_uid: 'bob-uid',
        status: 'active',
        timezone: 'America/Mexico_City',
        scoringVersion: 1,
        scoringSnapshot: {
          userA: { gender: 'M', weightKg: 70 },
          userB: { gender: 'F', weightKg: 60 },
        },
        rules: { normalizeByGender: true },
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    await assertFails(updateDoc(doc(alice.firestore(), 'duels', 'alice-uid_bob-uid'), mutation));
  });
});
