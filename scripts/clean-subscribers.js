// One-shot cleanup script: deletes any user document with ID prefixed `seed_`.
// Uses Firebase Admin SDK so it bypasses security rules.
//
// SETUP:
//   Same as seed-subscribers.js — needs service-account.json in the project root.
//
// USAGE:
//   From C:\Users\panky\Desktop\edgeable run:
//     node scripts/clean-subscribers.js

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), 'service-account.json');

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`\nMissing service-account.json at ${SERVICE_ACCOUNT_PATH}\n`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const snap = await db.collection('users').get();
  const seeds = snap.docs.filter((d) => d.id.startsWith('seed_'));

  if (seeds.length === 0) {
    console.log('No seed_* documents found. Nothing to clean.');
    return;
  }

  console.log(`Found ${seeds.length} seed document(s). Deleting...`);
  for (const d of seeds) {
    await d.ref.delete();
    console.log(`  Deleted: ${d.id}  (${d.data().displayName || ''})`);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
