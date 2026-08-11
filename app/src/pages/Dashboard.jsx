import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useDuelWorkouts } from '../hooks/useDuelWorkouts';
import { compareActiveDays } from '../duel/activeDays';
import {
  deriveWeeklyDuelHistory,
  endOfMexicoCityDay,
  weekDayNumber,
} from '../duel/weeklyHistory';
import { DUEL_TIME_ZONE, formatWorkoutDate, getDuelWeekContext } from '../utils/dates';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import VSDisplay from '../components/VSDisplay';
import ProgressRing from '../components/ProgressRing';
import StreakBadge from '../components/StreakBadge';
import CountdownTimer from '../components/CountdownTimer';
import WeeklyPlanCard from '../components/WeeklyPlanCard';
import { generatePlanIfMissing, getPlan } from '../firebase/plans';
import {
  getOrCreateWorkoutProgress,
  toggleExerciseCompletion,
  makeProgressId,
  subscribeToWorkoutProgress,
} from '../firebase/workoutProgress';
import {
  getOrCreateRunSession,
  makeRunId,
  startRunSession,
  subscribeToRunSession,
} from '../firebase/runSessions';

// Longest uid we're willing to treat as a human-readable label. Real Firebase
// uids are ~28 opaque characters, and capitalizing one renders garbage like
// "Xk9dpq2flm…" as a participant's name — actively wrong. Anything longer
// than a plausible short name degrades to a generic placeholder instead.
const MAX_LABEL_UID_LENGTH = 12;

export function labelForUid(uid, fallback = 'Jugador') {
  if (!uid || typeof uid !== 'string') return fallback;
  if (uid.length > MAX_LABEL_UID_LENGTH) return fallback;
  return uid.charAt(0).toUpperCase() + uid.slice(1);
}

