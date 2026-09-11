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
import { DUEL_TIME_ZONE, getDuelWeekContext } from '../utils/dates';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import VSDisplay from '../components/VSDisplay';
import ProgressRing from '../components/ProgressRing';
import StreakBadge from '../components/StreakBadge';
import CountdownTimer from '../components/CountdownTimer';
import WeeklyPlanCard from '../components/WeeklyPlanCard';
import PageSkeleton from '../components/PageSkeleton';
import ProgressionSuggestions from '../components/ProgressionSuggestions';
import { getPendingSuggestion, acceptSuggestion, dismissSuggestion } from '../firebase/suggestions';
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

const MAX_LABEL_UID_LENGTH = 12;

export function labelForUid(uid, fallback = 'Jugador') {
  if (!uid || typeof uid !== 'string') return fallback;
  if (uid.length > MAX_LABEL_UID_LENGTH) return fallback;
  return uid.charAt(0).toUpperCase() + uid.slice(1);
}

// Compact duel status bar: VS + progress rings + streaks + comparison + countdown
// in a single card so the user sees the duel at a glance without scrolling.
function DuelCard({ nameA, nameB, avatarA, avatarB, activityA, activityB, comparisonCopy, targetTime }) {
  return (
    <Card className="space-y-4">
      <VSDisplay
        participantA={{ name: nameA, avatarUrl: avatarA, status: `${activityA.activeDays}/7 días` }}
        participantB={{ name: nameB, avatarUrl: avatarB, status: `${activityB.activeDays}/7 días` }}
      />

      <div className="flex items-center justify-around gap-2">
        <div className="flex flex-col items-center gap-1">
          <ProgressRing percentage={activityA.percentage} label={`Días activos de ${nameA}`} size={72} />
          <StreakBadge streak={activityA.streak} />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-bold text-primary-fixed-dim" aria-live="polite">
            {comparisonCopy}
          </p>
          <CountdownTimer targetTime={targetTime} compact />
        </div>
        <div className="flex flex-col items-center gap-1">
          <ProgressRing percentage={activityB.percentage} label={`Días activos de ${nameB}`} size={72} />
          <StreakBadge streak={activityB.streak} />
        </div>
      </div>
    </Card>
  );
}

function formatWorkoutTitle(workout) {
  if (!workout.exercises || workout.exercises.length === 0) return 'Entrenamiento';
  return workout.exercises.map((e) => e.name).join(', ');
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

  // Progression suggestions state
  const [suggestion, setSuggestion] = React.useState(null);
  const [suggestionPending, setSuggestionPending] = React.useState(false);

  // Load pending suggestion once per duel+week
  React.useEffect(() => {
    if (!duelId || !currentUser?.uid) return;
    getPendingSuggestion(duelId, currentUser.uid, weekId)
      .then(setSuggestion)
      .catch(() => {}); // non-critical; silent fail
  }, [duelId, currentUser?.uid, weekId]);

  const handleAcceptSuggestion = React.useCallback(async () => {
    if (!duelId || !currentUser?.uid) return;
    setSuggestionPending(true);
    try {
      await acceptSuggestion(duelId, currentUser.uid, weekId, suggestion?.days);
      setSuggestion(null);
    } catch { /* silent */ } finally {
      setSuggestionPending(false);
    }
  }, [duelId, currentUser?.uid, weekId, suggestion?.days]);

  const handleDismissSuggestion = React.useCallback(async () => {
    if (!duelId || !currentUser?.uid) return;
    setSuggestionPending(true);
    try {
      await dismissSuggestion(duelId, currentUser.uid, weekId);
      setSuggestion(null);
    } catch { /* silent */ } finally {
      setSuggestionPending(false);
    }
  }, [duelId, currentUser?.uid, weekId]);

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
        if (isCurrentRequest()) setRunSession({ ...session, runId });
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
    return () => { planRequestRef.current += 1; };
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
      if (planRequestRef.current === requestId) setPlanError('No pudimos actualizar tu progreso.');
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
    return <Layout active="inicio"><PageSkeleton label="Cargando tu duelo..." /></Layout>;
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
  const comparisonCopy = { ahead: 'Vas adelante', behind: 'Tu rival va adelante', tied: 'Van iguales' }[comparison];

  const dayNumber = weekDayNumber(now);
  const targetTime = endOfMexicoCityDay(now);

  let guidedSession = null;
  try {
    guidedSession = JSON.parse(localStorage.getItem(`comar-fit:guided:${currentUser.uid}:${weekId}:${currentDay}`));
  } catch { guidedSession = null; }

  const todayPlan = weeklyPlan?.days?.[String(currentDay)];
  const recentWorkouts = workouts.slice(0, 3);

  return (
    <Layout active="inicio">
      <div className="space-y-6">

        {/* Header */}
        <section>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Día {dayNumber} de 7</h1>
        </section>

        {/* Banner de sugerencias de progresión — solo al inicio de semana si hay pending */}
        <ProgressionSuggestions
          suggestion={suggestion}
          onAccept={handleAcceptSuggestion}
          onDismiss={handleDismissSuggestion}
          pending={suggestionPending}
        />

        {/* Plan semanal — centro de atención */}
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

        {/* CTA de entrenamiento — solo cuando hay workout hoy */}
        {todayPlan?.type === 'workout' && (
          <Button className="w-full" onClick={() => navigate('/rutina')}>
            {guidedSession ? 'Continuar entrenamiento' : 'Comenzar entrenamiento'}
          </Button>
        )}

        {/* Duelo compacto */}
        <DuelCard
          nameA={nameA}
          nameB={nameB}
          avatarA={duel?.participantProfiles?.[uidA]?.avatarUrl}
          avatarB={duel?.participantProfiles?.[uidB]?.avatarUrl}
          activityA={activityA}
          activityB={activityB}
          comparisonCopy={comparisonCopy}
          targetTime={targetTime}
        />

        {/* Actividad reciente — solo los 3 últimos, sin heading repetido */}
        {workouts.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center">
            Aún no hay actividad. ¡Sube tu primer entrenamiento para empezar el duelo!
          </p>
        ) : (
          <section aria-label="Actividad reciente">
            <h2 className="font-label-md text-on-surface uppercase tracking-widest text-xs mb-3">
              Actividad reciente
            </h2>
            <ul className="space-y-2">
              {recentWorkouts.map((workout) => {
                const performedAt = workout.performedAt?.toDate?.() ?? workout.performedAt;
                const dateStr = performedAt instanceof Date
                  ? performedAt.toISOString().slice(0, 10)
                  : String(performedAt ?? '');
                return (
                  <li
                    key={workout.workoutId}
                    className="flex items-center justify-between gap-4 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10"
                  >
                    <div>
                      <p className="text-on-surface text-sm font-bold">{formatWorkoutTitle(workout)}</p>
                      <p className="text-on-surface-variant text-xs mt-0.5">{dateStr}</p>
                    </div>
                    {typeof workout.totalMinutes === 'number' && (
                      <span className="text-on-surface-variant text-xs shrink-0">{workout.totalMinutes} min</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* CTA secundario siempre visible */}
        <Button variant="primary" className="w-full" onClick={() => navigate('/subir-prueba')}>
          Subir entrenamiento
        </Button>

      </div>
    </Layout>
  );
}

export default Dashboard;
