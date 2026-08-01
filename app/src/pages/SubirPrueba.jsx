import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { useCalorieEstimate } from '../hooks/useCalorieEstimate';
import { createWorkout, updateWorkout } from '../firebase/workouts';
import { getUserDocument } from '../firebase/firestore';
import ExerciseEditor, { createEmptyExercise } from '../components/ExerciseEditor';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { routineExercisesFromLocationState } from '../routines/routinePayload';

// How long Subir Prueba waits, after a successful save, for the Firestore
// listener (useWorkouts) to report the workout's status flipping to
// 'scored' before giving up and returning to the Dashboard anyway. The real
// Cloud Function (Task 5, not built in this worktree) is expected to
// resolve well inside this window; the timeout only exists so a slow or
// stuck calculation never traps the user on this screen — see design
// spec's "Errores y estados" and task-7-brief's explicit timeout note.
// How long the points toast (or the "still calculating" message) stays on
// screen before Subir Prueba automatically returns to the Dashboard.
export const POST_RESULT_DISPLAY_MS = 1500;

/**
 * A comparable "did the server actually produce a new result" token for a
 * workout.
 *
 * Preference order is deliberately server-authoritative first:
 *
 * 1. `scoredAt` — written only by the scoring trigger (Task 4). A change here
 *    is proof the server re-scored.
 * 2. `sessionScore` — also server-only, though a re-score can legitimately
 *    produce the same number.
 * 3. `revision` — LAST RESORT only. It is client-writable (it's on the
 *    create/update allow-list in Task 3), so a real Firestore listener's
 *    latency-compensated local snapshot can surface the NEW `revision`
 *    alongside the OLD `status`/`sessionScore`. Trusting it first would let
 *    that cached snapshot pass the baseline comparison below and flash a
 *    stale score as if it were this edit's result.
 */
/**
 * Handles both "Subir entrenamiento" (create) and "Editar entrenamiento"
 * (via /workouts/:workoutId/edit) in one component: the only difference is
 * which firebase/workouts call is used and whether the form is pre-filled
 * from an existing workout found through useWorkouts. Reusing one component
 * avoids duplicating the ExerciseEditor wiring, validation gating and
 * submit/waiting state machine between two near-identical pages.
 */
