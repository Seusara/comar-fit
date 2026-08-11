import { useEffect } from 'react';
import { startNotificationReminders } from '../notifications/reminders';

export default function NotificationManager() {
  useEffect(() => startNotificationReminders(), []);
  return null;
}
