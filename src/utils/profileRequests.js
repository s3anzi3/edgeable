import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, Timestamp, runTransaction,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase.js';
import { updateUserProfile } from './users.js';

const REQUEST_FIELDS = ['displayName', 'phone', 'email', 'telegramUsername'];

// Fields that change a login identifier require Admin-SDK privileges, so they're
// applied via a Cloud Function rather than directly from the client.
const FUNCTION_FIELDS = ['email', 'telegramUsername'];

export async function createProfileChangeRequest({
  subscriberUid, subscriberDisplayName, field, currentValue, proposedValue, reason, notes,
}) {
  if (!REQUEST_FIELDS.includes(field)) {
    throw new Error(`Cannot request change for field: ${field}`);
  }
  if (!proposedValue || !String(proposedValue).trim()) {
    throw new Error('Please enter the new value you want.');
  }
  if (!reason || !String(reason).trim()) {
    throw new Error('Please give a reason for the change.');
  }

  await addDoc(collection(db, 'profileChangeRequests'), {
    subscriberUid,
    subscriberDisplayName: subscriberDisplayName || '',
    field,
    currentValue: currentValue || '',
    proposedValue: String(proposedValue).trim(),
    reason: String(reason).trim(),
    notes: notes ? String(notes).trim() : '',
    status: 'pending',
    createdAt: Timestamp.fromDate(new Date()),
  });
}

export async function getMyProfileRequests(uid) {
  const q = query(
    collection(db, 'profileChangeRequests'),
    where('subscriberUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPendingProfileRequests() {
  const q = query(
    collection(db, 'profileChangeRequests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function approveProfileRequest(requestId, admin) {
  const reqRef = doc(db, 'profileChangeRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found.');
  const req = reqSnap.data();
  if (req.status !== 'pending') throw new Error('Request already reviewed.');

  // Apply the change. Login identifiers (email/telegram) go through the
  // admin-only Cloud Function; name/phone are applied client-side.
  if (FUNCTION_FIELDS.includes(req.field)) {
    const applyProfileChange = httpsCallable(functions, 'applyProfileChange');
    await applyProfileChange({ uid: req.subscriberUid, field: req.field, value: req.proposedValue });
  } else {
    const updates = {};
    updates[req.field] = req.proposedValue;
    await updateUserProfile(req.subscriberUid, updates);
  }

  // Mark request approved
  await updateDoc(reqRef, {
    status: 'approved',
    reviewedAt: Timestamp.fromDate(new Date()),
    reviewedBy: admin.uid,
    reviewedByEmail: admin.email || '',
  });
}

export async function rejectProfileRequest(requestId, reason, admin) {
  const reqRef = doc(db, 'profileChangeRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found.');
  const req = reqSnap.data();
  if (req.status !== 'pending') throw new Error('Request already reviewed.');

  await updateDoc(reqRef, {
    status: 'rejected',
    rejectionReason: reason || '',
    reviewedAt: Timestamp.fromDate(new Date()),
    reviewedBy: admin.uid,
    reviewedByEmail: admin.email || '',
  });
}
