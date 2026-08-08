/**
 * Shared date helpers for duel/workout time math.
 *
 * Two rules drive everything here:
 *
 * 1. Never guess with the local browser clock. The duel document already
 *    carries real week boundaries (`weekStartDate` / `weekEndDate`, written
 *    as UTC Timestamps by `firebase/firestore.js`'s `computeWeekBoundaries`),
 *    so every "which day of the week is it / is this workout in this week"
 *    question is answered from that server data.
 * 2. Tolerate every shape a date can arrive in — Firestore `Timestamp`,
 *    `Date`, ISO string, `YYYY-MM-DD` string or epoch millis — because the
 *    stub hooks and the real backend disagree today (stub `workouts` still
 *    return `date: 'YYYY-MM-DD'`, the real schema returns a `performedAt`
 *    Timestamp).
 *
 * TODO(task5-integration): switch to `duel.timezone` once Task 2 lands. The
 * duel document has no `timezone` field yet, so day boundaries below are the
 * duel's own UTC boundaries and display formatting assumes the project's
 * single timezone constant. Once `timezone` exists, both should be derived
 * from it instead.
 */

// The design spec fixes the product's timezone at America/Mexico_City. It is
// not yet a field on the duel document — see the TODO above.
export const DUEL_TIME_ZONE = 'America/Mexico_City';

export const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalizes any supported date shape to a `Date`, or `null` when the value
 * is missing/unparseable.
 */
export function toDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) {
    // A bare `YYYY-MM-DD` is a calendar day, not an instant. Anchoring it at
    // noon UTC keeps it on the same calendar day in every timezone from
    // UTC-11 to UTC+12, so formatting it back never shifts it by a day.
    const anchored = new Date(`${value}T12:00:00.000Z`);
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Resolves a workout's performed date regardless of shape: the design spec's
 * server schema uses `performedAt` (a Firestore Timestamp), while the current
 * `useWorkouts` stub still returns the older `date` (`YYYY-MM-DD`) shape.
 * Tolerating both keeps filtering/sorting/display correct against either.
 */
export function resolvePerformedAt(workout) {
  return toDate(workout?.performedAt ?? workout?.date);
}

const dayKeyFormatters = new Map();

function dayKeyFormatterFor(timeZone) {
  if (!dayKeyFormatters.has(timeZone)) {
    dayKeyFormatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }));
  }
  return dayKeyFormatters.get(timeZone);
}

/** `YYYY-MM-DD` calendar day of an instant, in the duel's timezone. */
export function formatDayKey(value, timeZone = DUEL_TIME_ZONE) {
  const date = toDate(value);
  if (!date) return '';
  return dayKeyFormatterFor(timeZone).format(date);
}

/**
 * Plan week identity and weekday derived from one calendar date in the duel
 * timezone. This keeps both values on the same side of local day/week
 * rollovers even when the browser or JavaScript runtime uses another zone.
 */
export function getDuelWeekContext(value = new Date(), timeZone = DUEL_TIME_ZONE) {
  const dayKey = formatDayKey(value, timeZone);
  if (!dayKey) return { weekId: null, isoWeekday: 1, timeZone };

  const calendarDate = new Date(`${dayKey}T12:00:00.000Z`);
  const isoWeekday = calendarDate.getUTCDay() || 7;
  const thursday = new Date(calendarDate);
  thursday.setUTCDate(calendarDate.getUTCDate() + 4 - isoWeekday);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((thursday - yearStart) / DAY_MS) + 1) / 7);

  return {
    weekId: `${thursday.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`,
    isoWeekday,
    timeZone,
  };
}

/** Display string for a workout's performed date (empty when unknown). */
export function formatWorkoutDate(workout) {
  return formatDayKey(resolvePerformedAt(workout));
}

/**
 * Mirrors `firebase/firestore.js`'s `computeWeekBoundaries` (UTC Monday
 * 00:00 → Sunday 23:59:59.999). Duplicated rather than imported because
 * importing that module pulls in `firebase/config`, which initializes a real
 * Firebase app — unacceptable for a pure date helper used by every page.
 */
export function computeWeekBoundariesUTC(referenceDate) {
  const day = referenceDate.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysSinceMonday = (day + 6) % 7;

  const weekStart = new Date(referenceDate);
  weekStart.setUTCDate(referenceDate.getUTCDate() - daysSinceMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * The authoritative week window for a duel: the duel document's own
 * `weekStartDate`/`weekEndDate`, falling back to the same UTC computation the
 * duel was created with when a (stub or partially loaded) duel lacks them.
 */
export function resolveDuelWeek(duel, now = new Date()) {
  const weekStart = toDate(duel?.weekStartDate);
  const weekEnd = toDate(duel?.weekEndDate);
  if (weekStart && weekEnd) return { weekStart, weekEnd };

  const fallback = computeWeekBoundariesUTC(now);
  return { weekStart: weekStart ?? fallback.weekStart, weekEnd: weekEnd ?? fallback.weekEnd };
}

/**
 * "Día X de 7" — how far into the duel's own week we are, derived from the
 * duel's real boundaries rather than the local browser day-of-week. Clamped
 * to 1..7 so a stale week document can never render "Día 0" or "Día 9".
 */
export function duelDayNumber(duel, now = new Date()) {
  const { weekStart } = resolveDuelWeek(duel, now);
  const elapsed = now.getTime() - weekStart.getTime();
  if (elapsed < 0) return 1;
  return Math.min(7, Math.floor(elapsed / DAY_MS) + 1);
}

/**
 * End of the current duel day: one day-length past the start of the day the
 * duel is currently on, clamped to the end of the duel week. Used as the
 * countdown target so it tracks the duel's boundaries instead of the
 * viewer's local midnight.
 */
export function endOfCurrentDuelDay(duel, now = new Date()) {
  const { weekStart, weekEnd } = resolveDuelWeek(duel, now);
  const target = new Date(weekStart.getTime() + duelDayNumber(duel, now) * DAY_MS);
  return target.getTime() > weekEnd.getTime() ? weekEnd : target;
}

/** True when a workout falls inside the duel's current week window. */
export function isInDuelWeek(workout, duel, now = new Date()) {
  const performedAt = resolvePerformedAt(workout);
  if (!performedAt) return false;
  const { weekStart, weekEnd } = resolveDuelWeek(duel, now);
  const time = performedAt.getTime();
  return time >= weekStart.getTime() && time <= weekEnd.getTime();
}
