import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
  runTransaction,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { canUpdatePhysicalProfile } from './profilePolicy';

const EDITABLE_PROFILE_FIELDS = new Set([
  'displayName', 'avatarUrl', 'age', 'height', 'experienceLevel', 'objective',
  'equipment', 'preferredWorkoutMinutes', 'usualWorkoutTime',
  'notificationsEnabled', 'hideScreenshotLocation',
]);

export async function createUserDocument(uid, profile) {
  const normalizedEmail = profile.email.trim().toLowerCase();
  const batch = writeBatch(db);
  const privateRef = doc(db, 'users', uid);
  const publicRef = doc(db, 'publicProfiles', uid);
  const emailLookupRef = doc(db, 'emailLookups', normalizedEmail);
  const scoringProfileRef = doc(db, 'scoringProfiles', uid);

  batch.set(privateRef, {
    ...profile,
    email: normalizedEmail,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(publicRef, {
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? '',
  });
  batch.set(emailLookupRef, { uid });
  batch.set(scoringProfileRef, {
    gender: profile.gender,
    weight: profile.weight,
  });
  await batch.commit();
}

export async function getUserDocument(uid) {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const lookupSnapshot = await getDoc(doc(db, 'emailLookups', normalizedEmail));
  if (!lookupSnapshot.exists()) return null;

  const { uid } = lookupSnapshot.data();
  const publicSnapshot = await getDoc(doc(db, 'publicProfiles', uid));
  return {
    uid,
    email: normalizedEmail,
    ...(publicSnapshot.exists() ? publicSnapshot.data() : {}),
  };
}

export async function findActiveDuelForUser(uid) {
  const duelsRef = collection(db, 'duels');
  const [asUserA, asUserB] = await Promise.all([
    getDocs(query(duelsRef, where('userA_uid', '==', uid), where('status', '==', 'active'))),
    getDocs(query(duelsRef, where('userB_uid', '==', uid), where('status', '==', 'active'))),
  ]);

  const match = asUserA.docs[0] ?? asUserB.docs[0];
  if (!match) return null;

  const duel = { duelId: match.id, ...match.data() };
  const participantUids = [duel.userA_uid, duel.userB_uid];
  const profileSnapshots = await Promise.all(
    participantUids.map((participantUid) => getDoc(doc(db, 'publicProfiles', participantUid)))
  );

  return {
    ...duel,
    participantNames: Object.fromEntries(
      profileSnapshots.map((profileSnapshot, index) => [
        participantUids[index],
        profileSnapshot.exists() ? profileSnapshot.data().displayName : null,
      ])
    ),
    participantProfiles: Object.fromEntries(
      profileSnapshots.map((profileSnapshot, index) => [
        participantUids[index],
        profileSnapshot.exists()
          ? { displayName: profileSnapshot.data().displayName ?? null, avatarUrl: profileSnapshot.data().avatarUrl ?? '' }
          : { displayName: null, avatarUrl: '' },
      ])
    ),
  };
}

export async function updateUserProfile(uid, changes) {
  const updates = Object.fromEntries(
    Object.entries(changes).filter(([key, value]) => EDITABLE_PROFILE_FIELDS.has(key) && value !== undefined)
  );
  if (Object.keys(updates).length === 0) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
  if ('displayName' in updates || 'avatarUrl' in updates) {
    const publicUpdates = {};
    if ('displayName' in updates) publicUpdates.displayName = updates.displayName;
    if ('avatarUrl' in updates) publicUpdates.avatarUrl = updates.avatarUrl;
    batch.update(doc(db, 'publicProfiles', uid), publicUpdates);
  }
  await batch.commit();
}

export async function updatePhysicalProfile(uid, { gender, weight }) {
  const normalizedWeight = Number(weight);
  if (!['M', 'F'].includes(gender) || !Number.isFinite(normalizedWeight) || normalizedWeight < 20 || normalizedWeight > 500) {
    throw new Error('INVALID_PHYSICAL_PROFILE');
  }
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', uid);
    const scoringRef = doc(db, 'scoringProfiles', uid);
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error('PROFILE_NOT_FOUND');
    if (!canUpdatePhysicalProfile(snapshot.data())) throw new Error('PHYSICAL_PROFILE_LOCKED');
    if (snapshot.data().gender === gender && Number(snapshot.data().weight) === normalizedWeight) {
      throw new Error('PHYSICAL_PROFILE_UNCHANGED');
    }

    const physical = { gender, weight: normalizedWeight };
    transaction.update(userRef, {
      ...physical,
      physicalProfileUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(scoringRef, physical);
  });
}

export async function createDuel(userAUid, userBUid) {
  // Both partners land on /connect-partner after registering, so both are
  // expected to enter each other's email. Short-circuit if this caller is
  // already in an active duel, and derive the document ID deterministically
  // from the sorted uid pair so even a genuine race converges on a single
  // document (the second write becomes a same-doc update, which the rules
  // already allow for either participant).
  const existing = await findActiveDuelForUser(userAUid);
  if (existing) return existing.duelId;

  const [userASnapshot, userBSnapshot] = await Promise.all([
    getDoc(doc(db, 'scoringProfiles', userAUid)),
    getDoc(doc(db, 'scoringProfiles', userBUid)),
  ]);
  if (!userASnapshot.exists() || !userBSnapshot.exists()) {
    throw new Error('Both user profiles are required to create a duel.');
  }

  const userA = userASnapshot.data();
  const userB = userBSnapshot.data();
  const metricsWeight = {
    minutes: 0.25,
    exercises: 0.25,
    reps: 0.25,
    calories: 0.25,
  };
  const { weekStartDate, weekEndDate } = computeWeekBoundaries(new Date());
  const duelId = [userAUid, userBUid].sort().join('_');
  const docRef = doc(db, 'duels', duelId);
  await setDoc(docRef, {
    duelId,
    userA_uid: userAUid,
    userB_uid: userBUid,
    weekStartDate: Timestamp.fromDate(weekStartDate),
    weekEndDate: Timestamp.fromDate(weekEndDate),
    status: 'active',
    timezone: 'America/Mexico_City',
    scoringVersion: 1,
    scoringSnapshot: {
      users: {
        [userAUid]: { gender: userA.gender, weightKg: userA.weight },
        [userBUid]: { gender: userB.gender, weightKg: userB.weight },
      },
      metricsWeight,
    },
    rules: {
      normalizeByGender: true,
      metricsWeight,
    },
    createdAt: serverTimestamp(),
  });
  return duelId;
}

export function computeWeekBoundaries(referenceDate) {
  const day = referenceDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = (day + 6) % 7;

  const weekStartDate = new Date(referenceDate);
  weekStartDate.setUTCDate(referenceDate.getUTCDate() - daysSinceMonday);
  weekStartDate.setUTCHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
  weekEndDate.setUTCHours(23, 59, 59, 999);

  return { weekStartDate, weekEndDate };
}

export { createWorkout, updateWorkout, deleteWorkout, subscribeToWorkouts, subscribeToDuelWeek } from './workouts';

