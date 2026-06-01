import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase.js';
import { createTransaction } from './transactions.js';

function fileExtension(file) {
  const parts = (file.name || '').split('.');
  if (parts.length < 2) return 'jpg';
  return parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

async function uploadProofImage(requestId, file) {
  const path = `transaction-proofs/requests/${requestId}.${fileExtension(file)}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return { path, url };
}

async function deleteImage(path) {
  if (!path) return;
  try { await deleteObject(storageRef(storage, path)); } catch {}
}

export async function createTransactionRequest({
  subscriberUid, subscriberDisplayName, subscriberTelegramUsername, subscriberPhone,
  length, declaredPrice, paymentMethod, paymentReference, notes, imageFile,
}) {
  if (!imageFile) throw new Error('Proof image is required.');
  if (!length || (length.years === 0 && length.months === 0 && length.weeks === 0)) {
    throw new Error('Please specify a length.');
  }
  if (declaredPrice == null || isNaN(Number(declaredPrice)) || Number(declaredPrice) < 0) {
    throw new Error('Please enter the amount you paid.');
  }
  if (!['cashapp', 'zelle'].includes(paymentMethod)) {
    throw new Error('Please select a payment method.');
  }

  // Pre-allocate doc ID by creating an empty doc
  const reqRef = doc(collection(db, 'transactionRequests'));
  const reqId = reqRef.id;

  const { path, url } = await uploadProofImage(reqId, imageFile);

  try {
    await addDoc(collection(db, 'transactionRequests'), {
      subscriberUid,
      subscriberDisplayName: subscriberDisplayName || '',
      subscriberTelegramUsername: subscriberTelegramUsername || '',
      subscriberPhone: subscriberPhone || '',
      length: {
        years: Number(length.years || 0),
        months: Number(length.months || 0),
        weeks: Number(length.weeks || 0),
      },
      declaredPrice: Number(declaredPrice),
      paymentMethod,
      paymentReference: paymentReference || '',
      notes: notes || '',
      proofImageUrl: url,
      proofImagePath: path,
      status: 'pending',
      createdAt: Timestamp.fromDate(new Date()),
    });
  } catch (err) {
    await deleteImage(path);
    throw err;
  }
}

export async function getMyTransactionRequests(uid) {
  const q = query(
    collection(db, 'transactionRequests'),
    where('subscriberUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPendingTransactionRequests() {
  const q = query(
    collection(db, 'transactionRequests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Approve = create the actual transaction (which extends the subscriber and
// auto-activates them) and mark the request approved.
//
// `overrides` may include:
//   length:     final length to credit (years/months/weeks). Defaults to req.length.
//   price:      final price to record. Defaults to req.declaredPrice.
//   adminNotes: optional explanation shown to the subscriber.
export async function approveTransactionRequest(requestId, admin, overrides = {}) {
  const reqRef = doc(db, 'transactionRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found.');
  const req = reqSnap.data();
  if (req.status !== 'pending') throw new Error('Request already reviewed.');

  const finalLength = overrides.length
    ? {
        years:  Number(overrides.length.years || 0),
        months: Number(overrides.length.months || 0),
        weeks:  Number(overrides.length.weeks || 0),
      }
    : req.length;
  if (finalLength.years === 0 && finalLength.months === 0 && finalLength.weeks === 0) {
    throw new Error('Length must include at least one of years, months, or weeks.');
  }
  const finalPrice = overrides.price != null ? Number(overrides.price) : Number(req.declaredPrice);
  if (isNaN(finalPrice) || finalPrice < 0) {
    throw new Error('Price must be a non-negative number.');
  }
  const adminNotes = overrides.adminNotes ? String(overrides.adminNotes).trim() : '';

  const baseNotes = req.notes
    ? `[${req.paymentMethod}] ${req.notes}`
    : `[${req.paymentMethod}]`;
  const txnNotes = adminNotes
    ? `${baseNotes} | admin: ${adminNotes}`
    : baseNotes;

  // Reuse the proof the subscriber already uploaded with their request — no need
  // to re-fetch/re-upload it (which the browser blocks cross-origin). The image
  // already lives under transaction-proofs/, so the transaction simply references it.
  const { txnId } = await createTransaction({
    subscriberUid: req.subscriberUid,
    length: finalLength,
    price: finalPrice,
    notes: txnNotes,
    proofImageUrl: req.proofImageUrl,
    proofImagePath: req.proofImagePath,
    admin,
  });

  await updateDoc(reqRef, {
    status: 'approved',
    finalLength,
    finalPrice,
    adminNotes,
    reviewedAt: Timestamp.fromDate(new Date()),
    reviewedBy: admin.uid,
    reviewedByEmail: admin.email || '',
    approvedTransactionId: txnId,
  });
}

export async function rejectTransactionRequest(requestId, reason, admin) {
  const reqRef = doc(db, 'transactionRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found.');
  const req = reqSnap.data();
  if (req.status !== 'pending') throw new Error('Request already reviewed.');

  if (req.proofImagePath) await deleteImage(req.proofImagePath);

  await updateDoc(reqRef, {
    status: 'rejected',
    rejectionReason: reason || '',
    reviewedAt: Timestamp.fromDate(new Date()),
    reviewedBy: admin.uid,
    reviewedByEmail: admin.email || '',
    proofImageUrl: '', // wipe to free up reference
    proofImagePath: '',
  });
}
