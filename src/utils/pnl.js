import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase.js';

// Doc IDs are local-time YYYY-MM-DD. Easy upserts, natural sort.
function pad(n) { return String(n).padStart(2, '0'); }

export function todayDocId() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateIdToDate(id) {
  // Treat as local midnight to avoid timezone slippage.
  return new Date(id + 'T00:00:00');
}

export async function getPnLEntry(dateId) {
  const snap = await getDoc(doc(db, 'dailyPnL', dateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function savePnLEntry({ dateId, units, wins, losses, pushes, notes, admin }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateId)) throw new Error('Invalid date.');
  if (units === '' || isNaN(Number(units))) throw new Error('Units must be a number.');

  const ref = doc(db, 'dailyPnL', dateId);
  const existing = await getDoc(ref);
  const now = Timestamp.fromDate(new Date());

  const data = {
    date: Timestamp.fromDate(dateIdToDate(dateId)),
    units: Number(units),
    wins:   wins   !== '' && wins   != null ? Number(wins)   : null,
    losses: losses !== '' && losses != null ? Number(losses) : null,
    pushes: pushes !== '' && pushes != null ? Number(pushes) : null,
    notes: notes ? String(notes).trim() : '',
    updatedAt: now,
  };

  if (existing.exists()) {
    await setDoc(ref, data, { merge: true });
  } else {
    await setDoc(ref, {
      ...data,
      createdAt: now,
      createdBy: admin?.uid || '',
      createdByEmail: admin?.email || '',
    });
  }
}


export async function deletePnLEntry(dateId) {
  await deleteDoc(doc(db, 'dailyPnL', dateId));
}

export async function getRecentPnL(maxCount = 60) {
  const q = query(
    collection(db, 'dailyPnL'),
    orderBy('date', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllPnL(maxCount = 2000) {
  const q = query(
    collection(db, 'dailyPnL'),
    orderBy('date', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPnLSinceDate(startDate, maxCount = 365) {
  const q = query(
    collection(db, 'dailyPnL'),
    where('date', '>=', Timestamp.fromDate(startDate)),
    orderBy('date', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function summarizePnL(entries) {
  let totalUnits = 0;
  let wins = 0, losses = 0, pushes = 0;
  let recordedDays = 0;
  for (const e of entries) {
    totalUnits += Number(e.units || 0);
    if (e.wins != null)   wins   += Number(e.wins);
    if (e.losses != null) losses += Number(e.losses);
    if (e.pushes != null) pushes += Number(e.pushes);
    recordedDays++;
  }
  return { totalUnits, wins, losses, pushes, days: recordedDays };
}

// Returns a Tailwind text-color class. Theme-aware.
export function unitsColor(n) {
  if (n > 0) return 'text-success';
  if (n < 0) return 'text-destructive';
  return 'text-muted-foreground';
}

// Returns the raw CSS color (for SVG fill/stroke).
export function unitsCssColor(n) {
  if (n > 0) return 'hsl(var(--success))';
  if (n < 0) return 'hsl(var(--destructive))';
  return 'hsl(var(--muted-foreground))';
}

export function formatUnits(n) {
  const v = Number(n) || 0;
  // Up to 2 decimals, no rounding to 1 and no forced trailing zeros
  // (e.g. 2.25 → "2.25", 2.5 → "2.5", 2 → "2").
  const rounded = Math.round(v * 100) / 100;
  return `${v >= 0 ? '+' : ''}${rounded} U`;
}
