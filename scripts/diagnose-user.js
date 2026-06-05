// Diagnose / repair subscriber account integrity.
//
// Catches the "orphaned account" failure mode: a Firebase Auth account exists
// but its Firestore profile (users/{uid}) and/or login-lookup docs
// (usernames/{u}, phones/{p}) are missing or inconsistent. That state lets a
// person authenticate but never actually use the app, and leaves half-made
// accounts (and dangling lookup docs) lingering in the project.
//
// USAGE:
//   Diagnose one person (read-only):
//     node scripts/diagnose-user.js <email | @username | phone>
//
//   Scan the whole project for orphans + dangling lookups (read-only):
//     node scripts/diagnose-user.js --scan
//
//   Add --repair to either form to actually clean up. Repair ONLY ever deletes:
//     • Auth accounts that have NO users/{uid} profile doc (true orphans)
//     • Lookup docs (usernames/phones) whose uid has no profile doc
//   It never deletes a profile doc or an Auth account that has a profile.
//   Without --repair, nothing is changed.
//
// SETUP: needs service-account.json in the project root.

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
initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))) });

const auth = getAuth();
const db = getFirestore();

// ── small identifier helpers (mirrors src/utils/auth.js) ──────────────
const normUsername = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase();
const normPhone = (s) => String(s || '').replace(/\D+/g, '');
const normEmail = (s) => String(s || '').trim().toLowerCase();
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(s));
const isUsername = (s) => /^[a-z0-9_]{5,32}$/.test(normUsername(s));
const isPhone = (s) => /^\d{7,15}$/.test(normPhone(s));

const args = process.argv.slice(2);
const repair = args.includes('--repair');
const scan = args.includes('--scan');
const identifier = args.find((a) => !a.startsWith('--'));

async function main() {
  if (!scan && !identifier) {
    console.error('Provide an identifier (email/@username/phone) or --scan.');
    console.error('See the header of this file for usage.');
    process.exit(1);
  }

  console.log(repair ? 'MODE: repair (will delete orphans)\n' : 'MODE: diagnose (read-only)\n');

  if (scan) {
    await runScan();
  } else {
    await runSingle(identifier);
  }
}

// ── single-identifier path ────────────────────────────────────────────
async function runSingle(id) {
  console.log(`Resolving "${id}"...`);
  let uid = null;
  let authUser = null;

  if (isEmail(id)) {
    const email = normEmail(id);
    try {
      authUser = await auth.getUserByEmail(email);
      uid = authUser.uid;
      console.log(`  Auth account found by email: uid=${uid}`);
    } catch {
      console.log('  No Auth account with that email.');
    }
  } else if (isUsername(id) || isPhone(id)) {
    const coll = isUsername(id) ? 'usernames' : 'phones';
    const key = isUsername(id) ? normUsername(id) : normPhone(id);
    const snap = await db.collection(coll).doc(key).get();
    if (snap.exists) {
      uid = snap.data().uid;
      console.log(`  Lookup doc ${coll}/${key} → uid=${uid}, authEmail=${snap.data().authEmail}`);
    } else {
      console.log(`  No lookup doc at ${coll}/${key}.`);
    }
  } else {
    console.log('  Could not classify identifier as email, username, or phone.');
  }

  if (!uid) {
    console.log('\nNothing resolvable — no Auth account and no lookup doc point to this person.');
    console.log('If they think they signed up, they can simply sign up again (fresh start).');
    return;
  }

  if (!authUser) {
    try {
      authUser = await auth.getUser(uid);
    } catch {
      authUser = null;
    }
  }
  await reportAndRepairUid(uid, authUser);
}

// ── full-project scan ─────────────────────────────────────────────────
async function runScan() {
  console.log('Scanning all Auth accounts for missing profiles...');
  const orphans = [];
  let pageToken;
  let total = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      total++;
      const profile = await db.collection('users').doc(u.uid).get();
      if (!profile.exists) orphans.push(u);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`  ${total} Auth accounts checked, ${orphans.length} orphan(s) (no profile doc).`);
  for (const u of orphans) {
    console.log('');
    await reportAndRepairUid(u.uid, u);
  }

  console.log('\nScanning lookup docs for dangling references...');
  await scanDanglingLookups('usernames');
  await scanDanglingLookups('phones');

  if (!repair && (orphans.length > 0)) {
    console.log('\nRe-run with --repair to delete the orphan(s) listed above.');
  }
}

async function scanDanglingLookups(coll) {
  const snap = await db.collection(coll).get();
  let dangling = 0;
  for (const d of snap.docs) {
    const uid = d.data().uid;
    const profile = uid ? await db.collection('users').doc(uid).get() : { exists: false };
    if (!profile.exists) {
      dangling++;
      console.log(`  Dangling ${coll}/${d.id} → uid=${uid || '(none)'} (no profile)`);
      if (repair) {
        await d.ref.delete();
        console.log(`    ✓ deleted ${coll}/${d.id}`);
      }
    }
  }
  if (dangling === 0) console.log(`  ${coll}: none dangling.`);
}

// ── report + (optionally) repair one uid ──────────────────────────────
async function reportAndRepairUid(uid, authUser) {
  const profileSnap = await db.collection('users').doc(uid).get();
  const hasAuth = !!authUser;
  const hasProfile = profileSnap.exists;

  console.log(`Account uid=${uid}`);
  console.log(`  Auth account:   ${hasAuth ? `yes (email=${authUser.email})` : 'MISSING'}`);
  console.log(`  Profile doc:    ${hasProfile ? `yes (${profileSnap.data().displayName || 'unnamed'}, status=${profileSnap.data().status})` : 'MISSING'}`);

  // Lookup docs that reference this uid
  const owned = { usernames: [], phones: [] };
  for (const coll of ['usernames', 'phones']) {
    const q = await db.collection(coll).where('uid', '==', uid).get();
    owned[coll] = q.docs;
    console.log(`  ${coll}: ${q.empty ? 'none' : q.docs.map((d) => d.id).join(', ')}`);
  }

  if (hasAuth && hasProfile) {
    console.log('  → Healthy. Login should work.');
    return;
  }

  if (hasAuth && !hasProfile) {
    console.log('  → ORPHAN: can authenticate but has no profile (the bug we fixed).');
    if (repair) {
      for (const coll of ['usernames', 'phones']) {
        for (const d of owned[coll]) {
          await d.ref.delete();
          console.log(`    ✓ deleted ${coll}/${d.id}`);
        }
      }
      await auth.deleteUser(uid);
      console.log('    ✓ deleted orphaned Auth account');
      console.log('    They can now sign up cleanly from scratch.');
    } else {
      console.log('    (run with --repair to delete this orphan + its lookup docs)');
    }
    return;
  }

  if (!hasAuth && hasProfile) {
    console.log('  → Profile without an Auth account (unusual). Left untouched — review manually.');
    return;
  }

  console.log('  → Nothing here.');
}

main().catch((e) => {
  console.error('\nFAILED:', e);
  process.exit(1);
});
