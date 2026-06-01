import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { getMyProfileRequests } from '../utils/profileRequests.js';
import { getMyTransactionRequests } from '../utils/transactionRequests.js';
import { formatDateTime, toDate } from '../utils/subscription.js';
import { formatLength } from '../utils/dateMath.js';
import { Card, CardContent } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';

const STATUS_TONES = {
  pending:  { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  modified: { variant: 'warning', label: 'Approved with adjustments' },
  rejected: { variant: 'destructive', label: 'Rejected' },
};

export default function MyRequestsList({ uid, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profile, txn] = await Promise.all([
          getMyProfileRequests(uid),
          getMyTransactionRequests(uid),
        ]);
        if (cancelled) return;
        const merged = [
          ...profile.map(r => ({ ...r, _kind: 'profile' })),
          ...txn.map(r => ({ ...r, _kind: 'transaction' })),
        ].sort((a, b) => {
          const da = toDate(a.createdAt)?.getTime() || 0;
          const db = toDate(b.createdAt)?.getTime() || 0;
          return db - da;
        });
        setItems(merged);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, refreshKey]);

  if (loading || items.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ScrollText className="h-3.5 w-3.5" />
          My recent requests
        </h3>
        <ul className="-mx-2 divide-y divide-border">
          {items.map((r) => {
            const styleKey = effectiveStatus(r);
            const tone = STATUS_TONES[styleKey] || STATUS_TONES.pending;
            return (
              <li key={`${r._kind}-${r.id}`} className="flex flex-col gap-1.5 px-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-sm flex-1 min-w-0">
                    {r._kind === 'profile' ? renderProfile(r) : renderTransaction(r)}
                  </div>
                  <Badge variant={tone.variant}>{tone.label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</div>
                {r._kind === 'transaction' && r.status === 'approved' && wasModified(r) && (
                  <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs space-y-0.5">
                    {!sameLength(r.length, r.finalLength) && (
                      <div>
                        Length: <span className="line-through opacity-60">{formatLength(r.length)}</span> → <strong>{formatLength(r.finalLength)}</strong>
                      </div>
                    )}
                    {Number(r.declaredPrice) !== Number(r.finalPrice) && (
                      <div>
                        Price: <span className="line-through opacity-60">${Number(r.declaredPrice).toFixed(2)}</span> → <strong>${Number(r.finalPrice).toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                )}
                {r._kind === 'transaction' && r.adminNotes && (
                  <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
                    <strong className="font-medium">Admin note:</strong> {r.adminNotes}
                  </div>
                )}
                {r.status === 'rejected' && r.rejectionReason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <strong className="font-medium">Reason:</strong> {r.rejectionReason}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function effectiveStatus(r) {
  if (r.status === 'approved' && r._kind === 'transaction' && wasModified(r)) {
    return 'modified';
  }
  return r.status;
}

function wasModified(r) {
  if (!r.finalLength && r.finalPrice == null) return false;
  const lengthDiff = !sameLength(r.length, r.finalLength);
  const priceDiff = r.finalPrice != null && Number(r.declaredPrice) !== Number(r.finalPrice);
  return lengthDiff || priceDiff;
}

function sameLength(a, b) {
  if (!a || !b) return false;
  return Number(a.years || 0) === Number(b.years || 0)
    && Number(a.months || 0) === Number(b.months || 0)
    && Number(a.weeks || 0) === Number(b.weeks || 0);
}

function renderProfile(r) {
  return (
    <>Profile · {labelForField(r.field)}: <span className="text-muted-foreground">{r.currentValue || '(empty)'}</span> → <strong>{r.proposedValue}</strong></>
  );
}

function renderTransaction(r) {
  return (
    <>Subscription · {formatLength(r.length)} · ${Number(r.declaredPrice).toFixed(2)} · {r.paymentMethod}</>
  );
}

function labelForField(field) {
  switch (field) {
    case 'displayName': return 'Display name';
    case 'phone': return 'Phone';
    default: return field;
  }
}
