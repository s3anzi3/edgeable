import {
  collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase.js';

export const EVENT_TYPES = {
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
};

export const EVENT_LABELS = {
  password_reset:  'Password reset by admin',
  password_change: 'Password changed',
};

export async function recordSubscriberEvent({
  subscriberUid,
  subscriberDisplayName,
  type,
  performedBy,        // 'admin' | 'subscriber' | 'system'
  performedByUid,
  performedByName,
  details,
}) {
  await addDoc(collection(db, 'accountEvents'), {
    subscriberUid,
    subscriberDisplayName: subscriberDisplayName || '',
    type,
    performedBy,
    performedByUid: performedByUid || '',
    performedByName: performedByName || '',
    details: details || {},
    createdAt: Timestamp.fromDate(new Date()),
  });
}

export async function getSubscriberEvents(subscriberUid, max = 50) {
  const q = query(
    collection(db, 'accountEvents'),
    where('subscriberUid', '==', subscriberUid),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
