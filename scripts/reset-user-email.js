// Change a user's email (admin fallback).
// Updates the Firebase Auth account email, the users doc, and the Telegram/phone
// lookup docs so login by every identifier keeps resolving correctly.
//
// USAGE:
//   node scripts/reset-user-email.js <identifier> <new-email>
//
//   <identifier> can be the user's current email, Telegram username (@ optional), or phone.
//
// SETUP:  Needs service-account.json in the project root.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), 'service-account.json');
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Missing service-account.json at ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const SYNTHETIC_DOMAIN = 'edgeable.local';

async function resolveUid(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
    try { return (await auth.getUserByEmail(id.toLowerCase())).uid; } catch {}
  }
  const digits = id.replace(/\D+/g, '');
  if (/^\+?[\d\s\-().]{7,}$/.test(id) && digits.length >= 7) {
    const snap = await db.doc(`phones/${digits}`).get();
    if (snap.exists) return snap.data().uid;
  }
  const uname = id.replace(/^@+/, '').toLowerCase();
  const unameSnap = await db.doc(`usernames/${uname}`).get();
  if (unameSnap.exists) return unameSnap.data().uid;
  for (const e of [`tg_${uname}@${SYNTHETIC_DOMAIN}`, `ph_${digits}@${SYNTHETIC_DOMAIN}`]) {
    try { return (await auth.getUserByEmail(e)).uid; } catch {}
  }
  return null;
}

async function main() {
  const identifier = process.argv[2];
  const newEmailRaw = process.argv[3];
  if (!identifier || !newEmailRaw) {
    console.error('Usage: node scripts/reset-user-email.js <email|username|phone> <new-email>');
    process.exit(1);
  }
  const newEmail = newEmailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    console.error('That is not a valid email address.');
    process.exit(1);
  }

  const uid = await resolveUid(identifier);
  if (!uid) {
    console.error(`\nNo account found for "${identifier}".`);
    process.exit(1);
  }

  // Update the Firebase Auth account email (this is what reset emails go to).
  try {
    await auth.updateUser(uid, { email: newEmail, emailVerified: false });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      console.error('\nThat email is already in use by another account.');
      process.exit(1);
    }
    throw e;
  }

  // Keep Firestore in sync: users doc + lookup docs (so telegram/phone login still works).
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};

  await userRef.set({ email: newEmail, authEmail: newEmail }, { merge: true });

  if (userData.telegramUsername) {
    await db.doc(`usernames/${userData.telegramUsername}`).set({ uid, authEmail: newEmail }, { merge: true });
  }
  if (userData.phone) {
    await db.doc(`phones/${userData.phone}`).set({ uid, authEmail: newEmail }, { merge: true });
  }

  console.log('\n────────────────────────────────────────');
  console.log('Email updated successfully.');
  console.log(`User:       ${userData.displayName || identifier}`);
  console.log(`New email:  ${newEmail}`);
  console.log('');
  console.log('Login by email / Telegram / phone all now resolve to this address,');
  console.log('and password-reset emails will be sent here.');
  console.log('────────────────────────────────────────\n');
}

main().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
