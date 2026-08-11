import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { deleteWorkout } from '../firebase/workouts';
import { isInDuelWeek, resolvePerformedAt } from '../utils/dates';
import Layout from '../components/Layout';
import WorkoutCard from '../components/WorkoutCard';
import Card from '../components/Card';
import Button from '../components/Button';
import { summarizeWorkouts } from '../utils/workoutStats';

const FILTERS = [
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: '30 días' },
  { key: 'all', label: 'Todas' },
];

/**
 * The owner's own workout history (not a partner-approval flow). Filters,
 * sorts, and hands each workout to WorkoutCard, which already owns the
 * edit-window computation and the two-step delete confirmation UI — this
 * page only supplies the callbacks that actually navigate/call Firestore.
 */
function RevisarPrueba() {
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
  const [filter, setFilter] = useState('week');
  const [deleteError, setDeleteError] = useState('');

  // Combines every hook this page depends on, matching Dashboard.jsx's
  // pattern (`duelLoading || scoreLoading || workoutsLoading`). Without
  // this, the page could render "Aún no tienes entrenamientos" while the
  // duel is still resolving, or silently show an empty history if the duel
  // query itself errored.
  const loading = duelLoading || workoutsLoading;
  const error = duelError || workoutsError || null;

  const visibleWorkouts = useMemo(() => {
    // "Esta semana" means the duel's own week window (`weekStartDate` /
    // `weekEndDate`, real UTC Timestamps on the duel document), not a
    // locally-computed Monday.
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = filter === 'week'
      ? workouts.filter((workout) => isInDuelWeek(workout, duel))
      : filter === 'month'
        ? workouts.filter((workout) => (resolvePerformedAt(workout)?.getTime() ?? 0) >= monthAgo)
        : workouts;

    return [...filtered].sort((a, b) => {
      const dateA = resolvePerformedAt(a)?.getTime() ?? 0;
      const dateB = resolvePerformedAt(b)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [workouts, filter, duel]);
  const summary = useMemo(() => summarizeWorkouts(visibleWorkouts), [visibleWorkouts]);

  async function handleDelete(workout) {
    setDeleteError('');
    try {
      await deleteWorkout(duelId, workout.workoutId);
    } catch (err) {
      setDeleteError('No pudimos eliminar el entrenamiento. Intenta de nuevo.');
    }
  }

  if (loading) {
    return (
      <Layout active="pruebas">
        <p role="status" className="text-on-surface-variant text-center p-8">
          Cargando tu historial...
        </p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout active="pruebas">
        <p role="alert" className="text-error text-center p-8">
          No pudimos cargar tu historial. Intenta de nuevo más tarde.
        </p>
      </Layout>
    );
  }

  return (
    <Layout active="pruebas">
      <div className="space-y-6">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Tu historial</h1>

        <div className="flex gap-3" role="group" aria-label="Filtrar historial">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`tap-scale min-h-[44px] px-4 rounded-full font-label-md text-sm ${
                filter === item.key
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="grid grid-cols-3 gap-3" aria-label="Resumen del periodo">
          <Card className="p-3 text-center"><p className="text-xl font-bold text-primary-fixed-dim">{summary.workouts}</p><p className="text-xs text-on-surface-variant">Sesiones</p></Card>
          <Card className="p-3 text-center"><p className="text-xl font-bold text-primary-fixed-dim">{summary.minutes}</p><p className="text-xs text-on-surface-variant">Minutos</p></Card>
          <Card className="p-3 text-center"><p className="text-xl font-bold text-primary-fixed-dim">{summary.exercises}</p><p className="text-xs text-on-surface-variant">Ejercicios</p></Card>
        </section>

        {deleteError && (
          <p role="alert" className="text-error text-sm">
            {deleteError}
          </p>
        )}

        {workouts.length === 0 ? (
          <Card className="space-y-4 text-center">
            <p className="text-on-surface-variant text-sm">Aún no tienes entrenamientos. Empieza la rutina de hoy y registra tu primer entrenamiento.</p>
            <Button onClick={() => navigate('/rutina')}>Ir a mi rutina</Button>
          </Card>
        ) : visibleWorkouts.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center p-8">
            No hay entrenamientos en este periodo.
          </p>
        ) : (
          <ul className="space-y-4" aria-label="Historial de entrenamientos">
            {visibleWorkouts.map((workout) => (
              <li key={workout.workoutId}>
                <WorkoutCard
                  workout={workout}
                  editableUntil={workout.editableUntil}
                  onEdit={(w) => navigate(`/workouts/${w.workoutId}/edit`)}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

export default RevisarPrueba;
