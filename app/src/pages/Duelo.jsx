import Layout from '../components/Layout';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import VSDisplay from '../components/VSDisplay';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useDuelWorkouts } from '../hooks/useDuelWorkouts';
import { deriveWeeklyDuelHistory } from '../duel/weeklyHistory';

function participantName(duel, uid, fallback) {
  return duel?.participantNames?.[uid] || fallback;
}

export function resultLabel(week, nameA, nameB) {
  if (week.result === 'tied') return 'Empate';
  return `Ganó ${week.result === 'participantA' ? nameA : nameB}`;
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
        <p role="status" className="text-on-surface-variant text-center p-8">Cargando duelo...</p>
      </Layout>
    );
  }

  if (duelError || workoutsError || !duel) {
    return (
      <Layout active="duelo">
        <p role="alert" className="text-error text-center p-8">No pudimos cargar el duelo.</p>
      </Layout>
    );
  }

  const uidA = duel.userA_uid;
  const uidB = duel.userB_uid;
  const nameA = participantName(duel, uidA, 'Jugador 1');
  const nameB = participantName(duel, uidB, 'Jugador 2');
  const { currentWeek, completedWeeks } = deriveWeeklyDuelHistory(workouts, duel, new Date());

  return (
    <Layout active="duelo">
      <div className="space-y-8">
        <header>
          <p className="font-label-md text-primary-fixed-dim uppercase tracking-widest text-xs">
            Siempre juntos
          </p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Duelo semanal</h1>
          <p className="text-on-surface-variant text-sm mt-2">
            Una semana nueva empieza cada lunes. El historial anterior se conserva.
          </p>
        </header>

        <Card className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-label-md uppercase tracking-widest text-xs">Semana actual</h2>
            <span className="text-on-surface-variant text-xs">
              {currentWeek.startKey} – {currentWeek.endKey}
            </span>
          </div>
          <VSDisplay
            participantA={{ name: nameA, status: `${currentWeek.participantA.activeDays}/7 días` }}
            participantB={{ name: nameB, status: `${currentWeek.participantB.activeDays}/7 días` }}
          />
          <div className="flex justify-around items-center gap-4">
            <ProgressRing
              percentage={currentWeek.participantA.percentage}
              label={`Días activos de ${nameA} esta semana`}
            />
            <ProgressRing
              percentage={currentWeek.participantB.percentage}
              label={`Días activos de ${nameB} esta semana`}
            />
          </div>
        </Card>

        <section aria-labelledby="duel-history-heading" className="space-y-4">
          <div>
            <h2 id="duel-history-heading" className="font-headline-lg-mobile text-xl">
              Historial de semanas
            </h2>
            <p className="text-on-surface-variant text-sm">Resultados más recientes primero.</p>
          </div>

          {completedWeeks.length === 0 ? (
            <Card>
              <p className="text-on-surface-variant text-sm">Aún no hay semanas finalizadas.</p>
            </Card>
          ) : (
            <ol className="space-y-4">
              {completedWeeks.map((week) => (
                <li key={week.weekId}>
                  <Card
                    data-testid="week-row"
                    data-week-id={week.weekId}
                    aria-label={`Semana del ${week.startKey} al ${week.endKey}`}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-on-surface-variant text-xs">
                        {week.startKey} – {week.endKey}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        week.result === 'tied'
                          ? 'bg-surface-container-highest text-on-surface'
                          : 'bg-primary/15 text-primary-fixed-dim'
                      }`}>
                        {resultLabel(week, nameA, nameB)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="font-bold text-sm">{nameA}</p>
                        <p className="font-stats-num text-primary-fixed-dim text-xl">
                          {week.participantA.activeDays}/7
                        </p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low p-3 text-right">
                        <p className="font-bold text-sm">{nameB}</p>
                        <p className="font-stats-num text-primary-fixed-dim text-xl">
                          {week.participantB.activeDays}/7
                        </p>
                      </div>
                    </div>
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
