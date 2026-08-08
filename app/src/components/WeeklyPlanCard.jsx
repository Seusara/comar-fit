const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const FOCUS_LABELS = {
  chest_triceps: 'Pecho + tríceps',
  back_biceps: 'Espalda + bíceps',
  legs_glutes: 'Piernas + glúteos',
  legs: 'Piernas',
  fullbody_core: 'Cuerpo completo + core',
  fullbody_shoulder_core: 'Cuerpo completo + hombros + core',
  upper_body: 'Tren superior',
};

const STATUS_ICONS = {
  Descanso: '—',
  Planeado: '○',
  'En curso': '▶',
  Pendiente: '!',
  Parcial: '◐',
  Completado: '✓',
  Hoy: '●',
};

function dayStatus(dayNumber, dayPlan, currentDay, progress, runSession) {
  if (dayPlan.type === 'rest') return 'Descanso';
  if (dayNumber > currentDay) return 'Planeado';
  if (dayPlan.type === 'run') {
    if (runSession?.status === 'completed') return 'Completado';
    return runSession?.status === 'active' ? 'En curso' : 'Pendiente';
  }
  if (dayNumber === currentDay && progress) {
    return progress.completionRate >= 80 || progress.status === 'completed'
      ? 'Completado'
      : progress.status === 'partial'
        ? 'Parcial'
        : 'Pendiente';
  }
  return dayNumber < currentDay ? 'Pendiente' : 'Hoy';
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return null;
  const kilometers = distanceMeters / 1000;
  return `${kilometers.toLocaleString('es-MX', { maximumFractionDigits: 1 })} km`;
}

function formatDuration(durationSeconds) {
  if (!Number.isFinite(durationSeconds)) return null;
  return `${Math.round(durationSeconds / 60)} min`;
}

function formatRunTarget(target = {}) {
  const targetParts = [
    formatDistance(target.distanceMeters ?? target.targetDistanceMeters),
    formatDuration(target.durationSeconds ?? target.targetDurationSeconds),
  ].filter(Boolean);
  return targetParts.length > 0 ? targetParts.join(' o ') : 'Meta por definir';
}

function getDayTitle(dayPlan) {
  if (dayPlan.type === 'rest') return 'Descanso';
  if (dayPlan.type === 'run') return 'Carrera';
  return FOCUS_LABELS[dayPlan.focus] ?? dayPlan.focus ?? 'Entrenamiento';
}

function formatExerciseDosage(exercise) {
  if (!Number.isFinite(exercise?.sets)) return null;
  const series = `${exercise.sets} ${exercise.sets === 1 ? 'serie' : 'series'}`;
  if (Number.isFinite(exercise.reps)) {
    return `${series} × ${exercise.reps} ${exercise.reps === 1 ? 'repetición' : 'repeticiones'}`;
  }
  if (Number.isFinite(exercise.durationSeconds)) {
    return `${series} × ${exercise.durationSeconds} ${exercise.durationSeconds === 1 ? 'segundo' : 'segundos'}`;
  }
  return null;
}