function formatWorkoutTitle(workout) {
  if (!workout.exercises || workout.exercises.length === 0) return 'Entrenamiento';
  return workout.exercises.map((exercise) => exercise.name).join(', ');
}

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { duel = null, loading: duelLoading = false, error: duelError = null } = useActiveDuel() ?? {};
  const duelId = duel?.duelId;
  const {
    workouts = [],
    loading: workoutsLoading = false,
    error: workoutsError = null,
  } = useDuelWorkouts(duelId) ?? {};

  // Countdown target derived from the duel's own week boundaries (real UTC
  // Timestamps written by firebase/firestore.js's computeWeekBoundaries)
  // instead of the viewer's local midnight. Memoized on the boundary
  // timestamps — not on the `duel` object, whose identity changes every
  // render — so CountdownTimer's effect doesn't restart its interval
  // constantly.
  const loading = duelLoading || workoutsLoading;
  const error = duelError || workoutsError || null;
  const now = React.useMemo(() => new Date(), []);
  const duelTimeZone = duel?.timezone ?? DUEL_TIME_ZONE;
  const { weekId, isoWeekday: currentDay } = React.useMemo(
    () => getDuelWeekContext(now, duelTimeZone),
    [duelTimeZone, now],
  );
  const profileGender = duel?.scoringSnapshot?.users?.[currentUser?.uid]?.gender
    ?? duel?.participantProfiles?.[currentUser?.uid]?.gender
    ?? currentUser?.gender
    ?? 'M';

  const [weeklyPlan, setWeeklyPlan] = React.useState(null);
  const [todayProgress, setTodayProgress] = React.useState(null);
  const [runSession, setRunSession] = React.useState(null);
  const [planLoading, setPlanLoading] = React.useState(false);
  const [planError, setPlanError] = React.useState(null);
  const [actionPending, setActionPending] = React.useState(false);
  const planRequestRef = React.useRef(0);

  const loadWeeklyPlan = React.useCallback(async () => {
    if (!duelId || !currentUser?.uid) return;
    const requestId = ++planRequestRef.current;
    const isCurrentRequest = () => planRequestRef.current === requestId;

    setPlanLoading(true);
    setPlanError(null);

    try {
      const profile = { gender: profileGender };
      await generatePlanIfMissing(duelId, currentUser.uid, weekId, profile);
      if (!isCurrentRequest()) return;

      const plan = await getPlan(duelId, currentUser.uid, weekId);
      if (!isCurrentRequest()) return;

      const today = plan?.days?.[String(currentDay)] ?? null;

      setWeeklyPlan(plan);
      setTodayProgress(null);
      setRunSession(null);

      if (today?.type === 'workout') {
        const progress = await getOrCreateWorkoutProgress(
          duelId,
          currentUser.uid,
          weekId,
          currentDay,
          today,
        );
        if (isCurrentRequest()) setTodayProgress(progress);
      }

      if (today?.type === 'run') {
        const runId = makeRunId(currentUser.uid, weekId, currentDay);
        const session = await getOrCreateRunSession(
          duelId,
          currentUser.uid,
          weekId,
          currentDay,
          today,
        );
        if (isCurrentRequest()) {
          setRunSession({ ...session, runId });
        }
      }
    } catch (err) {
      if (isCurrentRequest()) setPlanError('No pudimos cargar tu semana.');
    } finally {
      if (isCurrentRequest()) setPlanLoading(false);
    }
  }, [currentDay, currentUser?.uid, duelId, profileGender, weekId]);

  React.useEffect(() => {
    planRequestRef.current += 1;
    setWeeklyPlan(null);
    setTodayProgress(null);
    setRunSession(null);
    setPlanError(null);
    setPlanLoading(Boolean(duelId && currentUser?.uid));
    setActionPending(false);
    loadWeeklyPlan();
    return () => {
      planRequestRef.current += 1;
    };
  }, [currentUser?.uid, duelId, loadWeeklyPlan]);

  React.useEffect(() => {
    if (!duelId || !currentUser?.uid || !weeklyPlan) return undefined;
    const today = weeklyPlan.days?.[String(currentDay)];
    if (today?.type === 'workout') {
      return subscribeToWorkoutProgress(
        duelId,
        makeProgressId(currentUser.uid, weekId, currentDay),
        setTodayProgress,
        () => setPlanError('No pudimos sincronizar tu progreso.'),
      );
    }
    if (today?.type === 'run') {
      return subscribeToRunSession(
        duelId,
        makeRunId(currentUser.uid, weekId, currentDay),
        setRunSession,
        () => setPlanError('No pudimos sincronizar la carrera.'),
      );
    }
    return undefined;
  }, [currentDay, currentUser?.uid, duelId, weekId, weeklyPlan]);

  const handleToggleExercise = React.useCallback(async (exerciseId, completed) => {
    if (!duelId || !currentUser?.uid) return;
    const requestId = planRequestRef.current;

    setActionPending(true);
    setPlanError(null);
    try {
      const progressId = makeProgressId(currentUser.uid, weekId, currentDay);
      const updated = await toggleExerciseCompletion(duelId, progressId, exerciseId, completed);
      if (planRequestRef.current === requestId) setTodayProgress(updated);
    } catch (err) {
      if (planRequestRef.current === requestId) {
        setPlanError('No pudimos actualizar tu progreso.');
      }
    } finally {
      if (planRequestRef.current === requestId) setActionPending(false);
    }
  }, [currentDay, currentUser?.uid, duelId, weekId]);

  const handleStartRun = React.useCallback(async () => {
    if (!duelId || !runSession?.runId) return;
    const requestId = planRequestRef.current;

    setActionPending(true);
    setPlanError(null);
    try {
      const updated = await startRunSession(duelId, runSession.runId);
      if (planRequestRef.current === requestId) setRunSession(updated);
    } catch (err) {
      if (planRequestRef.current === requestId) setPlanError('No pudimos iniciar la carrera.');
    } finally {
      if (planRequestRef.current === requestId) setActionPending(false);
    }
  }, [duelId, runSession?.runId]);

  if (loading) {
    return (
      <Layout active="inicio">
        <p role="status" className="text-on-surface-variant text-center p-8">
          Cargando tu duelo...
        </p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout active="inicio">
        <p role="alert" className="text-error text-center p-8">
          No pudimos cargar tu duelo. Intenta de nuevo más tarde.
        </p>
      </Layout>
    );
  }

  const uidA = duel?.userA_uid;
  const uidB = duel?.userB_uid;
  const nameA = duel?.participantNames?.[uidA] || labelForUid(uidA, 'Jugador 1');
  const nameB = duel?.participantNames?.[uidB] || labelForUid(uidB, 'Jugador 2');
  const { currentWeek } = deriveWeeklyDuelHistory(workouts, duel, now);
  const activityA = currentWeek.participantA;
  const activityB = currentWeek.participantB;
  const mine = currentUser?.uid === uidB ? activityB : activityA;
  const rival = currentUser?.uid === uidB ? activityA : activityB;
  const comparison = compareActiveDays(mine.activeDays, rival.activeDays);
  const comparisonCopy = {
    ahead: 'Vas adelante',
    behind: 'Tu rival va adelante',
    tied: 'Van iguales',
  }[comparison];

  // "Día X de 7" measured against the duel's real week start, not the local
  // browser's day-of-week.
  const dayNumber = weekDayNumber(now);
  const targetTime = endOfMexicoCityDay(now);
  const todayPlan = weeklyPlan?.days?.[String(currentDay)];
  let guidedSession = null;
  try {
    guidedSession = JSON.parse(localStorage.getItem(`comar-fit:guided:${currentUser.uid}:${weekId}:${currentDay}`));
  } catch { guidedSession = null; }

  return (
    <Layout active="inicio">
      <div className="space-y-8">
        <section>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Día {dayNumber} de 7</h1>
        </section>

        {todayPlan?.type === 'workout' && (
          <Card className="space-y-4 border border-primary-fixed-dim/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary-fixed-dim">Entrenamiento de hoy</p>
                <h2 className="mt-1 font-headline-lg text-xl">{todayPlan.exercises?.length ?? 0} ejercicios</h2>
                <p className="mt-1 text-sm text-on-surface-variant">{todayProgress?.completedCount ?? 0} completados{guidedSession?.elapsedSeconds ? ` · ${Math.max(1, Math.round(guidedSession.elapsedSeconds / 60))} min activos` : ''}</p>
              </div>
              <span className="material-symbols-outlined text-3xl text-primary-fixed-dim" aria-hidden="true">fitness_center</span>
            </div>
            <Button className="w-full" onClick={() => navigate('/rutina')}>{guidedSession ? 'Continuar entrenamiento' : 'Comenzar entrenamiento'}</Button>
          </Card>
        )}

        <WeeklyPlanCard
          plan={weeklyPlan}
          currentDay={currentDay}
          progress={todayProgress}
          runSession={runSession}
          loading={planLoading}
          error={planError}
          actionPending={actionPending}
          onToggleExercise={handleToggleExercise}
          onStartRun={handleStartRun}
          onRetry={loadWeeklyPlan}
        />

        <VSDisplay
          participantA={{ name: nameA, avatarUrl: duel?.participantProfiles?.[uidA]?.avatarUrl, status: `${activityA.activeDays}/7 días` }}
          participantB={{ name: nameB, avatarUrl: duel?.participantProfiles?.[uidB]?.avatarUrl, status: `${activityB.activeDays}/7 días` }}
        />

        <section className="flex justify-around items-center gap-4">
          <ProgressRing percentage={activityA.percentage} label={`Días activos de ${nameA}`} />
          <ProgressRing percentage={activityB.percentage} label={`Días activos de ${nameB}`} />
        </section>

        <section className="flex justify-around items-center gap-4">
          <StreakBadge streak={activityA.streak} />
          <StreakBadge streak={activityB.streak} />
        </section>

        <p className="text-center text-primary-fixed-dim font-bold" aria-live="polite">
          {comparisonCopy}
        </p>

        <CountdownTimer targetTime={targetTime} />

        <Card>
          <h2 className="font-label-md text-on-surface uppercase tracking-widest text-xs mb-4">
            Actividad reciente
          </h2>

          {workouts.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              Aún no hay actividad. ¡Sube tu primer entrenamiento para empezar el duelo!
            </p>
          ) : (
            <ul className="space-y-3">
              {workouts.map((workout) => (
                <li
                  key={workout.workoutId}
                  className="flex items-center justify-between gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10"
                >
                  <div>
                    <p className="text-on-surface font-body-md text-sm font-bold">
                      {formatWorkoutTitle(workout)}
                    </p>
                    <p className="text-on-surface-variant text-xs mt-0.5">
                      {formatWorkoutDate(workout)}
                    </p>
                  </div>
                  {typeof workout.totalMinutes === 'number' && (
                    <span className="text-on-surface-variant text-xs">{workout.totalMinutes} min</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Button variant="primary" className="w-full" onClick={() => navigate('/subir-prueba')}>
          Subir entrenamiento
        </Button>
      </div>
    </Layout>
  );
}

export default Dashboard;
