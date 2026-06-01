import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RotateCcw, ChevronRight, CalendarCog, Trash2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { getSubscriberTransactions } from '../../utils/transactions.js';
import { getSubscriberEvents, EVENT_LABELS } from '../../utils/accountEvents.js';
import { setUserStatus, deleteSubscriberAccount } from '../../utils/users.js';
import { computeStatus, formatDate, formatDateTime, TONE_BADGE } from '../../utils/subscription.js';
import { formatLength } from '../../utils/dateMath.js';
import EditProfileSection from '../../components/EditProfileSection.jsx';
import AdminResetPasswordModal from '../../components/AdminResetPasswordModal.jsx';
import SubscriptionDatesModal from '../../components/SubscriptionDatesModal.jsx';
import AppShell, { PageHeader } from '../../components/AppShell.jsx';
import { Card, CardContent } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function SubscriberDetail() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [subscriber, setSubscriber] = useState(null);
  const [txns, setTxns] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [userSnap, transactions, evts] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getSubscriberTransactions(uid),
        getSubscriberEvents(uid),
      ]);
      if (!userSnap.exists()) {
        setError('Subscriber not found.');
      } else {
        setSubscriber({ id: userSnap.id, ...userSnap.data() });
        setTxns(transactions);
        setEvents(evts);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [userSnap, transactions, evts] = await Promise.all([
          getDoc(doc(db, 'users', uid)),
          getSubscriberTransactions(uid),
          getSubscriberEvents(uid),
        ]);
        if (cancelled) return;
        if (!userSnap.exists()) setError('Subscriber not found.');
        else {
          setSubscriber({ id: userSnap.id, ...userSnap.data() });
          setTxns(transactions);
          setEvents(evts);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const handleSetStatus = async (newStatus) => {
    if (!window.confirm(`Set ${subscriber.displayName || 'this subscriber'} to "${newStatus}"?`)) {
      return;
    }
    setStatusUpdating(true);
    try {
      await setUserStatus(uid, newStatus);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    const name = subscriber.displayName || subscriber.telegramUsername || 'this subscriber';
    if (!window.confirm(
      `Permanently delete ${name}?\n\nThis removes their login, profile, pending requests, and history. ` +
      `Recorded transactions are kept for your records. This cannot be undone.`
    )) return;
    setDeleting(true);
    try {
      await deleteSubscriberAccount(uid);
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(e.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  if (loading) return <Centered>Loading…</Centered>;
  if (error) return <Centered><div className="text-destructive">{error}</div></Centered>;

  const summary = computeStatus(subscriber.status, subscriber.subscriptionEnd);
  const isInactive = subscriber.status === 'inactive';

  return (
    <AppShell container="medium">
      <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <PageHeader
        title={subscriber.displayName || 'Unnamed'}
        description={subscriber.email}
        actions={
          <Button asChild>
            <Link to={`/admin/transactions/new?subscriber=${uid}`}><Plus className="h-4 w-4" /> New Transaction</Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4 sm:p-6">
          <Stat label="Status" value={<Badge variant={TONE_BADGE[summary.tone]}>{summary.label}</Badge>} />
          <Stat label="Plan" value={subscriber.plan || '—'} />
          <Stat label="Started" value={formatDate(subscriber.subscriptionStart)} />
          <Stat label="Ends" value={formatDate(subscriber.subscriptionEnd)} />
        </CardContent>
      </Card>

      <EditProfileSection subscriber={subscriber} onUpdated={reload} />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        {isInactive ? (
          <Button
            onClick={() => handleSetStatus('active')}
            disabled={statusUpdating}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <RotateCcw className="h-4 w-4" /> Reactivate subscriber
          </Button>
        ) : (
          <Button variant="outline" onClick={() => handleSetStatus('inactive')} disabled={statusUpdating}>
            Mark as inactive
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowDates(true)}>
          <CalendarCog className="h-4 w-4" /> Edit dates
        </Button>
        <Button variant="outline" onClick={() => setShowResetPwd(true)}>
          Reset password
        </Button>
        <span className="text-xs text-muted-foreground">
          {isInactive
            ? 'Recording a new transaction will also reactivate them automatically.'
            : 'Use this when a subscriber has churned and isn\'t coming back.'}
        </span>
      </div>

      {showResetPwd && (
        <AdminResetPasswordModal
          subscriber={subscriber}
          onClose={() => setShowResetPwd(false)}
        />
      )}

      {showDates && (
        <SubscriptionDatesModal
          subscriber={subscriber}
          onClose={() => setShowDates(false)}
          onSaved={reload}
        />
      )}

      <div className="mt-10 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="font-display font-semibold text-destructive">Danger zone</h3>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Permanently delete this subscriber's account — login, profile, pending requests, and history.
          Recorded transactions are kept for your records. This can't be undone.
        </p>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : 'Delete account'}
        </Button>
      </div>

      {events.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Account events ({events.length})
          </h2>
          <ul className="m-0 mb-6 flex list-none flex-col gap-2 p-0">
            {events.map(e => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
                <div className="text-sm">
                  {EVENT_LABELS[e.type] || e.type}
                  {e.performedByName && <span className="text-muted-foreground"> · @{e.performedByName}</span>}
                </div>
                <div className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
        Transactions ({txns.length})
      </h2>

      {txns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
          No transactions recorded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {txns.map((t) => (
            <Link
              key={t.id}
              to={`/admin/transactions/${t.id}/edit`}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 card-glow transition-colors hover:bg-secondary/40"
            >
              {t.proofImageUrl && (
                <img src={t.proofImageUrl} alt="proof" className="rounded-md bg-muted object-cover" style={{ width: 64, height: 64 }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div>
                <div className="mt-0.5 text-sm">
                  <strong className="font-semibold">${Number(t.price).toFixed(2)}</strong>
                  {' · '}{formatLength(t.length)}
                  {' · '}extended {formatDate(t.extendedFrom)} → {formatDate(t.extendedTo)}
                </div>
                {t.notes && <div className="mt-1 text-sm italic text-muted-foreground">{t.notes}</div>}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Centered({ children }) {
  return <div className="py-16 text-center text-muted-foreground">{children}</div>;
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-base">{value}</div>
    </div>
  );
}
