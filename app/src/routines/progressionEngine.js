// Phase 3.3 — Adaptive progression.
//
// Looks at recent difficulty feedback (per exercise name) and suggests a
// rep/set multiplier: consistently "easy" bumps the exercise up, mostly
// "hard" holds it back. This stays a pure, client-side calculation over
// whatever workouts the caller already has loaded (no new Firestore reads
// or Cloud Functions) — see docs/superpowers/specs/2026-08-01-comar-fit-phase3-design.md
// section 3 for the original design.

export const EASY_THRESHOLD = 0.7;
export const HARD_THRESHOLD = 0.5;
export const MIN_SAMPLES = 2;
export const INCREASE_MULTIPLIER = 1.15;
export const DECREASE_MULTIPLIER = 0.85;
export const MAINTAIN_MULTIPLIER = 1;

const DEFAULT_WINDOW_DAYS = 7;

function withinWindow(performedAt, windowStart) {
  if (!performedAt) return false;
  const timestamp = performedAt instanceof Date ? performedAt : new Date(performedAt);
  if (Number.isNaN(timestamp.getTime())) return false;
  return timestamp.getTime() >= windowStart;
}

/**
 * Groups every exercise's difficulty_feedback (from workouts within the
 * trailing `windowDays`) by exercise name, then decides a per-exercise
 * multiplier:
 *
 * - >= EASY_THRESHOLD of ratings are "easy" (with at least MIN_SAMPLES
 *   ratings) → increase.
 * - >= HARD_THRESHOLD of ratings are "hard" → decrease.
 * - Otherwise → maintain (multiplier of 1, i.e. no adjustment).
 *
 * Returns a map of exerciseName -> { multiplier, reason, easyCount,
 * moderateCount, hardCount, totalCount }. Exercises with fewer than
 * MIN_SAMPLES ratings in the window are omitted entirely (not enough signal
 * to adjust safely).
 */
export function computeProgressionAdjustments(workouts, { windowDays = DEFAULT_WINDOW_DAYS, now = new Date() } = {}) {
  const windowStart = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const byExercise = new Map();

  for (const workout of Array.isArray(workouts) ? workouts : []) {
    if (!withinWindow(workout?.performedAt, windowStart)) continue;
    for (const exercise of Array.isArray(workout?.exercises) ? workout.exercises : []) {
      const feedback = exercise?.difficulty_feedback;
      if (feedback !== 'easy' && feedback !== 'moderate' && feedback !== 'hard') continue;
      const name = exercise?.name;
      if (!name) continue;
      if (!byExercise.has(name)) {
        byExercise.set(name, { easy: 0, moderate: 0, hard: 0 });
      }
      byExercise.get(name)[feedback] += 1;
    }
  }

  const adjustments = {};
  for (const [name, counts] of byExercise.entries()) {
    const totalCount = counts.easy + counts.moderate + counts.hard;
    if (totalCount < MIN_SAMPLES) continue;

    const easyRatio = counts.easy / totalCount;
    const hardRatio = counts.hard / totalCount;

    let multiplier = MAINTAIN_MULTIPLIER;
    let reason = 'maintain';
    if (easyRatio >= EASY_THRESHOLD) {
      multiplier = INCREASE_MULTIPLIER;
      reason = 'easy';
    } else if (hardRatio >= HARD_THRESHOLD) {
      multiplier = DECREASE_MULTIPLIER;
      reason = 'hard';
    }

    adjustments[name] = {
      multiplier,
      reason,
      easyCount: counts.easy,
      moderateCount: counts.moderate,
      hardCount: counts.hard,
      totalCount,
    };
  }

  return adjustments;
}
