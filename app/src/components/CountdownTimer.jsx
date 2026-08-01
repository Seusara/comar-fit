import { useEffect, useState } from 'react';

function getRemaining(targetTime) {
  const diffMs = Math.max(0, new Date(targetTime).getTime() - Date.now());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { totalSeconds, hours, minutes };
}

/**
 * Displays remaining time until `targetTime` (a Date, ISO string, or epoch
 * ms — the boundary of "today" in the duel's timezone, computed by the
 * caller so this component stays testable/reusable rather than hardcoding
 * "midnight" logic).
 */
function CountdownTimer({ targetTime, label = 'Tiempo restante hoy' }) {
  const [remaining, setRemaining] = useState(() => getRemaining(targetTime));

  useEffect(() => {
    setRemaining(getRemaining(targetTime));
    const intervalId = setInterval(() => {
      setRemaining(getRemaining(targetTime));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetTime]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 text-error">
        <span className="material-symbols-outlined" aria-hidden="true">
          timer
        </span>
        <span className="font-stats-num text-display-md">
          {remaining.hours}h {remaining.minutes}m
        </span>
      </div>
      <p className="text-on-surface-variant font-label-md text-xs uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

export default CountdownTimer;
