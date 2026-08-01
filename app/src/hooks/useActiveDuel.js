import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { findActiveDuelForUser } from '../firebase/firestore';

export function useActiveDuel() {
  const { currentUser } = useAuth();
  const [duel, setDuel] = useState(null);
  const [loading, setLoading] = useState(Boolean(currentUser?.uid));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) { setDuel(null); setLoading(false); return undefined; }
    let active = true;
    setLoading(true);
    findActiveDuelForUser(currentUser.uid)
      .then((value) => { if (active) { setDuel(value); setError(null); } })
      .catch((reason) => { if (active) setError(reason); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.uid]);

  return { duel, loading, error };
}
