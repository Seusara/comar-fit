import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import ProgressRing from '../components/ProgressRing';
import FormReferenceModal from '../components/FormReferenceModal';
import RestTimer from '../components/RestTimer';
import GuidedWorkout from '../components/GuidedWorkout';
import PageSkeleton from '../components/PageSkeleton';
import { adaptExerciseVolume, replaceExercise, substitutionOptions } from '../routines/sessionAdaptation';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { findExerciseReference } from '../routines/catalog';
import { getDuelWeekContext, DUEL_TIME_ZONE } from '../utils/dates';
import { generatePlanIfMissing, getPlan } from '../firebase/plans';
import {
  getOrCreateWorkoutProgress,
  makeProgressId,
  subscribeToWorkoutProgress,
  toggleExerciseCompletion,
} from '../firebase/workoutProgress';
import {
  completeRunSession, getOrCreateRunSession, makeRunId, startRunSession, subscribeToRunSession,
} from '../firebase/runSessions';

const FOCUS_LABELS = {
  chest_triceps: 'Pecho + tríceps', back_biceps: 'Espalda + bíceps',
  legs_glutes: 'Piernas + glúteos', legs: 'Piernas',
  fullbody_core: 'Cuerpo completo + core',
  fullbody_shoulder_core: 'Cuerpo completo + hombros + core', upper_body: 'Tren superior',
};

function exerciseDetail(exercise) {
  const sets = Number.isFinite(exercise.sets) ? exercise.sets : 1;
  if (Number.isFinite(exercise.reps)) return `${sets} series × ${exercise.reps} reps`;
  if (Number.isFinite(exercise.durationSeconds)) return `${sets} series × ${exercise.durationSeconds}s`;
  return `${sets} series`;
}

function runTarget(target = {}) {
  const parts = [];
  if (Number.isFinite(target.distanceMeters)) parts.push(`${target.distanceMeters / 1000} km`);
  if (Number.isFinite(target.durationSeconds)) parts.push(`${Math.round(target.durationSeconds / 60)} min`);
  return parts.join(' o ') || 'Meta por definir';
}

function estimatedExerciseMinutes(exercise) {
  const sets = Number.isFinite(exercise.sets) ? exercise.sets : 1;
  const activeSeconds = Number.isFinite(exercise.durationSeconds)
    ? exercise.durationSeconds
    : (Number.isFinite(exercise.reps) ? exercise.reps * 3 : 30);
  const restSeconds = Number.isFinite(exercise.restSeconds) ? exercise.restSeconds : 45;
  return Math.max(1, Math.ceil((sets * activeSeconds + Math.max(0, sets - 1) * restSeconds) / 60));
}

