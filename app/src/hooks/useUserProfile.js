import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserDocument } from '../firebase/firestore';

export function useUserProfile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(currentUser?.uid));
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    getUserDocument(currentUser.uid)
      .then((value) => {
        if (!active) return;
        setProfile(value);
        setError(null);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [currentUser?.uid, refreshToken]);

  return { profile, loading, error, refresh };
}
