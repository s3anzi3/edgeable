import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';

export const DISCOUNT_RATE_MONTHLY = 10;
export const STANDARD_RATE_MONTHLY = 30;
export const DISCOUNT_MONTHS_TOTAL = 6;

// Convert {years, months, weeks} into months-equivalent (for pricing math).
// 1 year = 12 months, 1 week = 0.25 months (4 weeks ≈ 1 month).
export function lengthInMonthsApprox(length) {
  if (!length) return 0;
  const y = Number(length.years || 0);
  const m = Number(length.months || 0);
  const w = Number(length.weeks || 0);
  return y * 12 + m + w * 0.25;
}

// Sum the months-equivalent of a subscriber's existing transactions.
export async function getTotalPaidMonths(subscriberUid) {
  const q = query(
    collection(db, 'transactions'),
    where('subscriberUid', '==', subscriberUid)
  );
  const snap = await getDocs(q);
  let total = 0;
  for (const d of snap.docs) {
    total += lengthInMonthsApprox(d.data().length);
  }
  return total;
}

// Compute the suggested price given how many months the subscriber has already
// paid for (cumulative across all their transactions) and the length they're
// purchasing now. Splits at the 6-month boundary if the purchase straddles it.
export function computeSuggestedPrice(currentPaidMonths, length) {
  const purchasing = lengthInMonthsApprox(length);
  if (purchasing <= 0) {
    return {
      total: 0,
      discountedMonths: 0, standardMonths: 0,
      discountedRate: DISCOUNT_RATE_MONTHLY, standardRate: STANDARD_RATE_MONTHLY,
    };
  }
  const remainingDiscounted = Math.max(0, DISCOUNT_MONTHS_TOTAL - currentPaidMonths);
  const discountedPortion = Math.min(purchasing, remainingDiscounted);
  const standardPortion = purchasing - discountedPortion;
  const total = discountedPortion * DISCOUNT_RATE_MONTHLY + standardPortion * STANDARD_RATE_MONTHLY;
  return {
    total: Math.round(total * 100) / 100,
    discountedMonths: discountedPortion,
    standardMonths: standardPortion,
    discountedRate: DISCOUNT_RATE_MONTHLY,
    standardRate: STANDARD_RATE_MONTHLY,
  };
}

export function describePriceBreakdown(breakdown) {
  const parts = [];
  if (breakdown.discountedMonths > 0) {
    parts.push(`${formatMonths(breakdown.discountedMonths)} × $${breakdown.discountedRate}/mo`);
  }
  if (breakdown.standardMonths > 0) {
    parts.push(`${formatMonths(breakdown.standardMonths)} × $${breakdown.standardRate}/mo`);
  }
  return parts.join(' + ');
}

function formatMonths(n) {
  if (Number.isInteger(n)) return `${n} mo`;
  return `${n.toFixed(2)} mo`;
}
