export const NOTIFICATION_SETTINGS_KEY = 'comar-fit:notification-settings';
export const NOTIFICATION_SETTINGS_EVENT = 'comar-fit:notification-settings-change';

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function saveNotificationSettings(settings) {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT));
  } catch { /* Firestore remains the source of profile preferences. */ }
}

export function readNotificationSettings() {
  try { return JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY)) ?? {}; }
  catch { return {}; }
}

function millisecondsUntil(time) {
  const [hours, minutes] = String(time || '19:00').split(':').map(Number);
  const target = new Date();
  target.setHours(Number.isFinite(hours) ? hours : 19, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);
  return target.getTime() - Date.now();
}

async function showWorkoutReminder() {
  const options = {
    body: 'Tu entrenamiento de hoy te está esperando. Entra para mantener tu progreso.',
    icon: '/comar-fit-app-icon.png',
    badge: '/comar-fit-favicon.png',
    tag: 'comar-fit-daily-workout',
    data: { url: '/rutina' },
  };
  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) return registration.showNotification('Hora de entrenar', options);
  return new Notification('Hora de entrenar', options);
}

export function startNotificationReminders() {
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    const settings = readNotificationSettings();
    if (!settings.enabled || !notificationsSupported() || Notification.permission !== 'granted') return;
    timer = setTimeout(async () => {
      await showWorkoutReminder();
      schedule();
    }, millisecondsUntil(settings.time));
  };
  window.addEventListener(NOTIFICATION_SETTINGS_EVENT, schedule);
  schedule();
  return () => {
    clearTimeout(timer);
    window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, schedule);
  };
}
