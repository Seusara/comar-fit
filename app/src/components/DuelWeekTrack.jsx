const DAYS = [
  { short: 'Lun', long: 'lunes' },
  { short: 'Mar', long: 'martes' },
  { short: 'Mié', long: 'miércoles' },
  { short: 'Jue', long: 'jueves' },
  { short: 'Vie', long: 'viernes' },
  { short: 'Sáb', long: 'sábado' },
  { short: 'Dom', long: 'domingo' },
];

function shiftKey(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

function Lane({ name, activeKeys, weekStartKey, accent }) {
  const active = new Set(activeKeys ?? []);
  const activeClass = accent === 'cyan'
    ? 'bg-primary-fixed-dim text-on-primary shadow-[0_0_14px_rgba(0,219,233,0.3)]'
    : 'bg-secondary-container text-on-secondary-container shadow-[0_0_14px_rgba(173,0,254,0.3)]';

  return (
    <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] items-center gap-1.5">
      <p className="truncate pr-1 text-xs font-bold" title={name}>{name}</p>
      {DAYS.map((day, index) => {
        const dayKey = shiftKey(weekStartKey, index);
        const isActive = active.has(dayKey);
        return (
          <span
            key={dayKey}
            role="img"
            aria-label={`${name}, ${day.long}: ${isActive ? 'activo' : 'inactivo'}`}
            className={`flex aspect-square min-h-7 items-center justify-center rounded-lg border text-[10px] font-bold transition-colors ${
              isActive
                ? activeClass
                : 'border-outline-variant/20 bg-surface-container-lowest text-outline/60'
            }`}
          >
            {isActive ? '✓' : '·'}
          </span>
        );
      })}
    </div>
  );
}

function DuelWeekTrack({ participantA, participantB, nameA, nameB, weekStartKey }) {
  return (
    <section aria-label="Actividad de lunes a domingo" className="space-y-2.5">
      <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
        <span aria-hidden="true" />
        {DAYS.map((day) => (
          <span key={day.short} className="text-center text-[10px] font-semibold uppercase text-on-surface-variant">
            {day.short}
          </span>
        ))}
      </div>
      <Lane name={nameA} activeKeys={participantA?.dayKeys} weekStartKey={weekStartKey} accent="cyan" />
      <Lane name={nameB} activeKeys={participantB?.dayKeys} weekStartKey={weekStartKey} accent="purple" />
    </section>
  );
}

export default DuelWeekTrack;
