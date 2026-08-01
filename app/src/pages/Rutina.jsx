import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import ProgressRing from '../components/ProgressRing';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { generateDailyRoutine, routineHistoryKey, routineProgressKey } from '../routines/generateDailyRoutine';
import { routineDayKey } from '../routines/routineDay';

function readProgress(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];
  } catch {
    return [];
  }
}

function exerciseDetail(exercise) {
  if (exercise.reps === 1 && exercise.sets === 1) return `${exercise.minutes} min`;
  return `${exercise.sets} series × ${exercise.reps} reps`;
}

function Rutina() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { duel } = useActiveDuel();
  const dayKey = routineDayKey(new Date(), duel?.timezone);
  const progressKey = routineProgressKey(currentUser?.uid ?? 'guest', dayKey);
  const historyKey = routineHistoryKey(currentUser?.uid ?? 'guest');
  const recentExerciseIds = readProgress(historyKey);
  const routine = useMemo(() => generateDailyRoutine({
    profile: profile ?? {}, uid: currentUser?.uid ?? 'guest', dayKey, recentExerciseIds,
  // recentExerciseIds is a storage snapshot; profile/day changes are the regeneration boundaries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentUser?.uid, dayKey, profile]);
  const [completedIds, setCompletedIds] = useState(() => readProgress(progressKey));

  useEffect(() => {
    setCompletedIds(readProgress(progressKey));
  }, [progressKey]);

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(routine.phases.flatMap((phase) => phase.exercises.map((exercise) => exercise.id))));
  }, [historyKey, routine]);

  const exercises = routine.phases.flatMap((phase) => phase.exercises);
  const validIds = new Set(exercises.map((exercise) => exercise.id));
  const completed = completedIds.filter((id) => validIds.has(id));
  const percentage = exercises.length === 0 ? 0 : (completed.length / exercises.length) * 100;

  function toggleExercise(id) {
    setCompletedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem(progressKey, JSON.stringify(next));
      return next;
    });
  }

  function registerCompleted() {
    const selected = exercises.filter((exercise) => completed.includes(exercise.id)).map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.minutes,
    }));
    navigate('/subir-prueba', { state: { source: 'daily-routine', exercises: selected } });
  }

  const loading = profileLoading;
  const error = profileError;
  if (loading) return <Layout active="rutina"><p role="status" className="text-center p-8">Cargando rutina...</p></Layout>;
  if (error || !profile) {
    return (
      <Layout active="rutina">
        <Card className="text-center space-y-4">
          <h1 className="font-headline-lg text-xl">No pudimos preparar tu rutina</h1>
          <p className="text-on-surface-variant text-sm">Revisa tu perfil e intenta nuevamente.</p>
          <Link to="/perfil" className="inline-flex min-h-[44px] items-center text-primary-fixed-dim font-bold">Ir a Perfil</Link>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout active="rutina">
      <div className="space-y-6">
        <header>
          <p className="text-primary-fixed-dim text-xs uppercase tracking-widest">{dayKey}</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile mt-1">Rutina de hoy</h1>
          <p className="text-on-surface-variant text-sm mt-2">Preparada para tu nivel, objetivo y equipo.</p>
        </header>

        {routine.isFallback && (
          <Card className="border border-tertiary-fixed-dim/30">
            <p className="font-bold">Rutina segura de inicio</p>
            <p className="text-on-surface-variant text-sm mt-1">Completa tus preferencias para recibir una sesión más personalizada.</p>
            <Link to="/perfil" className="inline-flex mt-3 text-tertiary-fixed-dim font-bold min-h-[44px] items-center">Completar perfil</Link>
          </Card>
        )}

        <Card className="flex items-center justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">Tu plan</p>
            <p className="font-headline-lg text-lg mt-1">{profile.objective || 'Condición general'}</p>
            <p className="text-on-surface-variant text-sm mt-1">
              {profile.experienceLevel || 'Principiante'} · {routine.durationMinutes} min
            </p>
            <p className="text-on-surface-variant text-xs mt-1">
              Equipo: {Array.isArray(profile.equipment) && profile.equipment.length > 0 ? profile.equipment.join(', ') : 'peso corporal'}
            </p>
            <p className="text-on-surface-variant text-xs mt-2">{completed.length} de {exercises.length} ejercicios</p>
          </div>
          <ProgressRing percentage={percentage} size={88} label="Progreso de rutina" />
        </Card>

        {routine.phases.map((phase) => (
          <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
            <h2 id={`phase-${phase.id}`} className="font-headline-lg text-lg mb-3">{phase.label}</h2>
            <div className="space-y-3">
              {phase.exercises.map((exercise) => {
                const checked = completed.includes(exercise.id);
                return (
                  <Card key={exercise.id} className={checked ? 'border border-primary-fixed-dim/40' : ''}>
                    <label className="flex items-center gap-4 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExercise(exercise.id)}
                        aria-label={exercise.name}
                        className="h-6 w-6 rounded text-secondary-fixed-dim focus:ring-primary-fixed-dim"
                      />
                      <span className="flex-1">
                        <span className="block font-bold">{exercise.name}</span>
                        <span className="block text-on-surface-variant text-sm mt-1">{exerciseDetail(exercise)} · Descanso {exercise.restSeconds}s</span>
                      </span>
                      <span className="material-symbols-outlined text-primary-fixed-dim" aria-hidden="true">{checked ? 'check_circle' : 'radio_button_unchecked'}</span>
                    </label>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        <div className="space-y-3">
          <Button className="w-full" disabled={completed.length === 0} onClick={registerCompleted}>Registrar como entrenamiento</Button>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/subir-prueba')}>Registro manual</Button>
        </div>
      </div>
    </Layout>
  );
}

export default Rutina;
