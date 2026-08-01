import { useEffect, useMemo } from 'react';
import Select from './Select';
import Input from './Input';
import Button from './Button';
import { ROUTINE_CATALOG } from '../routines/catalog';

/**
 * Local exercise catalog (Task 5's `src/domain/exercises.js` isn't built in
 * this worktree yet — see design spec's MET table for the source list).
 * Exported so the pages that consume this editor (and any tests) share one
 * source of truth instead of re-declaring the list.
 *
 * ============================================================================
 * PROVISIONAL — `exerciseId` IS NOT FINAL. MUST BE RECONCILED BEFORE
 * INTEGRATION.
 * ============================================================================
 * Every workout this editor produces sets `exerciseId` to the Spanish display
 * name (see `createEmptyExercise` below and the Select's onChange). That is a
 * PLACEHOLDER, not a decision.
 *
 * `exerciseId` is intended as the join key against the backend's MET/scoring
 * table, but a direct read of `functions/src/scoring.js` (present uncommitted
 * in the main checkout / scoring-security worktree, not in this one) as of
 * 2026-08-01 shows concrete, confirmed mismatches beyond just "format unknown":
 *
 *   1. The scorer's `deriveWorkoutMetrics` joins on `exercise.name`, not
 *      `exerciseId` at all — `exerciseId` is currently unread by the backend.
 *   2. 5 of this catalog's 11 names do NOT match `scoring.js`'s MET_VALUES
 *      keys and would silently fall back to a default MET of 5.0:
 *        'Pistol Squats'          vs backend 'Sentadillas con Pistol'
 *        'Lagartijas con palmada' vs backend 'Lagartijas con Palmadas'
 *        'Sentadillas búlgaras'   vs backend 'Sentadillas Búlgaras'
 *        'Planchas laterales'     vs backend 'Planchas Laterales'
 *      (Flexiones, Sentadillas, Abdominales, Burpees, Mountain Climbers,
 *      Fondos, Planchas match today.)
 *   3. The backend destructures a `duration` field; this editor writes
 *      `durationMinutes` — `totalMinutes`/`estimatedCalories` would compute
 *      as NaN against the real scorer as-is.
 *
 * Do NOT unilaterally change this scheme. It must be agreed with the backend
 * worker (Codex) and this catalog aligned with their canonical catalog before
 * the stub `firebase/workouts.js` is swapped for the real implementation —
 * items 2 and 3 above are exact, ready-to-fix diffs once that conversation
 * happens; item 1 needs a decision on which side owns the join key.
 */
const BASE_EXERCISE_CATALOG = [
  'Flexiones',
  'Sentadillas',
  'Abdominales',
  'Burpees',
  'Mountain Climbers',
  'Fondos',
  'Sentadillas con Pistol',
  'Lagartijas con Palmadas',
  'Sentadillas Búlgaras',
  'Planchas',
  'Planchas Laterales',
];

export const EXERCISE_CATALOG = [...new Set([
  ...BASE_EXERCISE_CATALOG,
  ...ROUTINE_CATALOG.map((exercise) => exercise.name),
])];

// Global Constraints (docs/superpowers/plans/2026-07-31-comar-fit-phase2-min.md).
export const MIN_EXERCISES = 1;
export const MAX_EXERCISES = 20;
export const MIN_SETS = 1;
export const MAX_SETS = 20;
export const MIN_REPS = 1;
export const MAX_REPS = 500;
export const MIN_TOTAL_DURATION_MINUTES = 1;
export const MAX_TOTAL_DURATION_MINUTES = 300;

export function createEmptyExercise() {
  const name = EXERCISE_CATALOG[0];
  // PROVISIONAL exerciseId — display name used as the join key. See the big
  // note on EXERCISE_CATALOG above; must be reconciled with the backend's
  // exercise catalog (functions/src/scoring.js) before integration.
  return { exerciseId: name, name, sets: 1, reps: 1, durationMinutes: 1 };
}

/**
 * Pure validation, exported so a parent page (e.g. SubirPrueba) can gate
 * submission without duplicating the range rules, and so this component's
 * `onValidityChange` prop stays a thin wrapper around the same logic.
 */
