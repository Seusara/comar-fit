import { getMessaging } from 'firebase-admin/messaging';
import { DateTime } from 'luxon';

const TIME_ZONE = 'America/Mexico_City';

export async function sendWorkoutReminders({ db, now = DateTime.now().setZone(TIME_ZONE), messaging = getMessaging() }) {
  const users = await db.collection('users').where('notificationsEnabled', '==', true).get();
  let sent = 0;
  for (const user of users.docs) {
    const profile = user.data();
    if (!profile.usualWorkoutTime) continue;
    const scheduled = DateTime.fromFormat(profile.usualWorkoutTime, 'HH:mm', { zone: TIME_ZONE });
    const currentMinutes = now.hour * 60 + now.minute;
    const scheduledMinutes = scheduled.hour * 60 + scheduled.minute;
    if (currentMinutes < scheduledMinutes || currentMinutes - scheduledMinutes >= 5) continue;

    const dateKey = now.toISODate();
    const devices = await user.ref.collection('notificationDevices').where('enabled', '==', true).get();
    for (const device of devices.docs) {
      const data = device.data();
      if (!data.token || data.lastReminderDate === dateKey) continue;
      try {
        await messaging.send({
          token: data.token,
          notification: {
            title: 'Hora de entrenar',
            body: 'Tu entrenamiento de hoy te está esperando. Entra para mantener tu progreso.',
          },
          data: { url: '/rutina' },
          webpush: { fcmOptions: { link: '/rutina' } },
        });
        await device.ref.set({ lastReminderDate: dateKey, lastReminderAt: new Date() }, { merge: true });
        sent += 1;
      } catch (error) {
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error?.code)) {
          await device.ref.delete();
        }
      }
    }
  }
  return sent;
}
