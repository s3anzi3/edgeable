import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, Inbox, LineChart, Plus, BookOpen } from 'lucide-react';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import AppShell, { PageHeader } from '../components/AppShell.jsx';
import SubscriberTable from '../components/SubscriberTable.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Badge } from '../components/ui/badge.jsx';
import {
  computeStatus, formatDate, formatDateTime, toDate, TONE_TEXT, TONE_BADGE,
} from '../utils/subscription.js';
import { formatLength } from '../utils/dateMath.js';
import { deleteSubscriberAccount } from '../utils/users.js';
import { cn } from '../lib/utils.js';

export default function Admin() {
  const { userDoc } = useAuth();
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState([]);
  const [recentTxns, setRecentTxns] = useState([]);
  const [monthTxns, setMonthTxns] = useState([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableFilter, setTableFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [subSnap, recentSnap, monthSnap, pendingProfileCount, pendingTxnCount] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'user'))),
          getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(
            collection(db, 'transactions'),
            where('createdAt', '>=', Timestamp.fromDate(monthStart)),
            orderBy('createdAt', 'desc')
          )),
          getCountFromServer(query(
            collection(db, 'profileChangeRequests'),
            where('status', '==', 'pending')
          )).then(s => s.data().count).catch(() => 0),
          getCountFromServer(query(
            collection(db, 'transactionRequests'),
            where('status', '==', 'pending')
          )).then(s => s.data().count).catch(() => 0),
        ]);
        if (cancelled) return;
        setSubscribers(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRecentTxns(recentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMonthTxns(monthSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPendingRequestCount(pendingProfileCount + pendingTxnCount);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => bucketByStatus(subscribers), [subscribers]);
  const expiringSoon = useMemo(() => pickExpiringSoon(subscribers, 14), [subscribers]);
  const pendingActivation = useMemo(() => pickPendingActivation(subscribers), [subscribers]);
  const dormant = useMemo(() => pickDormant(subscribers), [subscribers]);

  const handleDeleteDormant = async (s) => {
    const name = s.displayName || s.telegramUsername || 'this account';
    if (!window.confirm(`Delete ${name}? This can't be undone. Recorded transactions are kept.`)) return;
    try {
      await deleteSubscriberAccount(s.id);
      setSubscribers((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  };
  const monthRevenue = useMemo(
    () => monthTxns.reduce((s, t) => s + (Number(t.price) || 0), 0),
    [monthTxns]
  );

  const handleStatClick = (filter) => {
    setTableFilter(prev => (prev === filter ? 'All' : filter));
    document.getElementById('subscribers-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const firstName = (userDoc?.displayName || userDoc?.telegramUsername || 'Admin').split(' ')[0];

  const navActions = (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link to="/guide"><BookOpen className="h-4 w-4" /> Guide</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/admin/pnl"><LineChart className="h-4 w-4" /> Daily P&amp;L</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/admin/requests" className="relative">
          <Inbox className="h-4 w-4" /> Requests
          {pendingRequestCount > 0 && (
            <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
              {pendingRequestCount}
            </Badge>
          )}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/admin/transactions"><Receipt className="h-4 w-4" /> All Transactions</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/admin/transactions/new"><Plus className="h-4 w-4" /> New Transaction</Link>
      </Button>
    </>
  );

  return (
    <AppShell container="wide">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`Signed in as @${userDoc?.telegramUsername || 'admin'}`}
        actions={navActions}
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading dashboard…</div>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Active" value={counts.active} sublabel="paying customers"
              tone="success" filter="Active"
              current={tableFilter} onClick={handleStatClick}
            />
            <StatCard
              label="Expiring Soon" value={counts.expiring} sublabel="within 2 weeks"
              tone="warning" filter="Expiring Soon"
              current={tableFilter} onClick={handleStatClick}
            />
            <StatCard
              label="Expired" value={counts.expired} sublabel="recently churned"
              tone="destructive" filter="Expired"
              current={tableFilter} onClick={handleStatClick}
            />
            <StatCard
              label="Inactive" value={counts.inactive} sublabel="awaiting / churned"
              tone="muted" filter="Inactive"
              current={tableFilter} onClick={handleStatClick}
            />
          </section>

          {pendingActivation.length > 0 && (
            <section className="mb-6">
              <SectionCard title={`Pending activation (${pendingActivation.length})`} accent="warning">
                <p className="mb-3 text-sm text-muted-foreground">
                  These subscribers signed up but haven't been activated yet. Process their first
                  payment to flip them to <strong className="text-foreground">Active</strong>.
                </p>
                <ul className="m-0 list-none p-0">
                  {pendingActivation.map(s => (
                    <li key={s.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/subscribers/${s.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-sm font-medium">{s.displayName || 'Unnamed'}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          @{s.telegramUsername} · {s.phone ? formatPhone(s.phone) : 'no phone'}
                        </div>
                      </button>
                      <Button size="sm" asChild>
                        <Link to={`/admin/transactions/new?subscriber=${s.id}`}>Process payment</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </section>
          )}

          {dormant.length > 0 && (
            <section className="mb-6">
              <SectionCard title={`Dormant · inactive 6+ months (${dormant.length})`} accent="muted">
                <p className="mb-3 text-sm text-muted-foreground">
                  No active subscription for over 6 months. Consider deleting to keep your list clean —
                  recorded transactions are kept either way.
                </p>
                <ul className="m-0 list-none p-0">
                  {dormant.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/subscribers/${s.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-sm font-medium">{s.displayName || 'Unnamed'}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {s.telegramUsername ? `@${s.telegramUsername}` : (s.email || '—')}
                          {' · last active '}{formatDate(s.subscriptionEnd || s.createdAt)}
                        </div>
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDormant(s)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </section>
          )}

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Expiring in the next 14 days">
              {expiringSoon.length === 0 ? (
                <div className="py-2 text-sm text-muted-foreground">Nothing expiring in the next two weeks. Nice.</div>
              ) : (
                <ul className="m-0 list-none p-0">
                  {expiringSoon.map(s => {
                    const summary = computeStatus(s.status, s.subscriptionEnd);
                    return (
                      <li
                        key={s.id}
                        className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
                        onClick={() => navigate(`/admin/subscribers/${s.id}`)}
                      >
                        <div>
                          <div className="text-sm font-medium">{s.displayName || 'Unnamed'}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">@{s.telegramUsername || '—'}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant={TONE_BADGE[summary.tone]}>
                            {summary.daysLeft} day{summary.daysLeft === 1 ? '' : 's'}
                          </Badge>
                          <div className="mt-1 text-xs text-muted-foreground">{formatDate(s.subscriptionEnd)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="This month"
              rightSlot={
                <Link to="/admin/transactions" className="text-sm font-medium text-primary hover:underline">
                  View all →
                </Link>
              }
            >
              <div className="font-display text-3xl font-bold leading-none">${monthRevenue.toFixed(2)}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">
                {monthTxns.length} transaction{monthTxns.length === 1 ? '' : 's'}
              </div>
              <div className="my-4 border-t border-border" />
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Recent activity
              </div>
              {recentTxns.length === 0 ? (
                <div className="py-2 text-sm text-muted-foreground">No transactions yet.</div>
              ) : (
                <ul className="m-0 list-none p-0">
                  {recentTxns.map(t => (
                    <li
                      key={t.id}
                      className="cursor-pointer border-b border-border/60 py-2.5 text-sm last:border-0"
                      onClick={() => navigate(`/admin/transactions/${t.id}/edit`)}
                    >
                      <div className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div>
                      <div className="mt-0.5">
                        <strong className="font-medium">{t.subscriberDisplayName || 'Unknown'}</strong>
                        {' · '}${Number(t.price).toFixed(2)}
                        {' · '}{formatLength(t.length)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </section>

          <section id="subscribers-section">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">All subscribers</h2>
              <span className="text-sm text-muted-foreground">{subscribers.length} total</span>
            </div>
            <SubscriberTable
              subscribers={subscribers}
              filter={tableFilter}
              onFilterChange={setTableFilter}
              onRowClick={(s) => navigate(`/admin/subscribers/${s.id}`)}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}

function bucketByStatus(subs) {
  const counts = { active: 0, expiring: 0, expired: 0, paused: 0, inactive: 0 };
  for (const s of subs) {
    const summary = computeStatus(s.status, s.subscriptionEnd);
    switch (summary.label) {
      case 'Inactive': counts.inactive++; break;
      case 'Paused':   counts.paused++; break;
      case 'Expired':  counts.expired++; break;
      case 'Expiring Soon':
      case 'Expiring Very Soon': counts.expiring++; break;
      case 'Active':   counts.active++; break;
      default: break;
    }
  }
  return counts;
}

function pickExpiringSoon(subs, withinDays) {
  return subs
    .map(s => ({ s, summary: computeStatus(s.status, s.subscriptionEnd) }))
    .filter(({ summary }) => summary.daysLeft != null && summary.daysLeft > 0 && summary.daysLeft <= withinDays)
    .sort((a, b) => a.summary.daysLeft - b.summary.daysLeft)
    .slice(0, 6)
    .map(({ s }) => s);
}

function pickDormant(subs) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 182; // ~6 months
  const lastActive = (s) => Math.max(
    toDate(s.subscriptionEnd)?.getTime() || 0,
    toDate(s.createdAt)?.getTime() || 0,
  );
  return subs
    .filter((s) => {
      const summary = computeStatus(s.status, s.subscriptionEnd);
      // Skip anyone currently active or close to expiring.
      if (['Active', 'Expiring Soon', 'Expiring Very Soon'].includes(summary.label)) return false;
      const last = lastActive(s);
      return last > 0 && last < cutoff;
    })
    .sort((a, b) => lastActive(a) - lastActive(b)); // most stale first
}

function pickPendingActivation(subs) {
  // Inactive subscribers who have never had a subscription (no subscriptionEnd) — i.e., fresh signups
  return subs
    .filter(s => s.status === 'inactive' && !s.subscriptionEnd)
    .sort((a, b) => {
      const ta = toDate(a.createdAt)?.getTime() || 0;
      const tb = toDate(b.createdAt)?.getTime() || 0;
      return tb - ta;
    });
}

function formatPhone(digits) {
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `+${digits}`;
}

const STAT_RING = {
  success: 'ring-success border-success/50',
  warning: 'ring-warning border-warning/50',
  destructive: 'ring-destructive border-destructive/50',
  muted: 'ring-muted-foreground border-muted-foreground/40',
};

function StatCard({ label, value, sublabel, tone, filter, current, onClick }) {
  const active = current === filter;
  return (
    <button
      type="button"
      onClick={() => onClick(filter)}
      className={cn(
        'rounded-lg border border-border bg-card p-4 text-left transition-all card-glow hover:border-foreground/20 sm:p-5',
        active && cn('ring-2 ring-offset-2 ring-offset-background', STAT_RING[tone]),
      )}
    >
      <div className={cn('font-display text-3xl font-bold leading-none sm:text-4xl', TONE_TEXT[tone])}>
        {value}
      </div>
      <div className="mt-2 text-sm font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </button>
  );
}

const ACCENT_BG = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

function SectionCard({ title, rightSlot, accent, children }) {
  return (
    <Card className="overflow-hidden">
      {accent && <div className={cn('h-1 w-full', ACCENT_BG[accent])} aria-hidden />}
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
          {rightSlot}
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}
