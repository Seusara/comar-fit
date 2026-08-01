import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'comar-fit-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'comar-fit-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'comar-fit-dev.appspot.com',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const useEmulator = import.meta.env.DEV || import.meta.env.MODE === 'test';

if (useEmulator && !globalThis.__FIREBASE_EMULATOR_CONNECTED__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  globalThis.__FIREBASE_EMULATOR_CONNECTED__ = true;
}
