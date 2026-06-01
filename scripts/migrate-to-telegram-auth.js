// One-shot migration: wipe everyone but the admin and switch the admin to
// Telegram-username-based login.
//
// What this does:
//   1. Finds the single admin user (role === 'admin')
//   2. Deletes ALL other Firebase Auth users
//   3. Deletes ALL non-admin Firestore user docs
//   4. Deletes ALL transactions
//   5. Deletes ALL proof-of-payment images from Storage
//   6. Wipes lookup collections (usernames, phones)
//   7. Updates admin's Auth email to the synthetic format and adds
//      telegramUsername="edgeable_administration" on the Firestore doc
//   8. Creates the lookup doc usernames/edgeable_administration
//   9. Sets the initial sign-up PIN to "1234"
//
// AFTER RUNNING:
//   You will be logged out everywhere. Sign back in with:
//     username: edgeable_administration
//     password: (your existing admin password — unchanged)
//
// SETUP:
//   Needs service-account.json in the project root (already gitignored).
//
// USAGE:
//   From C:\Users\panky\Desktop\edgeable run:
//     node scripts/migrate-to-telegram-auth.js

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), 'service-account.json');
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Missing service-account.json at ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

const STORAGE_BUCKET = 'edgeabled.firebasestorage.app';

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: STORAGE_BUCKET,
});

const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

const NEW_ADMIN_USERNAME = 'edgeable_administration';
const SYNTHETIC_DOMAIN = 'edgeable.local';
const NEW_ADMIN_AUTH_EMAIL = `tg_${NEW_ADMIN_USERNAME}@${SYNTHETIC_DOMAIN}`;
const INITIAL_SIGNUP_PIN = '1234';

async function findAdmin() {
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  if (snap.empty) throw new Error('No admin user found in Firestore. Aborting.');
  if (snap.size > 1) throw new Error(`${snap.size} admin users found. Aborting for safety.`);
  return { uid: snap.docs[0].id, data: snap.docs[0].data() };
}

async function deleteAllNonAdminAuthUsers(adminUid) {
  let pageToken;
  let totalDeleted = 0;
  do {
    const result = await auth.listUsers(1000, pageToken);
    const toDelete = result.users.filter((u) => u.uid !== adminUid).map((u) => u.uid);
    if (toDelete.length > 0) {
      const r = await auth.deleteUsers(toDelete);
      totalDeleted += r.successCount;
      if (r.failureCount > 0) {
        console.error(`  ${r.failureCount} auth deletes failed:`, r.errors);
      }
    }
    pageToken = result.pageToken;
  } while (pageToken);
  return totalDeleted;
}

async function deleteAllDocs(collectionName, exceptId = null) {
  const snap = await db.collection(collectionName).get();
  let count = 0;
  for (const d of snap.docs) {
    if (exceptId && d.id === exceptId) continue;
    await d.ref.delete();
    count++;
  }
  return count;
}

async function deleteAllProofImages() {
  const [files] = await bucket.getFiles({ prefix: 'transaction-proofs/' });
  for (const f of files) await f.delete();
  return files.length;
}

async function updateAdmin(adminUid) {
  await auth.updateUser(adminUid, { email: NEW_ADMIN_AUTH_EMAIL });
  await db.collection('users').doc(adminUid).update({
    telegramUsername: NEW_ADMIN_USERNAME,
    email: FieldValue.delete(),
  });
  await db.collection('usernames').doc(NEW_ADMIN_USERNAME).set({
    uid: adminUid,
    authEmail: NEW_ADMIN_AUTH_EMAIL,
  });
}

async function setInitialSignupPin() {
  await db.collection('config').doc('signupPin').set({
    pin: INITIAL_SIGNUP_PIN,
    rotatedAt: Timestamp.fromDate(new Date()),
  });
}

async function main() {
  console.log('Finding admin user...');
  const { uid: adminUid, data: adminData } = await findAdmin();
  console.log(`  Admin: ${adminData.displayName || adminData.email || adminUid}`);

  console.log('\nWiping non-admin Firebase Auth users...');
  const authDeleted = await deleteAllNonAdminAuthUsers(adminUid);
  console.log(`  Deleted ${authDeleted} auth users.`);

  console.log('\nWiping non-admin Firestore user docs...');
  const userDocDeleted = await deleteAllDocs('users', adminUid);
  console.log(`  Deleted ${userDocDeleted} user docs.`);

  console.log('\nWiping all transactions...');
  const txnDeleted = await deleteAllDocs('transactions');
  console.log(`  Deleted ${txnDeleted} transactions.`);

  console.log('\nWiping all proof-of-payment images from Storage...');
  const imgDeleted = await deleteAllProofImages();
  console.log(`  Deleted ${imgDeleted} images.`);

  console.log('\nClearing lookup collections (usernames, phones)...');
  await deleteAllDocs('usernames');
  await deleteAllDocs('phones');

  console.log('\nUpdating admin auth email + Firestore doc...');
  await updateAdmin(adminUid);
  console.log(`  Admin auth email: ${NEW_ADMIN_AUTH_EMAIL}`);
  console.log(`  Admin telegramUsername: ${NEW_ADMIN_USERNAME}`);

  console.log('\nSetting initial sign-up PIN...');
  await setInitialSignupPin();
  console.log(`  Sign-up PIN: ${INITIAL_SIGNUP_PIN}`);

  console.log('\n────────────────────────────────────────');
  console.log('Migration complete.');
  console.log('Sign in with:');
  console.log(`  username:  ${NEW_ADMIN_USERNAME}`);
  console.log(`  password:  (your existing admin password)`);
  console.log('────────────────────────────────────────');
}

main().catch((e) => {
  console.error('\nMIGRATION FAILED:', e);
  process.exit(1);
});