function SubirPrueba() {
  const { workoutId } = useParams();
  const isEditMode = Boolean(workoutId);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Defaults on every stub-hook destructure — see Dashboard.jsx for why.
  const { duel = null, loading: duelLoading = false, error: duelError = null } = useActiveDuel() ?? {};
  const duelId = duel?.duelId;
  const {
    workouts = [],
    loading: workoutsLoading = false,
    error: workoutsError = null,
  } = useWorkouts(duelId, currentUser?.uid) ?? {};

  const existingWorkout = isEditMode ? workouts.find((w) => w.workoutId === workoutId) : null;
  const submittingRef = useRef(false);
  // Snapshot of the edited workout's "already scored" state, captured right
  // when handleSubmit fires — see the scored-watcher effect below for why.

  const [exercises, setExercises] = useState(() => {
    if (isEditMode) return [];
    return routineExercisesFromLocationState(location.state) ?? [createEmptyExercise()];
  });
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [phase, setPhase] = useState('form'); // 'form' | 'success'
  const [successMessage, setSuccessMessage] = useState('');
  const [profile, setProfile] = useState(null);

  // Combines every hook this page depends on, the same way Dashboard.jsx
  // does (`duelLoading || scoreLoading || workoutsLoading`). Edit mode also
  // needs the workouts listener to have resolved before it can tell "still
  // loading" apart from "no such workout" — see the not-found branch below.
  const loading = duelLoading || (isEditMode && workoutsLoading);
  // The trailing `|| null` keeps this `null` (rather than the boolean `false`
  // an `&&` chain leaks) in create mode, matching Dashboard/RevisarPrueba's
  // combined error value.
  const error = duelError || (isEditMode && workoutsError) || null;

  // The weight used for the calorie preview lives in the Firestore user
  // profile written by Register.jsx — NOT on the Firebase Auth user object
  // (`currentUser` has no weight of any kind, before or after backend
  // integration). Phase 1 stores it under `weight`; the plan's Task 2
  // explicitly keeps that field name and only maps it to `weightKg` inside
  // the duel's scoringSnapshot, so `weight` is what we read here.
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      setProfile(null);
      return undefined;
    }
    let cancelled = false;
    getUserDocument(uid)
      .then((doc) => {
        if (!cancelled) setProfile(doc ?? null);
      })
      .catch(() => {
        // A missing/unreadable profile only degrades the (explicitly
        // approximate, non-authoritative) calorie preview — the server
        // recomputes calories from its own snapshot — so it must never block
        // or fail the form.
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const calorieEstimate = useCalorieEstimate(exercises, profile?.weight);

  // Pre-fill once the target workout becomes available through the
  // listener. Guarded by `hasPrefilled` (not just "exercises is empty") so
  // a later listener update to the same workout never clobbers in-progress
  // edits, and so the not-found check below can tell "haven't found it yet
  // because we're still loading" apart from "genuinely doesn't exist".
  useEffect(() => {
    if (isEditMode && existingWorkout && !hasPrefilled) {
      const initial =
        Array.isArray(existingWorkout.exercises) && existingWorkout.exercises.length > 0
          ? existingWorkout.exercises
          : [createEmptyExercise()];
      setExercises(initial);
      setHasPrefilled(true);
    }
  }, [isEditMode, existingWorkout, hasPrefilled]);

  useEffect(() => {
    if (phase !== 'success') return undefined;
    const timer = setTimeout(() => navigate('/revisar-prueba'), POST_RESULT_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [phase, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    // `!duelId` is a defensive backstop: the loading gate below already
    // keeps the form (and this handler) from being reachable before the
    // duel resolves, but without this check a race would call
    // createWorkout(undefined, ...) instead of failing loudly.
    if (submittingRef.current || !isValid || !duelId) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      if (isEditMode) {
        await updateWorkout(duelId, workoutId, exercises);
        setSuccessMessage('Entrenamiento actualizado ✓');
      } else {
        await createWorkout(duelId, currentUser.uid, exercises);
        setSuccessMessage('Entrenamiento guardado ✓');
      }
      setPhase('success');
    } catch (err) {
      setSubmitError('No pudimos guardar tu entrenamiento. Tus datos se conservaron: puedes reintentar.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (phase === 'success') {
    return (
      <Layout active="pruebas">
        <Toast message={successMessage} variant="success" />
      </Layout>
    );
  }

  // Blocks the form (and its validation-error state) from rendering before
  // the duel — and, in edit mode, the workout listener — has resolved.
  // Without this, edit mode briefly renders ExerciseEditor with an empty
  // `exercises` array while still loading, which surfaces a real "Debes
  // registrar entre 1 y 20 ejercicios" validation error on a page that
  // hasn't actually failed anything.
  if (loading) {
    return (
      <Layout active="pruebas">
        <p role="status" className="text-on-surface-variant text-center p-8">
          Cargando...
        </p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout active="pruebas">
        <p role="alert" className="text-error text-center p-8">
          No pudimos cargar la información necesaria. Intenta de nuevo más tarde.
        </p>
      </Layout>
    );
  }

  // Reached only once loading is confirmed done: if we're in edit mode and
  // still have never found a matching workout, the :workoutId in the URL
  // doesn't correspond to anything (bad link, already-deleted workout,
  // etc.) rather than "still loading".
  if (isEditMode && !hasPrefilled && !existingWorkout) {
    return (
      <Layout active="pruebas">
        <p role="alert" className="text-error text-center p-8">
          No encontramos ese entrenamiento. Puede que ya no esté disponible para editar.
        </p>
      </Layout>
    );
  }

  return (
    <Layout active="pruebas">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile">
          {isEditMode ? 'Editar entrenamiento' : 'Subir entrenamiento'}
        </h1>

        <ExerciseEditor
          exercises={exercises}
          onChange={setExercises}
          onValidityChange={setIsValid}
          disabled={submitting}
        />

        <Card className="flex items-center justify-between">
          <span className="text-on-surface-variant text-sm">Estimación aproximada de calorías</span>
          <span className="text-on-surface font-bold">{calorieEstimate} kcal</span>
        </Card>

        {submitError && (
          <p role="alert" className="text-error text-sm">
            {submitError}
          </p>
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={!isValid || submitting}>
          {submitting ? 'Guardando…' : 'Guardar entrenamiento'}
        </Button>
      </form>
    </Layout>
  );
}

export default SubirPrueba;
