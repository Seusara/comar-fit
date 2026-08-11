import { useEffect } from 'react';
import { startNotificationReminders } from '../notifications/reminders';
import { listenForForegroundMessages } from '../firebase/pushNotifications';

export default function NotificationManager() {
  useEffect(() => startNotificationReminders(), []);
  useEffect(() => {
    let unsubscribe;
    listenForForegroundMessages((payload) => {
      const title = payload.notification?.title || 'Comar-Fit';
      const body = payload.notification?.body || 'Tienes una nueva actualización.';
      if (Notification.permission === 'granted') new Notification(title, { body, icon: '/comar-fit-app-icon.png' });
    }).then((stop) => { unsubscribe = stop; }).catch(() => {});
    return () => unsubscribe?.();
  }, []);
  return null;
}
