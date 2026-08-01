import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { calculateStreak, calculateWeeklyScore, deriveWorkoutMetrics, getWeekWindow } from './scoring.js';

const TIMEZONE = 'America/Mexico_City';
const EDIT_WINDOW_MS = 10 * 60 * 1000;

function snapshotData(snapshot) {
  return snapshot?.exists ? snapshot.data() : null;
}

function rawFingerprint(data) {
  if (!data) return null;
  return JSON.stringify({
    userId: data.userId,
    exercises: data.exercises,
    revision: data.revision,
    performedAt: data.performedAt?.toMillis?.() ?? null,
  });
}

function sumMetrics(workouts, weightKg) {
  const totals = { minutes: 0, exerciseCount: 0, reps: 0, calories: 0 };
  const exerciseIds = new Set();
  for (const workout of workouts) {
    const metrics = deriveWorkoutMetrics(workout.exercises, weightKg);
    totals.minutes += metrics.minutes;
    totals.reps += metrics.reps;
    totals.calories += metrics.calories;
    for (const exercise of workout.exercises ?? []) {
      exerciseIds.add(exercise.exerciseId ?? exercise.id ?? exercise.name);
    }
  }
  totals.exerciseCount = exerciseIds.size;
  return totals;
}

function validateWorkout(data, duel) {
  if (![duel.userA_uid, duel.userB_uid].includes(data.userId)) throw new Error('Invalid workout owner');
  if (!Array.isArray(data.exercises) || data.exercises.length < 1 || data.exercises.length > 20) {
    throw new Error('Workout must contain between 1 and 20 exercises');
  }
  const totalMinutes = data.exercises.reduce((sum, exercise) => {
    const sets = Number(exercise.sets);
    const reps = Number(exercise.reps);
    const minutes = Number(exercise.durationMinutes);
    if (sets < 1 || sets > 20 || reps < 1 || reps > 500 || minutes < 1 || minutes > 300) {
      throw new Error('Exercise values are outside the allowed range');
    }
    return sum + minutes;
  }, 0);
  if (totalMinutes > 300) throw new Error('Workout duration exceeds 300 minutes');
}

export async function recalculateDuelWeek({ db, duelId, workoutId, before, after }) {
  const beforeData = snapshotData(before);
  const afterData = snapshotData(after);
  if (beforeData && afterData && rawFingerprint(beforeData) === rawFingerprint(afterData)) return;

  const source = afterData ?? beforeData;
  if (!source) return;

  const duelRef = db.doc(`duels/${duelId}`);
  const duelSnapshot = await duelRef.get();
  if (!duelSnapshot.exists) throw new Error(`Duel ${duelId} not found`);
  const duel = duelSnapshot.data();
  const timezone = duel.timezone ?? TIMEZONE;
  const profiles = duel.scoringSnapshot?.users ?? {};
  const workoutRef = db.doc(`duels/${duelId}/workouts/${workoutId}`);

  if (afterData) {
    validateWorkout(afterData, duel);
    const profile = profiles[afterData.userId];
    if (!profile) throw new Error(`Scoring profile for ${afterData.userId} not found`);
    const metrics = deriveWorkoutMetrics(afterData.exercises, profile.weightKg);
    const createdAt = afterData.createdAt ?? Timestamp.now();
    await workoutRef.set({
      totalMinutes: metrics.minutes,
      totalReps: metrics.reps,
      totalExercises: metrics.exerciseCount,
      exerciseCount: metrics.exerciseCount,
      estimatedCalories: Math.round(metrics.calories * 100) / 100,
      sessionScore: calculateWeeklyScore(metrics, profile.gender),
      editableUntil: afterData.editableUntil ?? Timestamp.fromMillis(createdAt.toMillis() + EDIT_WINDOW_MS),
      status: 'scored',
      scoredAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  const performedAt = source.performedAt?.toDate?.() ?? new Date();
  const weekWindow = getWeekWindow(performedAt, timezone);
  const weekId = weekWindow.start.toISODate();
  const allSnapshot = await duelRef.collection('workouts').get();
  const allWorkouts = allSnapshot.docs.map((item) => ({ workoutId: item.id, ...item.data() }));
  const weekWorkouts = allWorkouts.filter((workout) => {
    const date = workout.performedAt?.toDate?.();
    if (!date) return false;
    const local = DateTime.fromJSDate(date, { zone: timezone });
    return local >= weekWindow.start && local < weekWindow.end;
  });

  const scores = {};
  const streaks = {};
  const lastWorkoutDay = {};
  for (const uid of [duel.userA_uid, duel.userB_uid]) {
    const profile = profiles[uid];
    if (!profile) continue;
    const userWeek = weekWorkouts.filter((workout) => workout.userId === uid);
    scores[uid] = { score: calculateWeeklyScore(sumMetrics(userWeek, profile.weightKg), profile.gender) };
    const days = allWorkouts
      .filter((workout) => workout.userId === uid && workout.performedAt?.toDate)
      .map((workout) => DateTime.fromJSDate(workout.performedAt.toDate(), { zone: timezone }).toISODate());
    streaks[uid] = calculateStreak(days, DateTime.now().setZone(timezone));
    lastWorkoutDay[uid] = days.sort().at(-1) ?? null;
  }

  await duelRef.collection('weeks').doc(weekId).set({
    weekStartAt: Timestamp.fromDate(weekWindow.start.toJSDate()),
    weekEndAt: Timestamp.fromDate(weekWindow.end.toJSDate()),
    scores,
    streaks,
    lastWorkoutDay,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
