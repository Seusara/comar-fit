import { formatDayKey, resolvePerformedAt, toDate } from '../utils/dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const MEXICO_CITY = 'America/Mexico_City';

function shiftKey(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return value.toISOString().slice(0, 10);
}

function mexicoCityOffsetMs(value) {
  const date = toDate(value);
  if (!date) return 0;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEXICO_CITY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return localAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function mexicoCityMidnight(dayKey) {
  const nominalUtc = new Date(`${dayKey}T00:00:00.000Z`);
  let result = new Date(nominalUtc.getTime() - mexicoCityOffsetMs(nominalUtc));
  result = new Date(nominalUtc.getTime() - mexicoCityOffsetMs(result));
  return result;
}

export function weekStartKey(value) {
  const dayKey = formatDayKey(value);
  if (!dayKey) return null;
  const noon = new Date(`${dayKey}T12:00:00.000Z`);
  const daysSinceMonday = (noon.getUTCDay() + 6) % 7;
  return shiftKey(dayKey, -daysSinceMonday);
}

export function weekDayNumber(value = new Date()) {
  const dayKey = formatDayKey(value);
  const startKey = weekStartKey(value);
  if (!dayKey || !startKey) return 1;
  const elapsed = Date.parse(`${dayKey}T12:00:00.000Z`) - Date.parse(`${startKey}T12:00:00.000Z`);
  return Math.min(7, Math.max(1, Math.round(elapsed / DAY_MS) + 1));
}

export function endOfMexicoCityDay(value = new Date()) {
  const dayKey = formatDayKey(value);
  if (!dayKey) return null;
  return mexicoCityMidnight(shiftKey(dayKey, 1));
}

function streakFor(dayKeys, referenceKey) {
  const keys = new Set(dayKeys);
  let cursor = keys.has(referenceKey) ? referenceKey : shiftKey(referenceKey, -1);
  let streak = 0;
  while (keys.has(cursor)) {
    streak += 1;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}

function participant(uid, entries, referenceKey) {
  const unique = [...new Set(entries.map(({ dayKey }) => dayKey))].sort();
  return {
    uid,
    activeDays: unique.length,
    percentage: Math.round((unique.length / 7) * 100),
    streak: streakFor(unique, referenceKey),
    dayKeys: unique,
    workoutCount: entries.length,
    totalMinutes: entries.reduce(
      (total, { totalMinutes }) => total + Math.max(0, Number(totalMinutes) || 0),
      0,
    ),
  };
}

function resultFor(participantA, participantB) {
  if (participantA.activeDays === participantB.activeDays) return 'tied';
  return participantA.activeDays > participantB.activeDays ? 'participantA' : 'participantB';
}

function createWeek(weekId, uidA, uidB, groupedWorkouts, currentDayKey) {
  const endKey = shiftKey(weekId, 6);
  const referenceKey = currentDayKey >= weekId && currentDayKey <= endKey ? currentDayKey : endKey;
  const participantA = participant(uidA, groupedWorkouts.get(weekId)?.get(uidA) ?? [], referenceKey);
  const participantB = participant(uidB, groupedWorkouts.get(weekId)?.get(uidB) ?? [], referenceKey);
  return {
    weekId,
    startKey: weekId,
    endKey,
    participantA,
    participantB,
    result: resultFor(participantA, participantB),
  };
}

export function deriveWeeklyDuelHistory(workouts = [], duel, now = new Date()) {
  const uidA = duel?.userA_uid;
  const uidB = duel?.userB_uid;
  const currentWeekId = weekStartKey(now);
  const currentDayKey = formatDayKey(now);
  const groupedWorkouts = new Map();
  const validWorkoutDates = [];

  for (const workout of Array.isArray(workouts) ? workouts : []) {
    if (workout?.userId !== uidA && workout?.userId !== uidB) continue;
    const performedAt = resolvePerformedAt(workout);
    const weekId = weekStartKey(performedAt);
    const workoutDay = formatDayKey(performedAt);
    if (!performedAt || !weekId || !workoutDay || weekId > currentWeekId) continue;

    validWorkoutDates.push(performedAt);
    if (!groupedWorkouts.has(weekId)) groupedWorkouts.set(weekId, new Map());
    const weekParticipants = groupedWorkouts.get(weekId);
    if (!weekParticipants.has(workout.userId)) weekParticipants.set(workout.userId, []);
    weekParticipants.get(workout.userId).push({
      dayKey: workoutDay,
      totalMinutes: workout.totalMinutes,
    });
  }

  const createdAt = toDate(duel?.createdAt);
  const oldestWorkout = validWorkoutDates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  let firstWeekId = weekStartKey(createdAt ?? oldestWorkout ?? now) ?? currentWeekId;
  if (firstWeekId > currentWeekId) firstWeekId = currentWeekId;

  const weeks = [];
  for (let weekId = firstWeekId; weekId <= currentWeekId; weekId = shiftKey(weekId, 7)) {
    weeks.push(createWeek(weekId, uidA, uidB, groupedWorkouts, currentDayKey));
  }

  const currentWeek = weeks[weeks.length - 1]
    ?? createWeek(currentWeekId, uidA, uidB, groupedWorkouts, currentDayKey);
  return {
    currentWeek,
    completedWeeks: weeks.slice(0, -1).reverse(),
  };
}
