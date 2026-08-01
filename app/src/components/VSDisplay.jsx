import Avatar from './Avatar';

// participant shape: { name: string, initial?: string, avatarUrl?: string, score?: number, status?: string }
// `initial` defaults to the first letter of `name` when omitted. `status`
// (e.g. "Pendiente" / "Completado") and `score` are both optional so this
// works before and after a workout is scored.
function Participant({ participant, borderClass }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <div className="relative mb-2">
        <Avatar name={participant.name} src={participant.avatarUrl} size="w-20 h-20" className={`border-2 ${borderClass}`} />
        {participant.status && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-extrabold border border-outline-variant/30">
            {participant.status}
          </div>
        )}
      </div>
      <span className="font-label-md text-on-surface">{participant.name}</span>
      {typeof participant.score === 'number' && (
        <span className="font-stats-num text-lg text-primary-fixed-dim">{participant.score}</span>
      )}
    </div>
  );
}

/**
 * Side-by-side two-participant comparison with a "VS" divider, matching the
 * mockup's competitor-vs-competitor layout in duofit_dashboard_inicio/code.html.
 */
function VSDisplay({ participantA, participantB }) {
  return (
    <section className="relative py-4">
      <div className="flex justify-between items-center gap-4 relative z-10">
        <Participant participant={participantA} borderClass="border-primary" />
        <div className="flex flex-col items-center">
          <div className="w-px h-12 bg-outline-variant/30" />
          <div className="bg-surface-container-highest px-3 py-1 rounded-full border border-outline-variant/50 my-2">
            <span className="font-stats-num text-sm text-primary-fixed-dim italic">VS</span>
          </div>
          <div className="w-px h-12 bg-outline-variant/30" />
        </div>
        <Participant participant={participantB} borderClass="border-secondary" />
      </div>
    </section>
  );
}

export default VSDisplay;
