import { useEffect, useState } from 'react';
import { subscribeToDuelWeek } from '../firebase/workouts';

export function currentWeekId(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const local = new Date(`${value.year}-${value.month}-${value.day}T12:00:00Z`);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - daysSinceMonday);
  return local.toISOString().slice(0, 10);
}

export function useDuelScore(duelId) {
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(Boolean(duelId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!duelId) { setWeekData(null); setLoading(false); return undefined; }
    setLoading(true);
    return subscribeToDuelWeek(
      duelId,
      currentWeekId(),
      (data) => { setWeekData(data); setError(null); setLoading(false); },
      (reason) => { setError(reason); setLoading(false); },
    );
  }, [duelId]);

  return { weekData, loading, error };
}