function WorkoutDetails({ dayPlan, progress, actionPending, onToggleExercise }) {
  const planExercises = Array.isArray(dayPlan.exercises) ? dayPlan.exercises : [];
  const progressExercises = Array.isArray(progress?.exercises) ? progress.exercises : [];
  const progressById = new Map(progressExercises.map((exercise) => [exercise.id, exercise]));
  const exercises = planExercises.length > 0 ? planExercises : progressExercises;
  const totalCount = Number.isFinite(progress?.totalCount) ? progress.totalCount : exercises.length;
  const completedCount = Number.isFinite(progress?.completedCount)
    ? progress.completedCount
    : exercises.filter((exercise) => progressById.get(exercise.id)?.completed ?? exercise.completed).length;
  const percentage = Number.isFinite(progress?.completionRate)
    ? progress.completionRate
    : totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-base font-bold text-on-surface">
        {FOCUS_LABELS[dayPlan.focus] ?? dayPlan.focus ?? 'Entrenamiento'}
      </h3>
      {exercises.length > 0 ? (
        <ul className="space-y-2" aria-label="Ejercicios de hoy">
          {exercises.map((exercise, index) => {
            const progressExercise = progressById.get(exercise.id);
            const completed = progressExercise?.completed ?? !!exercise.completed;
            const exerciseId = exercise.id ?? exercise.name ?? `exercise-${index}`;
            const dosage = formatExerciseDosage({ ...exercise, ...progressExercise });
            return (
              <li key={exerciseId}>
                <label className="flex items-center gap-3 text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={completed}
                    disabled={actionPending}
                    onChange={(event) => onToggleExercise?.(exerciseId, event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block">{exercise.name ?? 'Ejercicio'}</span>
                    {dosage && <span className="block text-xs">{dosage}</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">Ejercicios por preparar.</p>
      )}
      <div className="flex items-center justify-between gap-3 text-sm text-on-surface-variant">
        <span>{completedCount} de {totalCount} ejercicios</span>
        <span>{percentage}% completado</span>
      </div>
      <p className="sr-only" aria-live="polite">
        {completedCount} de {totalCount} ejercicios, {percentage}% completado
      </p>
    </div>
  );
}

function ExpandedDay({ dayPlan, progress, runSession, actionPending, onToggleExercise, onStartRun }) {
  if (dayPlan.type === 'rest') {
    return <p className="mt-4 text-sm text-on-surface-variant">Hoy toca recuperación</p>;
  }

  if (dayPlan.type === 'run') {
    const isActive = runSession?.status === 'active';
    return (
      <div className="mt-4 space-y-3">
        <h3 className="text-base font-bold text-on-surface">Carrera</h3>
        <p className="text-sm text-on-surface-variant">Meta: {formatRunTarget(dayPlan.target)}</p>
        {isActive ? (
          <p className="text-sm font-bold text-primary-fixed-dim" role="status">Carrera en curso</p>
        ) : (
          <button
            type="button"
            className="tap-scale rounded-xl bg-primary-fixed-dim px-4 py-2 text-sm font-bold text-on-primary"
            disabled={actionPending}
            onClick={() => onStartRun?.()}
          >
            Iniciar carrera
          </button>
        )}
      </div>
    );
  }

  return (
    <WorkoutDetails
      dayPlan={dayPlan}
      progress={progress}
      actionPending={actionPending}
      onToggleExercise={onToggleExercise}
    />
  );
}

function WeeklyPlanCard({
  plan,
  currentDay,
  progress,
  runSession,
  loading = false,
  error,
  actionPending = false,
  onToggleExercise,
  onStartRun,
  onRetry,
}) {
  const activeDay = Number(currentDay);
  const days = plan?.days ?? {};
  const hasPlan = plan && plan.days;

  return (
    <section aria-labelledby="weekly-plan-heading" className="space-y-4">
      <h2 id="weekly-plan-heading" className="text-xl font-bold text-on-surface">Tu semana</h2>

      {loading && (
        <div className="rounded-2xl bg-surface-container-high p-5" role="status">
          <p className="text-sm text-on-surface-variant">Preparando tu semana…</p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-high p-5">
          <p role="alert" className="text-sm text-error">
            {typeof error === 'string' ? error : 'No pudimos cargar tu semana.'}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-xl border border-outline-variant/30 px-3 py-2 text-sm font-bold text-on-surface"
            onClick={onRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && hasPlan && (
        <ol aria-label="Plan semanal" className="space-y-2">
          {DAY_LABELS.map((dayLabel, index) => {
            const dayNumber = index + 1;
            const dayPlan = days[String(dayNumber)] ?? { type: 'rest' };
            const isCurrent = dayNumber === activeDay;
            const status = dayStatus(dayNumber, dayPlan, activeDay, progress, runSession);
            return (
              <li
                key={dayNumber}
                data-testid="week-day"
                data-current={isCurrent ? 'true' : 'false'}
                className={isCurrent
                  ? 'rounded-2xl border border-primary-fixed-dim/60 bg-surface-container-high p-4'
                  : 'rounded-2xl bg-surface-container-lowest p-4'}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-8 shrink-0 text-xs font-bold uppercase text-on-surface-variant">{dayLabel}</span>
                    {!isCurrent && (
                      <span className="truncate text-sm font-bold text-on-surface">{getDayTitle(dayPlan)}</span>
                    )}
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-on-surface-variant"
                    data-testid="day-status"
                  >
                    <span aria-hidden="true" data-testid="day-status-icon">
                      {STATUS_ICONS[status] ?? '•'}
                    </span>
                    <span>{status}</span>
                  </span>
                </div>
                {isCurrent && (
                  <ExpandedDay
                    dayPlan={dayPlan}
                    progress={progress}
                    runSession={runSession}
                    actionPending={actionPending}
                    onToggleExercise={onToggleExercise}
                    onStartRun={onStartRun}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default WeeklyPlanCard;
