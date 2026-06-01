// Cloud Functions for Edgeable.
//
// applyProfileChange: admin-only callable that applies a subscriber identity
// change (email or Telegram username) that the client SDK can't do on its own,
// because it requires Admin-SDK privileges (changing the Firebase Auth account
// email) and keeping the login-lookup docs in sync.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const auth = getAuth();
const db = getFirestore();

const SYNTHETIC_DOMAIN = 'edgeable.local';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{5,32}$/;

async function assertAdmin(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists || snap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

exports.applyProfileChange = onCall(async (request) => {
  await assertAdmin(request.auth && request.auth.uid);

  const { uid, field, value } = request.data || {};
  if (!uid || !field) throw new HttpsError('invalid-argument', 'Missing uid or field.');
  // Firebase UIDs are short alphanumerics — reject anything else to keep it out of doc paths.
  if (typeof uid !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(uid)) {
    throw new HttpsError('invalid-argument', 'Invalid user id.');
  }

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'Subscriber not found.');
  const user = userSnap.data();

  if (field === 'email') {
    const email = String(value || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpsError('invalid-argument', 'Invalid email address.');
    try {
      await auth.updateUser(uid, { email, emailVerified: false });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'That email is already in use by another account.');
      }
      throw e;
    }
    await userRef.set({ email, authEmail: email }, { merge: true });
    if (user.telegramUsername) {
      await db.doc(`usernames/${user.telegramUsername}`).set({ uid, authEmail: email }, { merge: true });
    }
    if (user.phone) {
      await db.doc(`phones/${user.phone}`).set({ uid, authEmail: email }, { merge: true });
    }
    return { ok: true, field, value: email };
  }

  if (field === 'telegramUsername') {
    const uname = String(value || '').replace(/^@+/, '').toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      throw new HttpsError('invalid-argument', 'Username must be 5-32 chars: letters, digits, or underscore.');
    }
    const newRef = db.doc(`usernames/${uname}`);
    const newSnap = await newRef.get();
    if (newSnap.exists && newSnap.data().uid !== uid) {
      throw new HttpsError('already-exists', 'That Telegram username is already taken.');
    }

    // Source of truth for the current login email is the Auth account itself.
    const authUser = await auth.getUser(uid);
    let authEmail = authUser.email || '';
    // Legacy accounts use a synthetic email derived from the username — regenerate it.
    if (/@edgeable\.local$/i.test(authEmail)) {
      authEmail = `tg_${uname}@${SYNTHETIC_DOMAIN}`;
      await auth.updateUser(uid, { email: authEmail });
    }

    const oldUname = user.telegramUsername || '';
    await newRef.set({ uid, authEmail }, { merge: true });
    if (oldUname && oldUname !== uname) {
      await db.doc(`usernames/${oldUname}`).delete().catch(() => {});
    }
    const updates = { telegramUsername: uname };
    if (authEmail) updates.authEmail = authEmail;
    await userRef.set(updates, { merge: true });
    if (user.phone && authEmail) {
      await db.doc(`phones/${user.phone}`).set({ uid, authEmail }, { merge: true });
    }
    return { ok: true, field, value: uname };
  }

  throw new HttpsError('invalid-argument', `Unsupported field: ${field}`);
});

// Admin-only: fully delete a subscriber account. Removes the Auth user, the
// users doc, the username/phone login lookups, and their pending requests +
// account events. Transactions are intentionally KEPT as financial records.
exports.deleteSubscriber = onCall(async (request) => {
  await assertAdmin(request.auth && request.auth.uid);

  const { uid } = request.data || {};
  if (typeof uid !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(uid)) {
    throw new HttpsError('invalid-argument', 'Invalid user id.');
  }
  if (request.auth.uid === uid) {
    throw new HttpsError('failed-precondition', "You can't delete your own account.");
  }

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const user = userSnap.exists ? userSnap.data() : null;
  if (user && user.role === 'admin') {
    throw new HttpsError('failed-precondition', 'Admin accounts cannot be deleted here.');
  }

  // Remove login lookups
  if (user && user.telegramUsername) {
    await db.doc(`usernames/${user.telegramUsername}`).delete().catch(() => {});
  }
  if (user && user.phone) {
    await db.doc(`phones/${user.phone}`).delete().catch(() => {});
  }

  // Cascade-delete the subscriber's requests and audit events (in batches).
  for (const coll of ['transactionRequests', 'profileChangeRequests', 'accountEvents']) {
    const snap = await db.collection(coll).where('subscriberUid', '==', uid).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await userRef.delete().catch(() => {});

  // Finally remove the Auth account.
  await getAuth().deleteUser(uid).catch((e) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });

  return { ok: true };
});