export function validateExercises(exercises) {
  const list = Array.isArray(exercises) ? exercises : [];

  const rowErrors = list.map((exercise) => {
    const errors = {};
    if (!exercise?.name) {
      errors.name = 'Elige un ejercicio.';
    }

    const sets = Number(exercise?.sets);
    if (!Number.isFinite(sets) || sets < MIN_SETS || sets > MAX_SETS) {
      errors.sets = `Series entre ${MIN_SETS} y ${MAX_SETS}.`;
    }

    const reps = Number(exercise?.reps);
    if (!Number.isFinite(reps) || reps < MIN_REPS || reps > MAX_REPS) {
      errors.reps = `Reps entre ${MIN_REPS} y ${MAX_REPS}.`;
    }

    const duration = Number(exercise?.durationMinutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > MAX_TOTAL_DURATION_MINUTES) {
      errors.durationMinutes = `Duración entre 1 y ${MAX_TOTAL_DURATION_MINUTES} min.`;
    }

    return errors;
  });

  const totalMinutes = list.reduce((sum, exercise) => {
    const duration = Number(exercise?.durationMinutes);
    return sum + (Number.isFinite(duration) ? duration : 0);
  }, 0);

  let totalError = '';
  if (totalMinutes < MIN_TOTAL_DURATION_MINUTES || totalMinutes > MAX_TOTAL_DURATION_MINUTES) {
    totalError = `La duración total debe estar entre ${MIN_TOTAL_DURATION_MINUTES} y ${MAX_TOTAL_DURATION_MINUTES} minutos (actual: ${totalMinutes}).`;
  }

  let countError = '';
  if (list.length < MIN_EXERCISES || list.length > MAX_EXERCISES) {
    countError = `Debes registrar entre ${MIN_EXERCISES} y ${MAX_EXERCISES} ejercicios.`;
  }

  const hasRowErrors = rowErrors.some((errors) => Object.keys(errors).length > 0);
  const isValid = !hasRowErrors && !totalError && !countError;

  return { rowErrors, totalError, countError, totalMinutes, isValid };
}

/**
 * Controlled multi-row exercise form. Holds no exercise data of its own —
 * `exercises`/`onChange` are the source of truth so the parent page (Subir
 * Prueba / edit flow) can serialize, persist or re-hydrate the array freely.
 * Only presentation-local concerns (delete confirmations belong to
 * WorkoutCard, not here) stay outside props.
 */
function ExerciseEditor({ exercises = [], onChange, onValidityChange, disabled = false }) {
  const validation = useMemo(() => validateExercises(exercises), [exercises]);

  useEffect(() => {
    onValidityChange?.(validation.isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.isValid]);

  function updateRow(index, patch) {
    const next = exercises.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise));
    onChange?.(next);
  }

  function addRow() {
    if (exercises.length >= MAX_EXERCISES) return;
    onChange?.([...exercises, createEmptyExercise()]);
  }

  function removeRow(index) {
    if (exercises.length <= MIN_EXERCISES) return;
    onChange?.(exercises.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => {
        const errors = validation.rowErrors[index] || {};
        return (
          // Index key: rows are only appended/removed (never reordered) and
          // every field is fully controlled, so index-based identity is safe.
          // eslint-disable-next-line react/no-array-index-key
          <div key={index} className="glass-card rounded-xl p-4 space-y-3 border border-outline-variant/10">
            <div className="flex items-center justify-between gap-2">
              <span className="font-label-md text-on-surface-variant text-xs uppercase tracking-widest">
                Ejercicio {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled || exercises.length <= MIN_EXERCISES}
                aria-label={`Eliminar ejercicio ${index + 1}`}
                className="tap-scale min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-variant rounded-full disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  delete
                </span>
              </button>
            </div>

            <Select
              label="Ejercicio"
              value={exercise.name}
              disabled={disabled}
              // PROVISIONAL exerciseId — see the note on EXERCISE_CATALOG.
              onChange={(event) => updateRow(index, { name: event.target.value, exerciseId: event.target.value })}
              options={EXERCISE_CATALOG.map((name) => ({ value: name, label: name }))}
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Series"
                type="number"
                inputMode="numeric"
                min={MIN_SETS}
                max={MAX_SETS}
                value={exercise.sets}
                disabled={disabled}
                error={errors.sets}
                onChange={(event) =>
                  updateRow(index, { sets: event.target.value === '' ? '' : Number(event.target.value) })
                }
              />
              <Input
                label="Reps"
                type="number"
                inputMode="numeric"
                min={MIN_REPS}
                max={MAX_REPS}
                value={exercise.reps}
                disabled={disabled}
                error={errors.reps}
                onChange={(event) =>
                  updateRow(index, { reps: event.target.value === '' ? '' : Number(event.target.value) })
                }
              />
              <Input
                label="Minutos"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_TOTAL_DURATION_MINUTES}
                value={exercise.durationMinutes}
                disabled={disabled}
                error={errors.durationMinutes}
                onChange={(event) =>
                  updateRow(index, {
                    durationMinutes: event.target.value === '' ? '' : Number(event.target.value),
                  })
                }
              />
            </div>
          </div>
        );
      })}

      {validation.countError && (
        <p role="alert" className="text-error text-sm">
          {validation.countError}
        </p>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={addRow}
        disabled={disabled || exercises.length >= MAX_EXERCISES}
        className="w-full"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          add
        </span>
        Añadir ejercicio
      </Button>

      <div className="flex items-center justify-between font-label-md text-sm text-on-surface-variant px-1">
        <span>Duración total</span>
        <span className={validation.totalError ? 'text-error' : 'text-on-surface'}>
          {validation.totalMinutes} min
        </span>
      </div>
      {validation.totalError && (
        <p role="alert" className="text-error text-sm">
          {validation.totalError}
        </p>
      )}
    </div>
  );
}

export default ExerciseEditor;
