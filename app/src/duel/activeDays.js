const DUEL_TIME_ZONE = 'America/Mexico_City';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DUEL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return toDate(value.toDate());
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function dayKey(value) {
  const date = toDate(value);
  return date ? dayFormatter.format(date) : null;
}

function shiftDayKey(key, amount) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

function currentStreak(dayKeys, now) {
  if (dayKeys.size === 0) return 0;
  const today = dayKey(now);
  if (!today) return 0;
  let cursor = dayKeys.has(today) ? today : shiftDayKey(today, -1);
  let streak = 0;
  while (dayKeys.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

export function deriveParticipantActivity(workouts = [], userId, duel, now = new Date()) {
  const weekStart = toDate(duel?.weekStartDate);
  const weekEnd = toDate(duel?.weekEndDate);
  const keys = new Set();

  if (userId && weekStart && weekEnd) {
    for (const workout of workouts) {
      if (workout?.userId !== userId) continue;
      const performedAt = toDate(workout?.performedAt ?? workout?.date);
      if (!performedAt || performedAt < weekStart || performedAt > weekEnd) continue;
      const key = dayKey(performedAt);
      if (key) keys.add(key);
    }
  }

  const dayKeys = [...keys].sort();
  const activeDays = dayKeys.length;
  return {
    activeDays,
    percentage: Math.round((activeDays / 7) * 100),
    streak: currentStreak(keys, now),
    dayKeys,
  };
}

export function compareActiveDays(mine, rival) {
  if (mine === rival) return 'tied';
  return mine > rival ? 'ahead' : 'behind';
}
