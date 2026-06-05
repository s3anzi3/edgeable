// Repair an orphaned account in place: write the missing users/{uid} profile
// doc onto an existing Firebase Auth account so the person becomes a complete,
// usable (inactive) subscriber. Their original password keeps working; if they
// forgot it they can use "Forgot password" on the site.
//
// Only the profile doc is written here. We don't have their Telegram/phone
// (that data never saved), so the account is email-only — they log in by email
// and can add Telegram/phone later. displayName defaults to the email prefix
// and is editable from the admin UI afterward.
//
// USAGE:
//   node scripts/repair-orphan.js <email> ["Display Name"]
//
// SETUP: needs service-account.json in the project root.

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
initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))) });

const auth = getAuth();
const db = getFirestore();

const emailArg = process.argv[2];
const displayNameArg = process.argv[3];

async function main() {
  if (!emailArg) {
    console.error('Usage: node scripts/repair-orphan.js <email> ["Display Name"]');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();

  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
  } catch {
    console.error(`No Firebase Auth account found for ${email}. Nothing to repair.`);
    process.exit(1);
  }
  const uid = authUser.uid;

  const userRef = db.collection('users').doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    console.log(`Profile already exists for ${email} (uid=${uid}) — not an orphan. No change.`);
    return;
  }

  const displayName = (displayNameArg && displayNameArg.trim()) || email.split('@')[0];

  await userRef.set({
    displayName,
    email,
    authEmail: email,
    telegramUsername: '',
    phone: '',
    role: 'user',
    status: 'inactive',
    createdAt: Timestamp.now(),
  });

  console.log(`✓ Repaired ${email}`);
  console.log(`    uid:         ${uid}`);
  console.log(`    displayName: ${displayName}`);
  console.log(`    status:      inactive`);
  console.log('    They can now log in by email with their original password (or reset it).');
}

main().catch((e) => {
  console.error('\nFAILED:', e);
  process.exit(1);
});
