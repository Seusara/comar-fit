import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { auth } from './config';

export function registerUser(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}

export function changeCurrentPassword(newPassword) {
  if (!auth.currentUser) return Promise.reject(new Error('AUTH_USER_REQUIRED'));
  return updatePassword(auth.currentUser, newPassword);
}
