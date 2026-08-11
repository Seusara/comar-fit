import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { app, db } from './config';

const DEVICE_ID_KEY = 'comar-fit:push-device-id';
// Public Web Push credential. It is intentionally safe to ship to browsers;
// VITE_FIREBASE_VAPID_KEY can still override it per environment.
const DEFAULT_VAPID_KEY = 'BP1PrS4Tp2qyomhnEpW8YPwWtmjghnmL3UphsXvvHytkOQRkzI3XhHRoewSTb1-A_J6xKjXsYNyVFLhQU6TxFGw';

async function tokenId(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function messagingInstance() {
  if (!await isSupported()) throw new Error('PUSH_UNSUPPORTED');
  return getMessaging(app);
}

export async function registerPushDevice(uid) {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY;
  if (!vapidKey) throw new Error('VAPID_KEY_MISSING');
  const registration = await navigator.serviceWorker.register('/comar-fit-sw.js');
  const messaging = await messagingInstance();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('PUSH_TOKEN_MISSING');
  const id = await tokenId(token);
  await setDoc(doc(db, 'users', uid, 'notificationDevices', id), {
    uid,
    token,
    enabled: true,
    platform: navigator.userAgent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export async function unregisterPushDevice(uid) {
  const id = localStorage.getItem(DEVICE_ID_KEY);
  if (id) await deleteDoc(doc(db, 'users', uid, 'notificationDevices', id));
  try {
    const messaging = await messagingInstance();
    await deleteToken(messaging);
  } catch { /* The local subscription may not exist. */ }
  localStorage.removeItem(DEVICE_ID_KEY);
}

export async function listenForForegroundMessages(handler) {
  const messaging = await messagingInstance();
  return onMessage(messaging, handler);
}
