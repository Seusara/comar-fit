import { useEffect, useState } from 'react';
import { subscribeToWorkouts } from '../firebase/workouts';

export function useWorkouts(duelId, userId) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(Boolean(duelId && userId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!duelId || !userId) {
      setWorkouts([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return subscribeToWorkouts(
      duelId,
      userId,
      (data) => { setWorkouts(data); setError(null); setLoading(false); },
      (reason) => { setError(reason); setLoading(false); },
    );
  }, [duelId, userId]);

  return { workouts, loading, error };
}
