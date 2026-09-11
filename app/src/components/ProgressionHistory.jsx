/**
 * ProgressionHistory
 *
 * Renders a compact timeline of accepted progression adjustments,
 * newest first. Designed to live in Perfil under "Tu rendimiento".
 *
 * Props:
 *   entries  — array from getProgressionHistory (empty = nothing to show)
 *   loading  — bool
 */

function weekLabel(weekId) {
  // "2026-W32" → "Semana 32 · 2026"
  if (!weekId) return weekId;
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return weekId;
  return `Semana ${match[2]} · ${match[1]}`;
}

function ActionChip({ action, count }) {
  if (count === 0) return null;
  const isIncrease = action === 'increase';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
        isIncrease
          ? 'bg-primary-fixed-dim/15 text-primary-fixed-dim'
          : 'bg-error/10 text-error'
      }`}
    >
      {isIncrease ? '↑' : '↓'} {count}
    </span>
  );
}

function ProgressionHistory({ entries = [], loading = false }) {
  if (loading) {
    return (
      <p className="text-xs text-on-surface-variant" role="status">
        Cargando historial…
      </p>
    );
  }

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="progression-history-heading" className="space-y-3">
      <h3
        id="progression-history-heading"
        className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
      >
        Historial de ajustes
      </h3>

      <ol className="space-y-2" aria-label="Ajustes de progresión aceptados">
        {entries.map((entry) => {
          const { increases = 0, reduces = 0, exercisesChanged = [] } = entry.summary ?? {};
          const acceptedDate = entry.acceptedAt?.toDate?.()
            ? entry.acceptedAt.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
            : null;

          return (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-surface-container-low border border-outline-variant/10 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface">{weekLabel(entry.weekId)}</p>
                {exercisesChanged.length > 0 && (
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {exercisesChanged.join(', ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <ActionChip action="increase" count={increases} />
                <ActionChip action="reduce" count={reduces} />
                {acceptedDate && (
                  <span className="text-xs text-on-surface-variant">{acceptedDate}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default ProgressionHistory;
