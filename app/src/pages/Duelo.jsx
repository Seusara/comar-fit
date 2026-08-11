import Layout from '../components/Layout';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import DuelWeekTrack from '../components/DuelWeekTrack';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useDuelWorkouts } from '../hooks/useDuelWorkouts';
import { deriveWeeklyDuelHistory } from '../duel/weeklyHistory';

function participantName(duel, uid, fallback) {
  return duel?.participantNames?.[uid] || fallback;
}

function compactDate(dayKey) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
    .format(date)
    .replace('.', '');
}

function weekRange(week) {
  return `${compactDate(week.startKey)} – ${compactDate(week.endKey)}`;
}

export function resultLabel(week, nameA, nameB) {
  if (week.result === 'tied') return 'Empate';
  return `Ganó ${week.result === 'participantA' ? nameA : nameB}`;
}

function leadMessage(week, nameA, nameB) {
  const difference = week.participantA.activeDays - week.participantB.activeDays;
  if (difference === 0) {
    return difference === 0 && week.participantA.activeDays === 0
      ? 'La semana está abierta.'
      : 'Empate perfecto. Van día por día.';
  }
  const leader = difference > 0 ? nameA : nameB;
  const days = Math.abs(difference);
  return `${leader} va arriba por ${days} ${days === 1 ? 'día' : 'días'}.`;
}

function seasonTotals(weeks) {
  return weeks.reduce((totals, week) => {
    if (week.result === 'participantA') totals.winsA += 1;
    if (week.result === 'participantB') totals.winsB += 1;
    if (week.result === 'tied') totals.ties += 1;
    return totals;
  }, { winsA: 0, winsB: 0, ties: 0 });
}

function MetricRow({ label, valueA, valueB, testId }) {
  return (
    <div data-testid={testId} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-outline-variant/10 py-3 last:border-0">
      <strong className="font-stats-num text-xl text-primary-fixed-dim">{valueA}</strong>
      <span className="text-center text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <strong className="text-right font-stats-num text-xl text-secondary-fixed-dim">{valueB}</strong>
    </div>
  );
}

