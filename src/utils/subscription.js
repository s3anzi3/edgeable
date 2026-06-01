export function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}

export function daysBetween(from, to) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// Returns { tone, label, daysLeft } for the given subscription state.
// tone is a semantic name mapped to design tokens by consumers.
// daysLeft is null when there's no end date or status is a manual override.
export function computeStatus(status, subscriptionEnd) {
  if (status === 'inactive') {
    return { tone: 'muted', label: 'Inactive', daysLeft: null };
  }
  if (status === 'paused') {
    return { tone: 'warning', label: 'Paused', daysLeft: null };
  }
  const end = toDate(subscriptionEnd);
  if (!end) {
    return { tone: 'muted', label: 'Unknown', daysLeft: null };
  }
  const days = daysBetween(new Date(), end);
  if (status === 'expired' || days <= 0) {
    return { tone: 'destructive', label: 'Expired', daysLeft: days };
  }
  if (days <= 7) {
    return { tone: 'destructive', label: 'Expiring Very Soon', daysLeft: days };
  }
  if (days <= 13) {
    return { tone: 'warning', label: 'Expiring Soon', daysLeft: days };
  }
  return { tone: 'success', label: 'Active', daysLeft: days };
}

// Map status tones to badge variants / text color classes / progress fills.
export const TONE_BADGE = {
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  muted: 'muted',
};

export const TONE_TEXT = {
  success: 'text-success',
  warning: 'text-warning dark:text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
};

export const TONE_BG = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};
