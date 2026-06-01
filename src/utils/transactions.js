import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase.js';
import { applyLength } from './dateMath.js';
import { toDate } from './subscription.js';

// Compute the start point for extending a subscription:
// active subs extend from current end; expired/missing extend from today.
function chooseExtendFrom(currentEnd, today) {
  if (currentEnd && currentEnd > today) return currentEnd;
  return today;
}

function ensurePositiveLength(length) {
  const y = Number(length?.years || 0);
  const m = Number(length?.months || 0);
  const w = Number(length?.weeks || 0);
  if (y === 0 && m === 0 && w === 0) {
    throw new Error('Length must include at least one of years, months, or weeks.');
  }
  return { years: y, months: m, weeks: w };
}

function fileExtension(file) {
  const parts = (file.name || '').split('.');
  if (parts.length < 2) return 'jpg';
  const ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'jpg';
}

async function uploadProofImage(txnId, file) {
  const path = `transaction-proofs/${txnId}.${fileExtension(file)}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return { path, url };
}

async function deleteProofImage(path) {
  if (!path) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch {
    // ignore — image may already be gone
  }
}

export async function createTransaction({
  subscriberUid,
  length,
  price,
  notes,
  imageFile,
  proofImageUrl,
  proofImagePath,
  admin,
}) {
  if (!subscriberUid) throw new Error('Subscriber is required.');
  const hasUpload = !!imageFile;
  const hasExisting = !!(proofImageUrl && proofImagePath);
  if (!hasUpload && !hasExisting) throw new Error('Proof image is required.');
  if (price == null || isNaN(Number(price)) || Number(price) < 0) {
    throw new Error('Price must be a non-negative number.');
  }
  const cleanLength = ensurePositiveLength(length);

  const userRef = doc(db, 'users', subscriberUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('Subscriber not found.');
  const userData = userSnap.data();

  const today = new Date();
  const currentEnd = toDate(userData.subscriptionEnd);
  const extendFrom = chooseExtendFrom(currentEnd, today);
  const newEnd = applyLength(extendFrom, cleanLength);

  const txnRef = doc(collection(db, 'transactions'));
  const txnId = txnRef.id;

  // Either upload a fresh image, or reuse one that's already in Storage
  // (e.g. the proof a subscriber uploaded with their request — avoids
  // re-fetching the file cross-origin, which browsers block).
  let path = proofImagePath;
  let url = proofImageUrl;
  if (hasUpload) {
    ({ path, url } = await uploadProofImage(txnId, imageFile));
  }

  try {
    const batch = writeBatch(db);
    batch.set(txnRef, {
      subscriberUid,
      subscriberDisplayName: userData.displayName || '',
      subscriberEmail: userData.email || '',
      price: Number(price),
      length: cleanLength,
      notes: notes || '',
      proofImageUrl: url,
      proofImagePath: path,
      extendedFrom: Timestamp.fromDate(extendFrom),
      extendedTo: Timestamp.fromDate(newEnd),
      createdAt: Timestamp.fromDate(today),
      createdBy: admin.uid,
      createdByEmail: admin.email || '',
    });
    const userUpdates = {
      subscriptionEnd: Timestamp.fromDate(newEnd),
      status: 'active',
    };
    if (!userData.subscriptionStart) {
      userUpdates.subscriptionStart = Timestamp.fromDate(today);
    }
    batch.update(userRef, userUpdates);
    await batch.commit();
  } catch (err) {
    // Roll back only an image WE uploaded here (don't delete a reused request image)
    if (hasUpload) await deleteProofImage(path);
    throw err;
  }

  return { txnId, extendFrom, newEnd };
}

export async function updateTransaction(txnId, { length, price, notes, imageFile }) {
  const txnRef = doc(db, 'transactions', txnId);
  const txnSnap = await getDoc(txnRef);
  if (!txnSnap.exists()) throw new Error('Transaction not found.');
  const txn = txnSnap.data();

  const cleanLength = ensurePositiveLength(length);
  if (price == null || isNaN(Number(price)) || Number(price) < 0) {
    throw new Error('Price must be a non-negative number.');
  }

  const updates = {
    length: cleanLength,
    price: Number(price),
    notes: notes || '',
  };

  let oldImagePath = null;
  if (imageFile) {
    const { path, url } = await uploadProofImage(txnId, imageFile);
    if (txn.proofImagePath && txn.proofImagePath !== path) {
      oldImagePath = txn.proofImagePath;
    }
    updates.proofImagePath = path;
    updates.proofImageUrl = url;
  }

  const batch = writeBatch(db);
  batch.update(txnRef, updates);
  await batch.commit();

  if (oldImagePath) {
    await deleteProofImage(oldImagePath);
  }

  await replaySubscriberChain(txn.subscriberUid);
}

export async function deleteTransaction(txnId) {
  const txnRef = doc(db, 'transactions', txnId);
  const txnSnap = await getDoc(txnRef);
  if (!txnSnap.exists()) throw new Error('Transaction not found.');
  const txn = txnSnap.data();

  await deleteProofImage(txn.proofImagePath);

  const batch = writeBatch(db);
  batch.delete(txnRef);
  await batch.commit();

  await replaySubscriberChain(txn.subscriberUid);
}

// Recompute a subscriber's subscriptionEnd by replaying all their transactions
// in chronological order. Each transaction's extendedFrom is recomputed as well
// so the audit trail stays consistent after edits/deletes.
//
// The chain baseline is the FIRST transaction's original extendedFrom — that
// captures the subscriber's state before any transactions were recorded.
export async function replaySubscriberChain(subscriberUid) {
  const userRef = doc(db, 'users', subscriberUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const q = query(
    collection(db, 'transactions'),
    where('subscriberUid', '==', subscriberUid),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  let currentEnd = snap.docs[0].data().extendedFrom.toDate();
  const batch = writeBatch(db);

  for (let i = 0; i < snap.docs.length; i++) {
    const t = snap.docs[i];
    const data = t.data();
    const txnDate = data.createdAt.toDate();
    const startFrom = currentEnd > txnDate ? currentEnd : txnDate;
    const newEnd = applyLength(startFrom, data.length);

    if (i === 0) {
      batch.update(t.ref, { extendedTo: Timestamp.fromDate(newEnd) });
    } else {
      batch.update(t.ref, {
        extendedFrom: Timestamp.fromDate(startFrom),
        extendedTo: Timestamp.fromDate(newEnd),
      });
    }
    currentEnd = newEnd;
  }

  batch.update(userRef, { subscriptionEnd: Timestamp.fromDate(currentEnd) });
  await batch.commit();
}

export async function getSubscriberTransactions(subscriberUid) {
  const q = query(
    collection(db, 'transactions'),
    where('subscriberUid', '==', subscriberUid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllTransactions() {
  const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTransaction(txnId) {
  const snap = await getDoc(doc(db, 'transactions', txnId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
