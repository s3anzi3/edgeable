import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { getAllTransactions } from '../../utils/transactions.js';
import { formatDateTime, toDate } from '../../utils/subscription.js';
import { formatLength } from '../../utils/dateMath.js';
import { useIsMobile } from '../../utils/useMediaQuery.js';
import AppShell, { PageHeader } from '../../components/AppShell.jsx';
import { Card } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '../../components/ui/table.jsx';
import ProofImage from '../../components/ProofImage.jsx';

export default function AllTransactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toFilterDate, setToFilterDate] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getAllTransactions();
        if (!cancelled) setTxns(all);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toFilterDate ? new Date(toFilterDate + 'T23:59:59') : null;
    return txns.filter((t) => {
      if (q) {
        const hay = `${t.subscriberDisplayName || ''} ${t.subscriberEmail || ''} ${t.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const d = toDate(t.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [txns, search, fromDate, toFilterDate]);

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, t) => sum + (Number(t.price) || 0), 0),
    [filtered]
  );

  return (
    <AppShell container="wide">
      <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <PageHeader
        title="All Transactions"
        actions={
          <Button asChild>
            <Link to="/admin/transactions/new"><Plus className="h-4 w-4" /> New Transaction</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          type="text" placeholder="Search by subscriber or notes"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 space-y-1" style={{ minWidth: '140px' }}>
            <Label htmlFor="at-from" className="text-[11px] uppercase tracking-wider text-muted-foreground">From</Label>
            <Input id="at-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1" style={{ minWidth: '140px' }}>
            <Label htmlFor="at-to" className="text-[11px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Input id="at-to" type="date" value={toFilterDate} onChange={(e) => setToFilterDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        {filtered.length} transaction{filtered.length === 1 ? '' : 's'} · Total: <strong className="text-foreground">${totalRevenue.toFixed(2)}</strong>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && (
        filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-muted-foreground">
            No transactions match these filters.
          </div>
        ) : isMobile ? (
          <MobileCards txns={filtered} />
        ) : (
          <DesktopTable txns={filtered} />
        )
      )}
    </AppShell>
  );
}

function MobileCards({ txns }) {
  return (
    <div className="flex flex-col gap-2.5">
      {txns.map((t) => (
        <Link
          key={t.id}
          to={`/admin/transactions/${t.id}/edit`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 card-glow transition-colors hover:bg-secondary/40"
        >
          {t.proofImageUrl && (
            <img src={t.proofImageUrl} alt="proof" className="h-13 w-13 shrink-0 rounded-md bg-muted object-cover" style={{ width: 52, height: 52 }} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div>
            <div className="mt-0.5 truncate text-sm font-semibold">{t.subscriberDisplayName || '—'}</div>
            <div className="truncate text-xs text-muted-foreground">{t.subscriberEmail}</div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-sm">
              <strong className="font-semibold">${Number(t.price).toFixed(2)}</strong>
              <span className="text-muted-foreground/50">·</span>
              {formatLength(t.length)}
            </div>
            {t.notes && <div className="mt-1 truncate text-xs italic text-muted-foreground">{t.notes}</div>}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function DesktopTable({ txns }) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Subscriber</TableHead>
            <TableHead>Length</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Proof</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txns.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="py-3 align-top whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
              <TableCell className="py-3 align-top">
                <Link to={`/admin/subscribers/${t.subscriberUid}`} className="text-primary hover:underline">
                  {t.subscriberDisplayName || '—'}
                </Link>
                <div className="text-xs text-muted-foreground">{t.subscriberEmail}</div>
              </TableCell>
              <TableCell className="py-3 align-top">{formatLength(t.length)}</TableCell>
              <TableCell className="py-3 align-top">${Number(t.price).toFixed(2)}</TableCell>
              <TableCell className="py-3 align-top">
                {t.proofImageUrl && (
                  <ProofImage url={t.proofImageUrl} thumbClassName="h-10 w-10" />
                )}
              </TableCell>
              <TableCell className="max-w-[220px] py-3 align-top text-sm text-muted-foreground">
                {t.notes || '—'}
              </TableCell>
              <TableCell className="py-3 align-top">
                <Link to={`/admin/transactions/${t.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