function Rutina() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { duel = null, loading: duelLoading = false, error: duelError = null } = useActiveDuel() ?? {};
  const duelId = duel?.duelId;
  const timeZone = duel?.timezone ?? DUEL_TIME_ZONE;
  const now = useMemo(() => new Date(), []);
  const { weekId, isoWeekday } = useMemo(() => getDuelWeekContext(now, timeZone), [now, timeZone]);
  const gender = duel?.scoringSnapshot?.users?.[currentUser?.uid]?.gender
    ?? duel?.participantProfiles?.[currentUser?.uid]?.gender ?? currentUser?.gender ?? 'M';
  const [dayPlan, setDayPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [runSession, setRunSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const [openReferenceExerciseId, setOpenReferenceExerciseId] = useState(null);
  const [restingExerciseId, setRestingExerciseId] = useState(null);
  const [runDistanceKm, setRunDistanceKm] = useState('2');
  const [runDurationMinutes, setRunDurationMinutes] = useState('20');
  const [guidedMode, setGuidedMode] = useState(false);
  const [sessionMode, setSessionMode] = useState('normal');
  const [exerciseOverrides, setExerciseOverrides] = useState({});
  const requestRef = useRef(0);
  const resumedSessionRef = useRef(null);

  const loadDay = useCallback(async () => {
    if (!duelId || !currentUser?.uid || !weekId) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      await generatePlanIfMissing(duelId, currentUser.uid, weekId, { gender });
      const plan = await getPlan(duelId, currentUser.uid, weekId);
      const today = plan?.days?.[String(isoWeekday)] ?? null;
      if (requestRef.current !== requestId) return;
      setDayPlan(today);
      setProgress(null);
      setRunSession(null);
      if (today?.type === 'workout') {
        setProgress(await getOrCreateWorkoutProgress(duelId, currentUser.uid, weekId, isoWeekday, today));
      } else if (today?.type === 'run') {
        setRunSession(await getOrCreateRunSession(duelId, currentUser.uid, weekId, isoWeekday, today));
      }
    } catch {
      if (requestRef.current === requestId) setError('No pudimos cargar la rutina de hoy.');
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [currentUser?.uid, duelId, gender, isoWeekday, weekId]);

  useEffect(() => {
    requestRef.current += 1;
    setDayPlan(null);
    setProgress(null);
    setRunSession(null);
    if (duelId && currentUser?.uid) loadDay();
    return () => { requestRef.current += 1; };
  }, [currentUser?.uid, duelId, loadDay]);

  useEffect(() => {
    if (!duelId || !currentUser?.uid || dayPlan?.type !== 'workout') return undefined;
    const progressId = makeProgressId(currentUser.uid, weekId, isoWeekday);
    return subscribeToWorkoutProgress(duelId, progressId, setProgress, () => {
      setError('No pudimos sincronizar tu progreso.');
    });
  }, [currentUser?.uid, dayPlan?.type, duelId, isoWeekday, weekId]);

  useEffect(() => {
    if (!duelId || !currentUser?.uid || dayPlan?.type !== 'run') return undefined;
    return subscribeToRunSession(
      duelId,
      makeRunId(currentUser.uid, weekId, isoWeekday),
      setRunSession,
      () => setError('No pudimos sincronizar la carrera.'),
    );
  }, [currentUser?.uid, dayPlan?.type, duelId, isoWeekday, weekId]);

  const plannedExercises = Array.isArray(dayPlan?.exercises) ? dayPlan.exercises : [];
  const exercises = plannedExercises.map((exercise) => adaptExerciseVolume(exerciseOverrides[exercise.id] ?? exercise, sessionMode));
  const progressById = new Map((progress?.exercises ?? []).map((exercise) => [exercise.id, exercise]));
  const completed = exercises.filter((exercise) => progressById.get(exercise.id)?.completed);
  const percentage = Number.isFinite(progress?.completionRate)
    ? progress.completionRate : exercises.length ? Math.round(completed.length / exercises.length * 100) : 0;

  useEffect(() => {
    if (dayPlan?.type !== 'workout' || !currentUser?.uid || exercises.length === 0) return;
    const sessionId = `${currentUser.uid}:${weekId}:${isoWeekday}`;
    if (resumedSessionRef.current === sessionId) return;
    resumedSessionRef.current = sessionId;
    try {
      const saved = JSON.parse(localStorage.getItem(`comar-fit:guided:${sessionId}`));
      if (saved && (saved.elapsedSeconds > 0 || Object.keys(saved.completedSets ?? {}).length > 0)) {
        setGuidedMode(true);
      }
    } catch { /* ignore an invalid local session */ }
  }, [currentUser?.uid, dayPlan?.type, exercises.length, isoWeekday, weekId]);

  async function toggleExercise(exerciseId, checked, showRest = true) {
    if (!duelId || actionPending) return;
    setActionPending(true);
    setError(null);
    try {
      const progressId = makeProgressId(currentUser.uid, weekId, isoWeekday);
      setProgress(await toggleExerciseCompletion(duelId, progressId, exerciseId, checked));
      if (checked && showRest) {
        const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
        if (index >= 0 && index < exercises.length - 1) setRestingExerciseId(exerciseId);
      }
    } catch {
      setError('No pudimos actualizar tu progreso.');
    } finally {
      setActionPending(false);
    }
  }

  async function startRun() {
    if (!duelId || actionPending) return;
    setActionPending(true);
    setError(null);
    try {
      setRunSession(await startRunSession(duelId, makeRunId(currentUser.uid, weekId, isoWeekday)));
    } catch {
      setError('No pudimos iniciar la carrera.');
    } finally {
      setActionPending(false);
    }
  }

  async function finishRun(event) {
    event.preventDefault();
    const distanceMeters = Math.round(Number(runDistanceKm) * 1000);
    const durationSeconds = Math.round(Number(runDurationMinutes) * 60);
    if (distanceMeters <= 0 || durationSeconds <= 0) {
      setError('Ingresa una distancia y duración válidas.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      setRunSession(await completeRunSession(
        duelId, makeRunId(currentUser.uid, weekId, isoWeekday), distanceMeters, durationSeconds,
      ));
    } catch {
      setError('No pudimos finalizar la carrera.');
    } finally {
      setActionPending(false);
    }
  }

  function registerCompleted(elapsedSeconds = null, completedExerciseIds = null) {
    const selectedExercises = Array.isArray(completedExerciseIds)
      ? exercises.filter((exercise) => completedExerciseIds.includes(exercise.id))
      : completed;
    const selected = selectedExercises.map((exercise) => ({
      name: exercise.name, sets: exercise.sets, reps: exercise.reps,
      duration: estimatedExerciseMinutes(exercise),
    }));
    navigate('/subir-prueba', { state: { source: 'daily-routine', exercises: selected, elapsedSeconds } });
  }

  function substituteExercise(exercise) {
    const options = substitutionOptions(exercise, exercises.map((item) => item.name));
    if (!options.length) return;
    setExerciseOverrides((current) => ({ ...current, [exercise.id]: replaceExercise(exercise, options[0]) }));
  }

  if (duelLoading || loading) return <Layout active="rutina"><PageSkeleton label="Cargando rutina..." /></Layout>;

  return (
    <Layout active="rutina">
      <div className="space-y-6">
        <header>
          <p className="text-primary-fixed-dim text-xs uppercase tracking-widest">{weekId} · día {isoWeekday}</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile mt-1">Rutina de hoy</h1>
          <p className="text-on-surface-variant text-sm mt-2">Sincronizada con tu plan semanal del duelo.</p>
        </header>

        {(duelError || error || !duelId || !dayPlan) && (
          <Card className="text-center space-y-4">
            <p role="alert" className="text-error">{error || (duelError ? 'No pudimos cargar tu duelo.' : 'No hay un plan disponible para hoy.')}</p>
            {duelId && <Button onClick={loadDay}>Reintentar</Button>}
          </Card>
        )}

        {dayPlan?.type === 'rest' && (
          <Card className="text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-primary-fixed-dim" aria-hidden="true">self_improvement</span>
            <h2 className="font-headline-lg text-xl">Descanso</h2>
            <p className="text-on-surface-variant text-sm">Hoy toca recuperación. No hay ejercicios programados.</p>
          </Card>
        )}

        {dayPlan?.type === 'run' && (
          <Card className="space-y-4">
            <h2 className="font-headline-lg text-xl">Carrera</h2>
            <p className="text-on-surface-variant">Meta: {runTarget(dayPlan.target)}</p>
            {runSession?.status === 'completed' && (
              <div role="status" className="space-y-1 font-bold text-primary-fixed-dim">
                <p>Carrera completada</p>
                <p className="text-sm">{runSession.distanceMeters / 1000} km · {Math.round(runSession.durationSeconds / 60)} min</p>
              </div>
            )}
            {runSession?.status === 'active' && (
              <form className="space-y-3" onSubmit={finishRun}>
                <p role="status" className="font-bold text-primary-fixed-dim">Carrera en curso</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">Distancia (km)<input aria-label="Distancia en kilómetros" type="number" min="0.1" step="0.1" value={runDistanceKm} onChange={(event) => setRunDistanceKm(event.target.value)} className="mt-1 w-full rounded-xl" /></label>
                  <label className="text-sm">Duración (min)<input aria-label="Duración en minutos" type="number" min="1" step="1" value={runDurationMinutes} onChange={(event) => setRunDurationMinutes(event.target.value)} className="mt-1 w-full rounded-xl" /></label>
                </div>
                <Button type="submit" disabled={actionPending}>Finalizar carrera</Button>
              </form>
            )}
            {runSession?.status === 'pending' && <Button disabled={actionPending} onClick={startRun}>Iniciar carrera</Button>}
            <p className="text-xs text-on-surface-variant">El seguimiento GPS todavía no está disponible.</p>
          </Card>
        )}

        {dayPlan?.type === 'workout' && (
          <>
            <Card className="flex items-center justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">Tu plan</p>
                <p className="font-headline-lg text-lg mt-1">{FOCUS_LABELS[dayPlan.focus] ?? dayPlan.focus ?? 'Entrenamiento'}</p>
                <p className="text-on-surface-variant text-xs mt-2">{completed.length} de {exercises.length} ejercicios</p>
              </div>
              <ProgressRing percentage={percentage} size={88} label="Progreso de rutina" />
            </Card>
            <Card className="space-y-3">
              <div>
                <h2 className="font-headline-lg text-lg">¿Cómo llegas hoy?</h2>
                <p className="mt-1 text-xs text-on-surface-variant">El ajuste solo afecta esta sesión, no tu plan semanal.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Adaptar sesión">
                {[['normal', 'Bien'], ['tired', 'Cansado'], ['short', 'Poco tiempo'], ['discomfort', 'Molestia']].map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={sessionMode === value} onClick={() => setSessionMode(value)}
                    className={`rounded-xl border px-2 py-3 text-sm font-bold ${sessionMode === value ? 'border-primary-fixed-dim bg-primary-fixed/15 text-primary-fixed-dim' : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {sessionMode === 'discomfort' && (
                <div role="alert" className="rounded-xl border border-error/30 bg-error-container/20 p-3 text-sm">
                  Detén cualquier movimiento que cause dolor. Usa “Cambiar ejercicio” para elegir una alternativa más suave; si el dolor es intenso o persiste, termina la sesión y consulta a un profesional.
                </div>
              )}
            </Card>
            <section aria-labelledby="exercises-heading">
              <h2 id="exercises-heading" className="font-headline-lg text-lg mb-3">Ejercicios</h2>
              <div className="space-y-3">
                {exercises.map((exercise, index) => {
                  const checked = !!progressById.get(exercise.id)?.completed;
                  const reference = findExerciseReference(exercise.name);
                  return (
                    <Card key={exercise.id ?? index} className={checked ? 'border border-primary-fixed-dim/40' : ''}>
                      <label className="flex items-center gap-4 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={checked} disabled={actionPending}
                          onChange={(event) => toggleExercise(exercise.id, event.target.checked)}
                          aria-label={exercise.name} className="h-6 w-6 rounded text-secondary-fixed-dim" />
                        <span className="flex-1">
                          <span className="block font-bold">{exercise.name}</span>
                          <span className="block text-on-surface-variant text-sm mt-1">{exerciseDetail(exercise)}</span>
                          <span className="mt-2 flex flex-wrap gap-4">
                            {reference && <button type="button" onClick={(event) => { event.preventDefault(); setOpenReferenceExerciseId(exercise.id); }} className="text-primary-fixed-dim underline text-sm">Ver técnica</button>}
                            <button type="button" onClick={(event) => { event.preventDefault(); substituteExercise(exercise); }} className="text-primary-fixed-dim underline text-sm">Cambiar ejercicio</button>
                          </span>
                        </span>
                      </label>
                      {reference && openReferenceExerciseId === exercise.id && <FormReferenceModal isOpen exerciseName={exercise.name} reference={reference} onClose={() => setOpenReferenceExerciseId(null)} />}
                    </Card>
                  );
                })}
              </div>
            </section>
            <div className="space-y-3">
              <Button className="w-full" disabled={exercises.length === 0} onClick={() => setGuidedMode(true)}>Comenzar entrenamiento guiado</Button>
              <Button className="w-full" disabled={completed.length === 0} onClick={() => registerCompleted()}>Registrar como entrenamiento</Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/subir-prueba')}>Registro manual</Button>
            </div>
          </>
        )}
      </div>

      {restingExerciseId && (() => {
        const index = exercises.findIndex((exercise) => exercise.id === restingExerciseId);
        return <RestTimer key={restingExerciseId} initialSeconds={exercises[index]?.restSeconds ?? 60}
          exerciseName={exercises[index]?.name} nextExerciseName={exercises[index + 1]?.name}
          onComplete={() => setRestingExerciseId(null)} onSkip={() => setRestingExerciseId(null)} />;
      })()}
      {guidedMode && <GuidedWorkout
        sessionId={`${currentUser.uid}:${weekId}:${isoWeekday}`}
        exercises={exercises}
        progressById={progressById}
        onCompleteExercise={(exerciseId) => toggleExercise(exerciseId, true, false)}
        onFinish={(elapsedSeconds, completedExerciseIds) => registerCompleted(elapsedSeconds, completedExerciseIds)}
        onClose={() => setGuidedMode(false)}
      />}
    </Layout>
  );
}

export default Rutina;
