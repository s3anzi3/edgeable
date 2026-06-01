import {
  doc, updateDoc, runTransaction, Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase.js';
import {
  normalizePhone, isValidPhone, usernameToAuthEmail,
} from './auth.js';

// Admin-only: permanently delete a subscriber account (via Cloud Function).
export async function deleteSubscriberAccount(uid) {
  const fn = httpsCallable(functions, 'deleteSubscriber');
  await fn({ uid });
}

// Admin override of a subscriber's subscription window.
//  - startDate  ("YYYY-MM-DD" or '')  → subscriptionStart (drives the performance
//    window the subscriber sees; safe to set to a pre-launch date for legacy clients).
//  - endDate    ("YYYY-MM-DD" or '')  → subscriptionEnd (access / expiry; end-of-day inclusive).
// A future end date auto-marks the subscriber Active so they get access immediately.
export async function setSubscriptionDates(uid, { startDate, endDate }) {
  const updates = {};

  let start = null;
  if (startDate) {
    start = new Date(`${startDate}T00:00:00`);
    if (isNaN(start)) throw new Error('Invalid start date.');
    updates.subscriptionStart = Timestamp.fromDate(start);
  } else {
    updates.subscriptionStart = null;
  }

  let end = null;
  if (endDate) {
    end = new Date(`${endDate}T23:59:59`); // inclusive of the chosen day
    if (isNaN(end)) throw new Error('Invalid end date.');
    updates.subscriptionEnd = Timestamp.fromDate(end);
  } else {
    updates.subscriptionEnd = null;
  }

  if (start && end && end < start) {
    throw new Error('End date must be on or after the start date.');
  }

  if (end && end > new Date()) {
    updates.status = 'active';
  }

  await updateDoc(doc(db, 'users', uid), updates);
}

// Subscriber-self-update: allowed by Firestore rules to write only unitSize.
export async function updateMyUnitSize(uid, unitSize) {
  const n = Number(unitSize);
  if (isNaN(n) || n < 0) throw new Error('Unit size must be a non-negative number.');
  await updateDoc(doc(db, 'users', uid), { unitSize: n });
}

export async function setUserStatus(uid, status) {
  if (!['active', 'expired', 'paused', 'inactive'].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  await updateDoc(doc(db, 'users', uid), { status });
}

// Update subscriber profile fields. Only displayName and phone are supported here.
// Telegram username changes require Admin SDK (synthetic auth email is derived
// from it) — handle separately.
export async function updateUserProfile(uid, { displayName, phone }) {
  const normalizedPhone = phone != null ? normalizePhone(phone) : null;

  if (normalizedPhone != null && !isValidPhone(normalizedPhone)) {
    throw new Error('Phone must be 7-15 digits.');
  }
  if (displayName != null && !displayName.trim()) {
    throw new Error('Display name cannot be empty.');
  }

  await runTransaction(db, async (txn) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await txn.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found.');
    const userData = userSnap.data();

    const updates = {};
    if (displayName != null && displayName.trim() !== userData.displayName) {
      updates.displayName = displayName.trim();
    }

    if (normalizedPhone != null && normalizedPhone !== userData.phone) {
      // Phone is changing — verify uniqueness, swap lookup docs
      const newPhoneRef = doc(db, 'phones', normalizedPhone);
      const newPhoneSnap = await txn.get(newPhoneRef);
      if (newPhoneSnap.exists() && newPhoneSnap.data().uid !== uid) {
        throw new Error('That phone number is already registered to another account.');
      }
      updates.phone = normalizedPhone;
      // Use the account's real auth email so phone-login keeps resolving correctly.
      // Fall back to the legacy synthetic email for older accounts that predate it.
      const authEmail = userData.authEmail
        || (userData.telegramUsername ? usernameToAuthEmail(userData.telegramUsername) : null);
      if (!authEmail) throw new Error('User has no auth email on record — cannot rebuild lookup.');

      if (userData.phone) {
        txn.delete(doc(db, 'phones', userData.phone));
      }
      txn.set(newPhoneRef, { uid, authEmail });
    }

    if (Object.keys(updates).length === 0) {
      // Nothing actually changed
      return;
    }

    txn.update(userRef, updates);
  });
}
