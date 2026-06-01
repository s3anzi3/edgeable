import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { generateRandomPin } from './auth.js';

const PIN_DOC_PATH = ['config', 'signupPin'];
const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

export async function getSignupPin() {
  const snap = await getDoc(doc(db, ...PIN_DOC_PATH));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    pin: data.pin,
    rotatedAt: data.rotatedAt?.toDate ? data.rotatedAt.toDate() : new Date(0),
  };
}

export async function rotateSignupPin() {
  const pin = generateRandomPin(4);
  await setDoc(doc(db, ...PIN_DOC_PATH), {
    pin,
    rotatedAt: Timestamp.fromDate(new Date()),
  });
  return { pin, rotatedAt: new Date() };
}

// Lazy auto-rotation: if the PIN is stale (>24h old), rotate it. Otherwise return
// the existing one. Called from the admin dashboard so the admin always sees
// today's PIN without manual intervention.
export async function getOrRotateSignupPin() {
  const current = await getSignupPin();
  if (!current) return rotateSignupPin();
  const age = Date.now() - current.rotatedAt.getTime();
  if (age > ROTATION_INTERVAL_MS) return rotateSignupPin();
  return current;
}
