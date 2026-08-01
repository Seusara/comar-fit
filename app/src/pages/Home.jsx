import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { findActiveDuelForUser } from '../firebase/firestore';

function Home() {
  const { currentUser } = useAuth();
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    findActiveDuelForUser(currentUser.uid)
      .then((duel) => setDestination(duel ? '/dashboard' : '/connect-partner'))
      // Falling back to /connect-partner is the safe default: worst case a
      // user with an existing duel re-lands here and retries, which is not
      // data-corrupting, versus being stuck on "Cargando..." indefinitely.
      .catch(() => setDestination('/connect-partner'));
  }, [currentUser.uid]);

  if (!destination) {
    return <p className="text-on-surface p-8">Cargando...</p>;
  }

  return <Navigate to={destination} replace />;
}

export default Home;
