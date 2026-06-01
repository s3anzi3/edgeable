import { CalendarDays, Clock } from 'lucide-react';
import { computeStatus, formatDate, toDate, TONE_BADGE, TONE_TEXT, TONE_BG } from '../utils/subscription.js';
import { Card, CardContent } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';
import { cn } from '../lib/utils.js';

export default function SubscriptionCard({ userDoc }) {
  if (!userDoc) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No subscription data found.
        </CardContent>
      </Card>
    );
  }

  const { displayName, plan, status, subscriptionStart, subscriptionEnd } = userDoc;
  const summary = computeStatus(status, subscriptionEnd);
  const { bigText, subText } = phrasing(summary);

  const start = toDate(subscriptionStart);
  const end = toDate(subscriptionEnd);
  const pct = progressPct(start, end);

  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'h-1 w-full',
          summary.tone === 'success' && 'bg-success',
          summary.tone === 'warning' && 'bg-warning',
          summary.tone === 'destructive' && 'bg-destructive',
          summary.tone === 'muted' && 'bg-muted',
        )}
        aria-hidden
      />
      <CardContent className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Subscription
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
              {displayName || 'Subscriber'}
            </h2>
            {plan && (
              <Badge variant="outline" className="mt-2">
                {plan}
              </Badge>
            )}
          </div>
          <Badge variant={TONE_BADGE[summary.tone]}>{summary.label}</Badge>
        </div>

        <div className="my-6 sm:my-7 text-center">
          <div className={cn('font-display font-semibold leading-none', TONE_TEXT[summary.tone])} style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)' }}>
            {bigText}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{subText}</div>
        </div>

        {pct != null && summary.tone !== 'muted' && (
          <div className="mb-6">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-all', TONE_BG[summary.tone])}
                style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <DateBlock icon={CalendarDays} label="Started" value={formatDate(subscriptionStart)} />
          <DateBlock icon={Clock} label="Ends" value={formatDate(subscriptionEnd)} />
        </div>
      </CardContent>
    </Card>
  );
}

function DateBlock({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function phrasing({ label, daysLeft }) {
  if (label === 'Inactive') {
    return { bigText: 'Inactive', subText: 'Submit a subscription request to activate.' };
  }
  if (label === 'Paused') {
    return { bigText: 'Paused', subText: 'Subscription is currently on hold.' };
  }
  if (label === 'Unknown') {
    return { bigText: '—', subText: 'No subscription on file.' };
  }
  if (label === 'Expired') {
    const ago = Math.abs(daysLeft);
    return { bigText: 'Expired', subText: `Ended ${ago} day${ago === 1 ? '' : 's'} ago.` };
  }
  return {
    bigText: `${daysLeft}`,
    subText: `day${daysLeft === 1 ? '' : 's'} left on your subscription`,
  };
}

function progressPct(start, end) {
  if (!start || !end) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = Date.now() - start.getTime();
  const remaining = total - elapsed;
  // We render REMAINING percentage (full bar = full subscription left)
  return Math.max(0, (remaining / total) * 100);
}
