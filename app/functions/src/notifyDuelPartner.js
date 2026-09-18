import { getMessaging } from 'firebase-admin/messaging';

/**
 * Notifies the other participant in a duel that `actingUserId` just logged
 * a workout. Fired once per new workout (not on edits) from recalculateDuelWeek.
 */
export async function notifyDuelPartner({ db, duel, actingUserId, messaging = getMessaging() }) {
  const partnerUid = [duel.userA_uid, duel.userB_uid].find((uid) => uid && uid !== actingUserId);
  if (!partnerUid) return 0;

  const partnerRef = db.doc(`users/${partnerUid}`);
  const partnerSnapshot = await partnerRef.get();
  if (!partnerSnapshot.exists || partnerSnapshot.data().notificationsEnabled !== true) return 0;

  const actingName = duel.scoringSnapshot?.users?.[actingUserId]?.displayName ?? 'Tu compañero';
  const devicesSnapshot = await partnerRef.collection('notificationDevices').where('enabled', '==', true).get();

  let sent = 0;
  for (const device of devicesSnapshot.docs) {
    const data = device.data();
    if (!data.token) continue;
    try {
      await messaging.send({
        token: data.token,
        notification: {
          title: `${actingName} completó su entrenamiento`,
          body: 'Es tu turno de responder en el duelo 💪',
        },
        data: { url: '/duelo' },
        webpush: { fcmOptions: { link: '/duelo' } },
      });
      sent += 1;
    } catch (error) {
      if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error?.code)) {
        await device.ref.delete();
      }
    }
  }
  return sent;
}
