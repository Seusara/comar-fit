import { useEffect, useState } from 'react';
import { subscribeToDuelWorkouts } from '../firebase/workouts';

export function useDuelWorkouts(duelId) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(Boolean(duelId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!duelId) {
      setWorkouts([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    return subscribeToDuelWorkouts(
      duelId,
      (data) => {
        setWorkouts(data);
        setError(null);
        setLoading(false);
      },
      (reason) => {
        setError(reason);
        setLoading(false);
      },
    );
  }, [duelId]);

  return { workouts, loading, error };
}
