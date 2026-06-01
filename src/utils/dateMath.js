// Calendar-aware date arithmetic for subscription extensions.
// Each function clamps to the last day of the target month when needed
// (e.g., Jan 31 + 1 month -> Feb 28, not March 3).

export function addYears(date, n) {
  const d = new Date(date);
  const targetYear = d.getFullYear() + n;
  const targetMonth = d.getMonth();
  const targetDay = d.getDate();
  d.setDate(1);
  d.setFullYear(targetYear);
  d.setMonth(targetMonth);
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  const totalMonths = d.getMonth() + n;
  const targetYear = d.getFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const targetDay = d.getDate();
  d.setDate(1);
  d.setFullYear(targetYear);
  d.setMonth(targetMonth);
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}

export function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

// Apply a {years, months, weeks} length to a date in that order.
// Years first preserves "1 year + 6 months" intent (e.g. May 5, 2026 -> May 5, 2027 -> Nov 5, 2027).
export function applyLength(from, length) {
  let d = new Date(from);
  if (length.years)  d = addYears(d, length.years);
  if (length.months) d = addMonths(d, length.months);
  if (length.weeks)  d = addWeeks(d, length.weeks);
  return d;
}

export function formatLength(length) {
  const parts = [];
  if (length.years)  parts.push(`${length.years} year${length.years === 1 ? '' : 's'}`);
  if (length.months) parts.push(`${length.months} month${length.months === 1 ? '' : 's'}`);
  if (length.weeks)  parts.push(`${length.weeks} week${length.weeks === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : '—';
}
