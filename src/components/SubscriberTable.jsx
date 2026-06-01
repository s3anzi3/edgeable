import { useMemo, useState } from 'react';
import { computeStatus, formatDate, toDate, TONE_BADGE } from '../utils/subscription.js';
import { useIsMobile } from '../utils/useMediaQuery.js';
import { Card } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';
import { Label } from './ui/label.jsx';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from './ui/table.jsx';

const COLUMNS = [
  { key: 'displayName',       label: 'Name' },
  { key: 'email',             label: 'Email' },
  { key: 'plan',              label: 'Plan' },
  { key: 'subscriptionStart', label: 'Started',   type: 'date' },
  { key: 'subscriptionEnd',   label: 'Ends',      type: 'date' },
  { key: 'daysLeft',          label: 'Days Left', type: 'days' },
  { key: 'statusLabel',       label: 'Status',    type: 'status' },
];

const FILTERS = ['All', 'Active', 'Expiring Soon', 'Expiring Very Soon', 'Expired', 'Paused', 'Inactive', 'Unknown'];

const SELECT_CLS = 'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

export default function SubscriberTable({ subscribers, onRowClick, filter: filterProp, onFilterChange }) {
  const [sortKey, setSortKey] = useState('subscriptionEnd');
  const [sortDir, setSortDir] = useState('asc');
  const [internalFilter, setInternalFilter] = useState('All');
  const filter = filterProp ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  const isMobile = useIsMobile();

  const enriched = useMemo(
    () =>
      subscribers.map((s) => {
        const summary = computeStatus(s.status, s.subscriptionEnd);
        return {
          ...s,
          daysLeft: summary.daysLeft,
          statusLabel: summary.label,
          statusTone: summary.tone,
        };
      }),
    [subscribers]
  );

  const filtered = useMemo(
    () => (filter === 'All' ? enriched : enriched.filter((s) => s.statusLabel === filter)),
    [enriched, filter]
  );

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] space-y-1">
          <Label htmlFor="st-filter" className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</Label>
          <select id="st-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className={SELECT_CLS}>
            {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {isMobile && (
          <div className="min-w-[140px] space-y-1">
            <Label htmlFor="st-sort" className="text-[11px] uppercase tracking-wider text-muted-foreground">Sort</Label>
            <select
              id="st-sort"
              value={`${sortKey}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(':');
                setSortKey(k); setSortDir(d);
              }}
              className={SELECT_CLS}
            >
              {COLUMNS.map((c) => [
                <option key={`${c.key}:asc`} value={`${c.key}:asc`}>{c.label} ↑</option>,
                <option key={`${c.key}:desc`} value={`${c.key}:desc`}>{c.label} ↓</option>,
              ])}
            </select>
          </div>
        )}
        <span className="ml-auto self-center text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? 'subscriber' : 'subscribers'}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
          No subscribers match this filter.
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-2.5">
          {sorted.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={onRowClick ? () => onRowClick(s) : undefined}
              className="block w-full rounded-lg border border-border bg-card p-4 text-left card-glow transition-colors hover:bg-secondary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{s.displayName || 'Unnamed'}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.email}</div>
                </div>
                <Badge variant={TONE_BADGE[s.statusTone]}>{s.statusLabel}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-sm text-muted-foreground">
                <span>{s.plan || '—'}</span>
                {s.daysLeft != null && <><span className="text-muted-foreground/50">·</span><span>{s.daysLeft} day{s.daysLeft === 1 ? '' : 's'} left</span></>}
                <span className="text-muted-foreground/50">·</span>
                <span>Ends {formatDate(s.subscriptionEnd)}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} onClick={() => toggleSort(col.key)} className="cursor-pointer select-none whitespace-nowrap">
                    {col.label}
                    {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => (
                <TableRow
                  key={s.id}
                  onClick={onRowClick ? () => onRowClick(s) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {COLUMNS.map((col) => (
                    <TableCell key={col.key} className="py-3">
                      {renderCell(s, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function renderCell(row, col) {
  if (col.type === 'date') return formatDate(row[col.key]);
  if (col.type === 'days') return row.daysLeft == null ? '—' : row.daysLeft;
  if (col.type === 'status') {
    return <Badge variant={TONE_BADGE[row.statusTone]}>{row.statusLabel}</Badge>;
  }
  return row[col.key] || '—';
}

function sortValue(row, key) {
  const v = row[key];
  if (v == null) return null;
  if (key === 'subscriptionStart' || key === 'subscriptionEnd') {
    const d = toDate(v);
    return d ? d.getTime() : null;
  }
  if (typeof v === 'string') return v.toLowerCase();
  return v;
}
