/**
 * Circular SVG progress indicator: background track + foreground arc using
 * stroke-dasharray/stroke-dashoffset, with centered percentage text.
 * Follows the pattern in duofit_dashboard_inicio/code.html.
 */
function ProgressRing({ percentage = 0, size = 96, strokeWidth = 10, label = 'Progreso' }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const roundedValue = Math.round(clamped);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuenow={roundedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          className="text-outline-variant/20"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle
          className="text-primary-fixed-dim"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-stats-num text-sm">{roundedValue}%</span>
      </div>
    </div>
  );
}

export default ProgressRing;
