// Diagnose admin login state and (optionally) reset the admin password.
//
// USAGE:
//   Just diagnose:
//     node scripts/admin-info.js
//
//   Diagnose AND reset password:
//     node scripts/admin-info.js <new-password>      (must be 6+ chars)
//
// SETUP:
//   Needs service-account.json in the project root.

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

const EXPECTED_AUTH_EMAIL = 'tg_edgeable_administration@edgeable.local';
const EXPECTED_USERNAME = 'edgeable_administration';

async function main() {
  const newPassword = process.argv[2];

  console.log('Looking up admin in Firestore...');
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  if (snap.empty) {
    console.error('  No user with role=admin found in Firestore.');
    process.exit(1);
  }
  if (snap.size > 1) {
    console.error(`  ${snap.size} admin users found — fix this manually.`);
    process.exit(1);
  }
  const adminDoc = snap.docs[0];
  const adminUid = adminDoc.id;
  const adminData = adminDoc.data();

  console.log(`  Found Firestore user doc: ${adminUid}`);
  console.log(`    displayName:       ${adminData.displayName || '(unset)'}`);
  console.log(`    telegramUsername:  ${adminData.telegramUsername || '(unset)'}`);
  console.log(`    role:              ${adminData.role}`);

  console.log('\nLooking up matching Firebase Auth user...');
  let authUser;
  try {
    authUser = await auth.getUser(adminUid);
  } catch (e) {
    console.error('  Auth user not found for that UID:', e.message);
    process.exit(1);
  }
  console.log(`  Auth UID:    ${authUser.uid}`);
  console.log(`  Auth email:  ${authUser.email}`);

  console.log('\nChecking lookup doc usernames/edgeable_administration...');
  const lookupSnap = await db.collection('usernames').doc(EXPECTED_USERNAME).get();
  if (lookupSnap.exists) {
    const d = lookupSnap.data();
    console.log(`  uid:       ${d.uid}`);
    console.log(`  authEmail: ${d.authEmail}`);
  } else {
    console.log('  (missing)');
  }

  console.log('\nDiagnosis:');
  if (authUser.email !== EXPECTED_AUTH_EMAIL) {
    console.log(`  ⚠ Auth email is "${authUser.email}", expected "${EXPECTED_AUTH_EMAIL}".`);
    console.log('  → The migration script has not run successfully.');
    console.log('    Run: node scripts/migrate-to-telegram-auth.js');
    return;
  }
  if (adminData.telegramUsername !== EXPECTED_USERNAME) {
    console.log(`  ⚠ Firestore telegramUsername is "${adminData.telegramUsername}", expected "${EXPECTED_USERNAME}".`);
    console.log('  → The migration script has not run successfully.');
    console.log('    Run: node scripts/migrate-to-telegram-auth.js');
    return;
  }
  if (!lookupSnap.exists || lookupSnap.data().uid !== adminUid) {
    console.log('  ⚠ Lookup doc missing or wrong.');
    console.log('  → The migration script has not run successfully.');
    console.log('    Run: node scripts/migrate-to-telegram-auth.js');
    return;
  }
  console.log('  ✓ Migration looks complete. Login should work with:');
  console.log(`      username: ${EXPECTED_USERNAME}`);
  console.log(`      password: (whatever you set when you first created the admin)`);

  if (newPassword) {
    if (newPassword.length < 6) {
      console.error('\n  Password must be at least 6 characters. Aborting.');
      process.exit(1);
    }
    await auth.updateUser(adminUid, { password: newPassword });
    console.log('\n  Password reset successfully.');
    console.log(`  Sign in with:`);
    console.log(`    username: ${EXPECTED_USERNAME}`);
    console.log(`    password: ${newPassword}`);
  } else {
    console.log('\nIf you forgot the password, reset it by running:');
    console.log(`  node scripts/admin-info.js <new-password>`);
  }
}

main().catch((e) => {
  console.error('\nFAILED:', e);
  process.exit(1);
});
