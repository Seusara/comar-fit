import { formatDayKey, resolvePerformedAt, toDate } from '../utils/dates';

function shiftKey(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return value.toISOString().slice(0, 10);
}

export function weekStartKey(value) {
  const dayKey = formatDayKey(value);
  if (!dayKey) return null;
  const noon = new Date(`${dayKey}T12:00:00.000Z`);
  const daysSinceMonday = (noon.getUTCDay() + 6) % 7;
  return shiftKey(dayKey, -daysSinceMonday);
}

function participant(uid, dayKeys) {
  const unique = [...new Set(dayKeys)].sort();
  return {
    uid,
    activeDays: unique.length,
    percentage: Math.round((unique.length / 7) * 100),
    dayKeys: unique,
  };
}

function resultFor(participantA, participantB) {
  if (participantA.activeDays === participantB.activeDays) return 'tied';
  return participantA.activeDays > participantB.activeDays ? 'participantA' : 'participantB';
}

function createWeek(weekId, uidA, uidB, groupedDays) {
  const participantA = participant(uidA, groupedDays.get(weekId)?.get(uidA) ?? []);
  const participantB = participant(uidB, groupedDays.get(weekId)?.get(uidB) ?? []);
  return {
    weekId,
    startKey: weekId,
    endKey: shiftKey(weekId, 6),
    participantA,
    participantB,
    result: resultFor(participantA, participantB),
  };
}

export function deriveWeeklyDuelHistory(workouts = [], duel, now = new Date()) {
  const uidA = duel?.userA_uid;
  const uidB = duel?.userB_uid;
  const currentWeekId = weekStartKey(now);
  const groupedDays = new Map();
  const validWorkoutDates = [];

  for (const workout of Array.isArray(workouts) ? workouts : []) {
    if (workout?.userId !== uidA && workout?.userId !== uidB) continue;
    const performedAt = resolvePerformedAt(workout);
    const weekId = weekStartKey(performedAt);
    const workoutDay = formatDayKey(performedAt);
    if (!performedAt || !weekId || !workoutDay || weekId > currentWeekId) continue;

    validWorkoutDates.push(performedAt);
    if (!groupedDays.has(weekId)) groupedDays.set(weekId, new Map());
    const weekParticipants = groupedDays.get(weekId);
    if (!weekParticipants.has(workout.userId)) weekParticipants.set(workout.userId, []);
    weekParticipants.get(workout.userId).push(workoutDay);
  }

  const createdAt = toDate(duel?.createdAt);
  const oldestWorkout = validWorkoutDates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  let firstWeekId = weekStartKey(createdAt ?? oldestWorkout ?? now) ?? currentWeekId;
  if (firstWeekId > currentWeekId) firstWeekId = currentWeekId;

  const weeks = [];
  for (let weekId = firstWeekId; weekId <= currentWeekId; weekId = shiftKey(weekId, 7)) {
    weeks.push(createWeek(weekId, uidA, uidB, groupedDays));
  }

  const currentWeek = weeks[weeks.length - 1] ?? createWeek(currentWeekId, uidA, uidB, groupedDays);
  return {
    currentWeek,
    completedWeeks: weeks.slice(0, -1).reverse(),
  };
}
