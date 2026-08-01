import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { useDuelScore } from '../hooks/useDuelScore';
import { duelDayNumber, endOfCurrentDuelDay, formatWorkoutDate, toDate } from '../utils/dates';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import VSDisplay from '../components/VSDisplay';
import ProgressRing from '../components/ProgressRing';
import StreakBadge from '../components/StreakBadge';
import CountdownTimer from '../components/CountdownTimer';

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
  // Defaults on every stub-hook destructure: the real Task 5 hooks may not
  // return exactly these key names (the plan's literal text says
  // `{data, loading, error}`), and a missing key must degrade to an empty
  // state rather than crash the whole Dashboard.
  const { duel = null, loading: duelLoading = false, error: duelError = null } = useActiveDuel() ?? {};
  const duelId = duel?.duelId;
  const {
    weekData = null,
    loading: scoreLoading = false,
    error: scoreError = null,
  } = useDuelScore(duelId) ?? {};
  const {
    workouts = [],
    loading: workoutsLoading = false,
    error: workoutsError = null,
  } = useWorkouts(duelId, currentUser?.uid) ?? {};

  // Countdown target derived from the duel's own week boundaries (real UTC
  // Timestamps written by firebase/firestore.js's computeWeekBoundaries)
  // instead of the viewer's local midnight. Memoized on the boundary
  // timestamps — not on the `duel` object, whose identity changes every
  // render — so CountdownTimer's effect doesn't restart its interval
  // constantly.
  const weekStartMs = toDate(duel?.weekStartDate)?.getTime() ?? null;
  const weekEndMs = toDate(duel?.weekEndDate)?.getTime() ?? null;
  const targetTime = useMemo(
    () => endOfCurrentDuelDay(duel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStartMs, weekEndMs]
  );

  const loading = duelLoading || scoreLoading || workoutsLoading;
  const error = duelError || scoreError || workoutsError || null;

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

  // `weeks/{weekId}` keys every per-participant map by uid (design spec
  // "duels/{duelId}/weeks/{weekId}"), so scores/streaks are looked up with
  // the duel's participant uids. A missing entry means "no aggregate yet",
  // which the spec says must render as zero.
  const uidA = duel?.userA_uid;
  const uidB = duel?.userB_uid;
  const nameA = duel?.participantNames?.[uidA] || labelForUid(uidA, 'Jugador 1');
  const nameB = duel?.participantNames?.[uidB] || labelForUid(uidB, 'Jugador 2');
  const scoreA = weekData?.scores?.[uidA]?.score ?? 0;
  const scoreB = weekData?.scores?.[uidB]?.score ?? 0;
  const streakA = weekData?.streaks?.[uidA] ?? 0;
  const streakB = weekData?.streaks?.[uidB] ?? 0;

  // "Día X de 7" measured against the duel's real week start, not the local
  // browser's day-of-week.
  const dayNumber = duelDayNumber(duel);

  return (
    <Layout active="inicio">
      <div className="space-y-8">
        <section>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Día {dayNumber} de 7</h1>
        </section>

        <VSDisplay
          participantA={{ name: nameA, score: scoreA }}
          participantB={{ name: nameB, score: scoreB }}
        />

        <section className="flex justify-around items-center gap-4">
          <ProgressRing percentage={scoreA} label={`Score de ${nameA}`} />
          <ProgressRing percentage={scoreB} label={`Score de ${nameB}`} />
        </section>

        <section className="flex justify-around items-center gap-4">
          <StreakBadge streak={streakA} />
          <StreakBadge streak={streakB} />
        </section>

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
