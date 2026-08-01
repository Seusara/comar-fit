/**
 * Streak chip with a flame icon, matching the mockup's fire-badge pattern.
 * Uses the Material Symbols Outlined font already loaded globally in
 * index.html (same approach as the rest of the app), consistent with the
 * `local_fire_department` icon used in duofit_dashboard_inicio/code.html.
 */
function StreakBadge({ streak = 0 }) {
  const dayLabel = streak === 1 ? 'día' : 'días';

  return (
    <div className="flex items-center gap-2 bg-surface-container-high rounded-full px-4 py-2 border border-outline-variant/20">
      <span
        className="material-symbols-outlined text-error"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        local_fire_department
      </span>
      <span className="font-stats-num text-[18px] text-on-surface">
        {streak} {dayLabel}
      </span>
    </div>
  );
}

export default StreakBadge;
