import { useEffect, useRef, useState } from 'react';

export default function NetworkStatus() {
  const [status, setStatus] = useState(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : null
  );
  const wasOffline = useRef(status === 'offline');

  useEffect(() => {
    let hideTimer;
    const handleOffline = () => {
      clearTimeout(hideTimer);
      wasOffline.current = true;
      setStatus('offline');
    };
    const handleOnline = () => {
      if (!wasOffline.current) return;
      wasOffline.current = false;
      setStatus('restored');
      hideTimer = setTimeout(() => setStatus(null), 2500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!status) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[300] px-4 py-2 text-center text-sm font-semibold text-white shadow-lg ${
        status === 'offline' ? 'bg-error' : 'bg-success'
      }`}
    >
      {status === 'offline'
        ? 'Sin conexión. Algunas acciones estarán disponibles cuando te reconectes.'
        : 'Conexión restablecida.'}
    </div>
  );
}
