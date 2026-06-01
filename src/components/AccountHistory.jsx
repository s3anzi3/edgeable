import { useEffect, useState } from 'react';
import { DollarSign, KeyRound, History } from 'lucide-react';
import { getSubscriberTransactions } from '../utils/transactions.js';
import { getSubscriberEvents, EVENT_LABELS } from '../utils/accountEvents.js';
import { formatDateTime, formatDate, toDate } from '../utils/subscription.js';
import { formatLength } from '../utils/dateMath.js';
import { Card, CardContent } from './ui/card.jsx';

export default function AccountHistory({ uid, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [txns, events] = await Promise.all([
          getSubscriberTransactions(uid),
          getSubscriberEvents(uid),
        ]);
        if (cancelled) return;
        const merged = [
          ...txns.map(t => ({ ...t, _kind: 'transaction' })),
          ...events.map(e => ({ ...e, _kind: 'event' })),
        ].sort((a, b) => {
          const da = toDate(a.createdAt)?.getTime() || 0;
          const db = toDate(b.createdAt)?.getTime() || 0;
          return db - da;
        });
        setItems(merged);
      } catch (e) {
        console.error('AccountHistory load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, refreshKey]);

  if (loading) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Account history
        </h3>

        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nothing to show yet.
          </div>
        ) : (
          <ul className="-mx-2 divide-y divide-border">
            {items.map((item) => {
              const Icon = item._kind === 'transaction' ? DollarSign : KeyRound;
              const iconBg =
                item._kind === 'transaction'
                  ? 'bg-success/15 text-success'
                  : 'bg-accent text-accent-foreground';
              return (
                <li key={`${item._kind}-${item.id}`} className="flex items-start gap-3 px-2 py-3 first:pt-0 last:pb-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {item._kind === 'transaction' ? renderTxn(item) : renderEvent(item)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function renderTxn(t) {
  return (
    <>
      Paid <strong>${Number(t.price).toFixed(2)}</strong> for {formatLength(t.length)}
      <span className="text-muted-foreground"> · extends to </span>
      {formatDate(t.extendedTo)}
    </>
  );
}

function renderEvent(e) {
  const label = EVENT_LABELS[e.type] || e.type;
  if (e.type === 'password_reset') {
    return <>{label}{e.performedByName ? ` (@${e.performedByName})` : ''}</>;
  }
  return label;
}
