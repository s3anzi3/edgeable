// One-shot seed script that creates test subscriber documents in Firestore.
// Uses Firebase Admin SDK so it bypasses security rules.
//
// SETUP:
//   1. Firebase console -> Project Settings -> Service accounts ->
//      Generate new private key. Save the JSON to project root as
//      `service-account.json` (already in .gitignore).
//   2. From C:\Users\panky\Desktop\edgeable run:
//        node scripts/seed-subscribers.js
//
// NOTE: only Firestore docs are created. No Firebase Auth users are seeded —
// these test rows exist for the admin table view, not for login. The doc IDs
// use a `seed_*` prefix so you can find and delete them later.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), 'service-account.json');

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`\nMissing service-account.json at ${SERVICE_ACCOUNT_PATH}`);
  console.error('Download from Firebase console -> Project Settings -> Service accounts -> Generate new private key.\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const SEED = [
  { name: 'Marcus Chen',    plan: 'Annual',  daysOut: 180, status: 'active' },  // green / Active
  { name: 'Aisha Patel',    plan: 'Monthly', daysOut: 18,  status: 'active' },  // yellow / Expiring Soon
  { name: 'Jordan Rivera',  plan: 'Monthly', daysOut: 4,   status: 'active' },  // red / Expiring Very Soon
  { name: "Liam O'Brien",   plan: 'Annual',  daysOut: -10, status: 'active' },  // red / Expired by date
  { name: 'Yuki Tanaka',    plan: 'Monthly', daysOut: 15,  status: 'paused' },  // yellow / Paused
];

const today = new Date();

async function main() {
  for (const s of SEED) {
    const slug = s.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
    const uid = `seed_${slug}`;
    const start = new Date(today); start.setDate(start.getDate() - 30);
    const end   = new Date(today); end.setDate(end.getDate() + s.daysOut);

    await db.doc(`users/${uid}`).set({
      displayName: s.name,
      email: `${slug}@edgeable.test`,
      role: 'user',
      plan: s.plan,
      status: s.status,
      subscriptionStart: Timestamp.fromDate(start),
      subscriptionEnd: Timestamp.fromDate(end),
    });
    console.log(`  Seeded: ${s.name}  (${uid})`);
  }
  console.log('\nDone. Refresh /admin to see them.');
  console.log('To remove: in Firestore console, delete docs where document ID starts with "seed_".');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
