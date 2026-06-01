import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import {
  getRecentPnL, deletePnLEntry, summarizePnL, todayDocId,
  unitsColor, formatUnits,
} from '../../utils/pnl.js';
import { formatDate } from '../../utils/subscription.js';
import PnLEntryModal from '../../components/PnLEntryModal.jsx';
import BulkPnLModal from '../../components/BulkPnLModal.jsx';
import AppShell, { PageHeader } from '../../components/AppShell.jsx';
import { Card, CardContent } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { cn } from '../../lib/utils.js';

export default function PnLManager() {
  const { currentUser, userDoc } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showBulk, setShowBulk] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRecentPnL(60);
      setEntries(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const summary = summarizePnL(entries);
  const tId = todayDocId();
  const todayEntered = entries.some(e => e.id === tId);

  const adminPayload = {
    uid: currentUser?.uid,
    email: userDoc?.telegramUsername || currentUser?.email || '',
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete the P&L entry for ${id}?`)) return;
    try {
      await deletePnLEntry(id);
      await reload();
    } catch (e) {
      alert(`Failed: ${e.message}`);
    }
  };

  return (
    <AppShell container="medium">
      <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <PageHeader
        title="Daily P&L"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowBulk(true)}>
              Add summary
            </Button>
            <Button onClick={() => setEditingId(tId)}>
              {todayEntered ? "Edit today's entry" : "Add today's entry"}
            </Button>
          </>
        }
      />

      {!loading && entries.length > 0 && (
        <Card className="mb-5">
          <CardContent className="flex flex-wrap gap-8 p-5 sm:p-6">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Last {summary.days} day{summary.days === 1 ? '' : 's'}
              </div>
              <div className={cn('mt-1 font-display text-2xl font-bold', unitsColor(summary.totalUnits))}>
                {formatUnits(summary.totalUnits)}
              </div>
            </div>
            {(summary.wins + summary.losses + summary.pushes) > 0 && (
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Record</div>
                <div className="mt-1 font-display text-2xl font-bold">
                  {summary.wins}W-{summary.losses}L-{summary.pushes}P
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-muted-foreground">
          No P&amp;L entries yet. Click "Add today's entry" above to start tracking.
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">{formatDate(e.date)}</div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-3">
                <span className={cn('text-lg font-semibold', unitsColor(e.units))}>
                  {formatUnits(e.units)}
                </span>
                {(e.wins != null || e.losses != null || e.pushes != null) && (
                  <span className="text-sm text-muted-foreground">
                    {(e.wins || 0)}W-{(e.losses || 0)}L-{(e.pushes || 0)}P
                  </span>
                )}
              </div>
              {e.notes && <div className="mt-1 text-sm italic text-muted-foreground">{e.notes}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingId(e.id)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>

      {editingId && (
        <PnLEntryModal
          dateId={editingId}
          admin={adminPayload}
          onClose={() => setEditingId(null)}
          onSaved={reload}
        />
      )}

      {showBulk && (
        <BulkPnLModal
          admin={adminPayload}
          onClose={() => setShowBulk(false)}
          onSaved={reload}
        />
      )}
    </AppShell>
  );
}