function Duelo() {
  const { duel = null, loading: duelLoading = false, error: duelError = null }
    = useActiveDuel() ?? {};
  const {
    workouts = [],
    loading: workoutsLoading = false,
    error: workoutsError = null,
  } = useDuelWorkouts(duel?.duelId) ?? {};

  if (duelLoading || workoutsLoading) {
    return (
      <Layout active="duelo">
        <p role="status" className="p-8 text-center text-on-surface-variant">Cargando duelo...</p>
      </Layout>
    );
  }

  if (duelError || workoutsError || !duel) {
    return (
      <Layout active="duelo">
        <p role="alert" className="p-8 text-center text-error">No pudimos cargar el duelo.</p>
      </Layout>
    );
  }

  const uidA = duel.userA_uid;
  const uidB = duel.userB_uid;
  const nameA = participantName(duel, uidA, 'Jugador 1');
  const nameB = participantName(duel, uidB, 'Jugador 2');
  const profileA = duel.participantProfiles?.[uidA];
  const profileB = duel.participantProfiles?.[uidB];
  const { currentWeek, completedWeeks } = deriveWeeklyDuelHistory(workouts, duel, new Date());
  const season = seasonTotals(completedWeeks);

  return (
    <Layout active="duelo">
      <div className="space-y-7 pb-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="font-label-md text-xs uppercase tracking-[0.2em] text-primary-fixed-dim">Siempre juntos</p>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Duelo semanal</h1>
          </div>
          <span className="pb-1 text-xs text-on-surface-variant">{weekRange(currentWeek)}</span>
        </header>

        <Card className="relative overflow-hidden border border-outline-variant/10 p-5 sm:p-7">
          <div aria-hidden="true" className="duel-primary-aura absolute inset-y-0 left-0 w-1/2" />
          <div aria-hidden="true" className="duel-secondary-aura absolute inset-y-0 right-0 w-1/2" />

          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 flex-col items-center text-center">
              <Avatar name={nameA} src={profileA?.avatarUrl} size="h-20 w-20 sm:h-24 sm:w-24" className="primary-glow" />
              <p className="mt-3 max-w-full truncate font-bold">{nameA}</p>
              <p className="font-stats-num text-2xl text-primary-fixed-dim">{currentWeek.participantA.activeDays}</p>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">días activos</span>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-high font-stats-num text-xs italic text-primary-fixed-dim">VS</div>

            <div className="flex min-w-0 flex-col items-center text-center">
              <Avatar name={nameB} src={profileB?.avatarUrl} size="h-20 w-20 sm:h-24 sm:w-24" className="secondary-glow" />
              <p className="mt-3 max-w-full truncate font-bold">{nameB}</p>
              <p className="font-stats-num text-2xl text-secondary-fixed-dim">{currentWeek.participantB.activeDays}</p>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">días activos</span>
            </div>
          </div>

          <div className="relative mt-7 border-t border-outline-variant/10 pt-6">
            <h2 className="mb-5 text-center font-headline-lg-mobile text-xl">{leadMessage(currentWeek, nameA, nameB)}</h2>
            <DuelWeekTrack
              participantA={currentWeek.participantA}
              participantB={currentWeek.participantB}
              nameA={nameA}
              nameB={nameB}
              weekStartKey={currentWeek.startKey}
            />
          </div>
        </Card>

        <Card className="px-5 py-2">
          <MetricRow label="Días activos" valueA={currentWeek.participantA.activeDays} valueB={currentWeek.participantB.activeDays} />
          <MetricRow testId="metric-workouts" label="Entrenamientos" valueA={currentWeek.participantA.workoutCount} valueB={currentWeek.participantB.workoutCount} />
          <MetricRow testId="metric-minutes" label="Minutos" valueA={currentWeek.participantA.totalMinutes} valueB={currentWeek.participantB.totalMinutes} />
          <MetricRow label="Racha actual" valueA={`${currentWeek.participantA.streak} d`} valueB={`${currentWeek.participantB.streak} d`} />
        </Card>

        <Card className="space-y-3">
          <details>
            <summary className="cursor-pointer font-bold text-primary-fixed-dim">¿Cómo se decide el duelo?</summary>
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <p>La semana la gana quien acumula más días activos. Un día cuenta cuando existe al menos un entrenamiento válido registrado dentro de la semana del duelo.</p>
              <p>Entrenamientos, minutos y racha se muestran para dar contexto al esfuerzo; no sustituyen el criterio principal de días activos.</p>
              <p>Si ambos terminan con los mismos días activos, la semana queda empatada.</p>
            </div>
          </details>
        </Card>

        <Card data-testid="season-score" className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">Marcador de temporada</p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <p className="truncate text-sm font-bold text-primary-fixed-dim">{nameA}</p>
            <p className="font-stats-num text-3xl">{season.winsA} - {season.winsB}</p>
            <p className="truncate text-sm font-bold text-secondary-fixed-dim">{nameB}</p>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">{season.ties} {season.ties === 1 ? 'semana empatada' : 'semanas empatadas'}</p>
        </Card>

        <section aria-labelledby="duel-history-heading" className="space-y-4">
          <div>
            <h2 id="duel-history-heading" className="font-headline-lg-mobile text-xl">Historial de semanas</h2>
            <p className="text-sm text-on-surface-variant">Resultados más recientes primero.</p>
          </div>

          {completedWeeks.length === 0 ? (
            <Card><p className="text-sm text-on-surface-variant">Aún no hay semanas finalizadas.</p></Card>
          ) : (
            <ol className="space-y-3">
              {completedWeeks.map((week) => (
                <li key={week.weekId}>
                  <Card data-testid="week-row" data-week-id={week.weekId} aria-label={`Semana del ${week.startKey} al ${week.endKey}`} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-xs text-on-surface-variant">{weekRange(week)}</p>
                      <p className="mt-1 text-sm font-bold">{nameA} {week.participantA.activeDays} · {week.participantB.activeDays} {nameB}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${week.result === 'tied' ? 'bg-surface-container-highest text-on-surface' : 'bg-primary/15 text-primary-fixed-dim'}`}>
                      {resultLabel(week, nameA, nameB)}
                    </span>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default Duelo;
