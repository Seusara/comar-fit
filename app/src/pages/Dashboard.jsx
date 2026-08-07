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
import { formatWorkoutDate } from '../utils/dates';
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
  const now = new Date();
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

  // Weekly plan: ensure a plan exists and read today's entry
  const [todayPlan, setTodayPlan] = React.useState(null);
  const [todayProgress, setTodayProgress] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    async function ensurePlan() {
      if (!duelId || !currentUser) return;
      const { default: plansModule } = await import('../firebase/plans');
      const weekId = plansModule.getWeekId(now);
      const profile = (duel?.participantProfiles || {})[currentUser.uid] || { gender: currentUser?.gender || 'M' };
      try {
        await plansModule.generatePlanIfMissing(duelId, currentUser.uid, weekId, profile);
        const plan = await plansModule.getPlan(duelId, currentUser.uid, weekId);
        const isoWeekday = String((new Date()).getUTCDay() === 0 ? 7 : (new Date()).getUTCDay());
        const todays = plan?.days?.[isoWeekday] ?? null;
        if (mounted) setTodayPlan(todays);

        // Only create/load progress for workout days
        if (todays && todays.type === 'workout') {
          try {
            const { makeProgressId, getOrCreateWorkoutProgress, getWorkoutProgress } = await import('../firebase/workoutProgress');
            const progressId = makeProgressId(currentUser.uid, weekId, Number(isoWeekday));
            // Create or get progress using the plan snapshot for this user
            const progress = await getOrCreateWorkoutProgress(duelId, currentUser.uid, weekId, Number(isoWeekday), todays);
            if (mounted) setTodayProgress(progress);
          } catch (err) {
            // if not a workout day or creation rejected, leave progress null
            console.error('Could not ensure workout progress', err);
          }
        }

      } catch (err) {
        // swallow errors for now; UI will continue showing workouts
        console.error('Could not ensure plan', err);
      }
    }
    ensurePlan();
    return () => { mounted = false; };
  }, [duelId, currentUser, now]);


  // "Día X de 7" measured against the duel's real week start, not the local
  // browser's day-of-week.
  const dayNumber = weekDayNumber(now);
  const targetTime = endOfMexicoCityDay(now);

  return (
    <Layout active="inicio">
      <div className="space-y-8">
        <section>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Día {dayNumber} de 7</h1>
        </section>

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

          {/* Today's plan summary */}
          <div className="mb-4">
            {todayPlan ? (
              todayPlan.type === 'rest' ? (
                <p className="text-on-surface-variant text-sm">Hoy toca descansar</p>
              ) : todayPlan.type === 'run' ? (
                <div>
                  <p className="text-on-surface font-body-md text-sm font-bold">Hoy toca carrera</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">Meta: {todayPlan.target.distanceMeters/1000} km o {Math.round(todayPlan.target.durationSeconds/60)} min</p>
                </div>
              ) : (
                <div>
                  <p className="text-on-surface font-body-md text-sm font-bold">Hoy te toca: {todayPlan.focus.replace('_',' + ')}</p>
                  <div className="mt-2">
                    {todayPlan.exercises.map((ex) => {
                      const progressEx = todayProgress?.exercises?.find((p) => p.id === ex.id);
                      const completed = !!progressEx?.completed;
                      return (
                        <label key={ex.id} className="flex items-center gap-3 text-on-surface-variant text-sm">
                          <input type="checkbox" checked={completed} onChange={async (e) => {
                            // toggle via workoutProgress API
                            try {
                              const { toggleExerciseCompletion, makeProgressId } = await import('../firebase/workoutProgress');
                              const weekId = (await import('../firebase/plans')).default.getWeekId(now);
                              const progressId = makeProgressId(currentUser.uid, weekId, dayNumber);
                              const updated = await toggleExerciseCompletion(duelId, progressId, ex.id, e.target.checked);
                              setTodayProgress(updated);
                            } catch (err) {
                              console.error('Could not toggle exercise', err);
                            }
                          }} />
                          <span>{ex.name} — {ex.sets} x {ex.reps ?? (ex.durationSeconds ? `${ex.durationSeconds}s` : '')}</span>
                        </label>
                      );
                    })}

                    {/* progress summary */}
                    <div className="mt-2 text-on-surface-variant text-sm">
                      {todayProgress ? (
                        <div>
                          <div>{todayProgress.completedCount} de {todayProgress.totalCount} ejercicios</div>
                          <div>{todayProgress.completionRate}% completado {todayProgress.completionRate >= 80 ? '✅ Entrenamiento completado' : ''}</div>
                        </div>
                      ) : (
                        <div>Progreso no iniciado</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="text-on-surface-variant text-sm">Cargando plan semanal...</p>
            )}
          </div>

          <h3 className="font-label-md text-on-surface uppercase tracking-widest text-xs mb-4">Actividad reciente</h3>
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
