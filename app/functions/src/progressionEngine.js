/**
 * Progression Engine — Phase 3.3
 *
 * Analyzes a week of difficulty ratings and produces adjustment suggestions
 * for each exercise in the following week's plan.
 *
 * Input:  Array of feedback objects { exerciseId, difficulty: 'easy'|'moderate'|'hard' }
 * Output: Array of suggestion objects { exerciseId, action, reason, delta }
 */

export const DIFFICULTY = /** @type {const} */ ({
  EASY: 'easy',
  MODERATE: 'moderate',
  HARD: 'hard',
});

/**
 * Summarizes difficulty feedback for one exercise across a week.
 *
 * @param {{ exerciseId: string; difficulty: string }[]} feedbackItems
 * @returns {{ easyRate: number; hardRate: number; total: number }}
 */
export function summarizeFeedback(feedbackItems) {
  const safe = Array.isArray(feedbackItems) ? feedbackItems : [];
  const total = safe.length;
  if (total === 0) return { easyRate: 0, hardRate: 0, total: 0 };

  const easyCount = safe.filter((f) => f.difficulty === DIFFICULTY.EASY).length;
  const hardCount = safe.filter((f) => f.difficulty === DIFFICULTY.HARD).length;

  return {
    easyRate: easyCount / total,
    hardRate: hardCount / total,
    total,
  };
}

/**
 * Decides what adjustment to suggest for a single exercise.
 *
 * Thresholds:
 *   easyRate > 0.70 → increase (+2 reps or +1 set)
 *   hardRate > 0.50 → reduce  (-2 reps, minimum 1)
 *   otherwise       → maintain
 *
 * @param {{ easyRate: number; hardRate: number; total: number }} summary
 * @param {{ sets: number; reps?: number; durationSeconds?: number }} currentDosage
 * @returns {{ action: 'increase'|'reduce'|'maintain'; delta: number; reason: string }}
 */
export function suggestAdjustment(summary, currentDosage = {}) {
  const { easyRate, hardRate, total } = summary;

  if (total === 0) {
    return { action: 'maintain', delta: 0, reason: 'Sin datos de la semana anterior.' };
  }

  if (easyRate > 0.70) {
    // Prefer adding reps; fall back to adding a set when there are no reps.
    if (Number.isFinite(currentDosage.reps)) {
      const delta = currentDosage.reps >= 15 ? 5 : 2;
      return {
        action: 'increase',
        delta,
        reason: `${Math.round(easyRate * 100)}% de las sesiones fueron fáciles. Subimos ${delta} repeticiones.`,
      };
    }
    return {
      action: 'increase',
      delta: 1,
      reason: `${Math.round(easyRate * 100)}% de las sesiones fueron fáciles. Sumamos 1 serie.`,
    };
  }

  if (hardRate > 0.50) {
    const delta = Number.isFinite(currentDosage.reps) ? -2 : -1;
    return {
      action: 'reduce',
      delta,
      reason: `${Math.round(hardRate * 100)}% de las sesiones fueron difíciles. Bajamos ${Math.abs(delta)} ${Number.isFinite(currentDosage.reps) ? 'repeticiones' : 'serie'}.`,
    };
  }

  return {
    action: 'maintain',
    delta: 0,
    reason: 'Dificultad equilibrada. Mantenemos la carga.',
  };
}

/**
 * Applies a suggestion delta to a dosage object, returning the proposed values.
 * Enforces minimums: reps >= 1, sets >= 1, durationSeconds >= 10.
 *
 * @param {{ sets: number; reps?: number; durationSeconds?: number }} dosage
 * @param {{ action: string; delta: number }} suggestion
 * @returns {{ sets: number; reps?: number; durationSeconds?: number }}
 */
export function applyDelta(dosage, suggestion) {
  const { action, delta } = suggestion;
  if (action === 'maintain' || delta === 0) return { ...dosage };

  const result = { ...dosage };

  if (Number.isFinite(dosage.reps)) {
    result.reps = Math.max(1, (dosage.reps ?? 0) + delta);
  } else if (Number.isFinite(dosage.durationSeconds)) {
    result.durationSeconds = Math.max(10, (dosage.durationSeconds ?? 0) + delta * 5);
  } else {
    result.sets = Math.max(1, (dosage.sets ?? 1) + delta);
  }

  return result;
}

/**
 * Full pipeline: given a plan day and that day's feedback entries,
 * returns one suggestion per exercise.
 *
 * @param {{ exercises: { id: string; sets: number; reps?: number; durationSeconds?: number }[] }} dayPlan
 * @param {{ exerciseId: string; difficulty: string }[]} feedbackEntries
 * @returns {{ exerciseId: string; action: string; delta: number; reason: string; proposed: object }[]}
 */
export function generateDaySuggestions(dayPlan, feedbackEntries) {
  const exercises = Array.isArray(dayPlan?.exercises) ? dayPlan.exercises : [];
  const feedback = Array.isArray(feedbackEntries) ? feedbackEntries : [];

  return exercises.map((exercise) => {
    const exerciseId = exercise.id ?? exercise.name ?? 'unknown';
    const exerciseFeedback = feedback.filter((f) => f.exerciseId === exerciseId);
    const summary = summarizeFeedback(exerciseFeedback);
    const suggestion = suggestAdjustment(summary, exercise);
    const proposed = applyDelta(exercise, suggestion);

    return {
      exerciseId,
      action: suggestion.action,
      delta: suggestion.delta,
      reason: suggestion.reason,
      proposed,
    };
  });
}

/**
 * Aggregates suggestions across an entire week's workout days.
 *
 * @param {{ days: Record<string, { type: string; exercises?: object[] }> }} weekPlan
 * @param {{ exerciseId: string; difficulty: string; dayNumber: number }[]} weekFeedback
 * @returns {Map<string, { exerciseId: string; action: string; delta: number; reason: string; proposed: object }[]>}
 *   Keyed by day number string ("1"–"7"), only workout days included.
 */
export function generateWeekSuggestions(weekPlan, weekFeedback) {
  const days = weekPlan?.days ?? {};
  const feedback = Array.isArray(weekFeedback) ? weekFeedback : [];
  const result = new Map();

  for (const [dayKey, dayPlan] of Object.entries(days)) {
    if (dayPlan.type !== 'workout') continue;
    const dayFeedback = feedback.filter((f) => String(f.dayNumber) === dayKey);
    result.set(dayKey, generateDaySuggestions(dayPlan, dayFeedback));
  }

  return result;
}
