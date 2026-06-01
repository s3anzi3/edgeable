import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

const DOC_PATH = ['config', 'paymentInfo'];

// Real recipient values live in Firestore (config/paymentInfo) and are merged
// over these defaults at runtime — kept blank here so no personal payment
// details are committed to source control.
const DEFAULTS = {
  cashapp: { enabled: true, recipient: '' },
  zelle:   { enabled: true, recipient: '' },
  instructions: 'Send payment using one of the methods below, then upload a screenshot as proof.',
};

export async function getPaymentInfo() {
  const snap = await getDoc(doc(db, ...DOC_PATH));
  if (!snap.exists()) return DEFAULTS;
  return { ...DEFAULTS, ...snap.data() };
}

export async function savePaymentInfo(info) {
  await setDoc(doc(db, ...DOC_PATH), info, { merge: true });
}
