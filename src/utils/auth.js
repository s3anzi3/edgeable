// Helpers for the Telegram-username / phone identity model.
// Firebase Auth requires email/password under the hood, so we use synthetic
// emails that map deterministically from the user's chosen identifier.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

export const SYNTHETIC_EMAIL_DOMAIN = 'edgeable.local';

// Telegram usernames are case-insensitive. Strip leading @, lowercase, allow
// only [a-z0-9_] (Telegram's actual rules: 5-32 chars, letters/digits/underscore).
export function normalizeTelegramUsername(input) {
  if (!input) return '';
  return String(input).trim().replace(/^@+/, '').toLowerCase();
}

export function isValidTelegramUsername(username) {
  return /^[a-z0-9_]{5,32}$/.test(username);
}

// Phone numbers are stored as digits-only for uniqueness. Display can re-format.
export function normalizePhone(input) {
  if (!input) return '';
  return String(input).replace(/\D+/g, '');
}

export function isValidPhone(phone) {
  // 7-15 digits per ITU-T E.164
  return /^\d{7,15}$/.test(phone);
}

export function usernameToAuthEmail(username) {
  const u = normalizeTelegramUsername(username);
  return `tg_${u}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function phoneToAuthEmail(phone) {
  const p = normalizePhone(phone);
  return `ph_${p}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function normalizeEmail(input) {
  return String(input || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

// Look up a login identifier (username or phone) to find the user's authEmail.
// Returns null if not found.
export async function lookupAuthEmail(identifier) {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return null;

  // If they typed an email, that IS the auth email for real-email accounts.
  if (isValidEmail(trimmed)) {
    return normalizeEmail(trimmed);
  }

  // If it looks like a phone (starts with + or contains many digits), try phone lookup first.
  const looksLikePhone = /^\+/.test(trimmed) || /^\d[\d\s\-().]{5,}$/.test(trimmed);

  if (looksLikePhone) {
    const phone = normalizePhone(trimmed);
    if (isValidPhone(phone)) {
      const snap = await getDoc(doc(db, 'phones', phone));
      if (snap.exists()) return snap.data().authEmail;
    }
  }

  // Try as username
  const username = normalizeTelegramUsername(trimmed);
  if (isValidTelegramUsername(username)) {
    const snap = await getDoc(doc(db, 'usernames', username));
    if (snap.exists()) return snap.data().authEmail;
    // Fallback: construct deterministically (in case lookup doc is missing for some reason)
    return usernameToAuthEmail(username);
  }

  // Last resort: try as phone even if it didn't look like one
  const asPhone = normalizePhone(trimmed);
  if (isValidPhone(asPhone)) {
    const snap = await getDoc(doc(db, 'phones', asPhone));
    if (snap.exists()) return snap.data().authEmail;
  }

  return null;
}

export function generateRandomPin(length = 4) {
  let pin = '';
  for (let i = 0; i < length; i++) pin += Math.floor(Math.random() * 10).toString();
  return pin;
}
