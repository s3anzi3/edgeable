// Reset a user's password (admin fallback).
// Generates a new random password (or accepts one as the second argument)
// and updates the user's Firebase Auth account.
//
// USAGE:
//   node scripts/reset-user-password.js <identifier>
//   node scripts/reset-user-password.js <identifier> <new-password>
//
//   <identifier> can be the user's email, Telegram username (@ optional), or phone.
//
// SETUP:  Needs service-account.json in the project root.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function generatePassword(length = 8) {
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length));
  }
  return pwd;
}

// Resolve a user UID from an email, Telegram username, or phone.
export async function resolveUid(identifier) {
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

  // Legacy synthetic-email fallback
  for (const e of [`tg_${uname}@${SYNTHETIC_DOMAIN}`, `ph_${digits}@${SYNTHETIC_DOMAIN}`]) {
    try { return (await auth.getUserByEmail(e)).uid; } catch {}
  }
  return null;
}

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Usage: node scripts/reset-user-password.js <email|username|phone> [new-password]');
    process.exit(1);
  }
  const customPassword = process.argv[3];
  const newPassword = customPassword || generatePassword(8);
  if (newPassword.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const uid = await resolveUid(identifier);
  if (!uid) {
    console.error(`\nNo account found for "${identifier}".`);
    process.exit(1);
  }

  const userSnap = await db.collection('users').doc(uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const displayName = userData.displayName || '';

  await auth.updateUser(uid, { password: newPassword });

  let adminUid = '';
  let adminName = 'admin';
  try {
    const adminSnap = await db.collection('users').where('role', '==', 'admin').get();
    if (!adminSnap.empty) {
      adminUid = adminSnap.docs[0].id;
      adminName = adminSnap.docs[0].data().telegramUsername || 'admin';
    }
  } catch {}

  try {
    await db.collection('accountEvents').add({
      subscriberUid: uid,
      subscriberDisplayName: displayName || '',
      type: 'password_reset',
      performedBy: 'admin',
      performedByUid: adminUid,
      performedByName: adminName,
      details: { method: 'admin_script' },
      createdAt: Timestamp.fromDate(new Date()),
    });
  } catch (e) {
    console.warn('Note: failed to write audit event:', e.message);
  }

  console.log('\n────────────────────────────────────────');
  console.log('Password reset successfully.');
  console.log(`User:  ${displayName || identifier}`);
  console.log('');
  console.log(`New password:  ${newPassword}`);
  console.log('');
  console.log('Send this to the user. Tell them to change it from their dashboard after signing in.');
  console.log('────────────────────────────────────────\n');
}

main().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
