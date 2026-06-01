import { useEffect, useMemo, useState } from 'react';
import { getAllPnL, summarizePnL, unitsColor, formatUnits } from '../utils/pnl.js';
import { toDate, formatDate } from '../utils/subscription.js';
import { updateMyUnitSize } from '../utils/users.js';
import PerformanceChart from './PerformanceChart.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './ui/dialog.jsx';
import { cn } from '../lib/utils.js';

function formatDollars(n) {
  const v = Number(n) || 0;
  const sign = v >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function cumulative(entries) {
  const asc = [...entries].sort((a, b) => {
    const da = toDate(a.date)?.getTime() || 0;
    const db = toDate(b.date)?.getTime() || 0;
    return da - db;
  });
  const points = [];
  let total = 0;
  for (const e of asc) { total += Number(e.units || 0); points.push(total); }
  return points;
}

const TITLE = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

const CHART_RANGES = [
  { key: 'week', label: 'Week', blurb: 'past week', days: 7 },
  { key: 'month', label: 'Month', blurb: 'past month', days: 30 },
  { key: '3m', label: '3M', blurb: 'past 3 months', days: 90 },
  { key: 'all', label: 'All', blurb: 'all time', days: null },
];

function CardFrame({ children }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}

export default function PerformanceCard({ uid, userDoc }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteFor, setNoteFor] = useState(null); // entry whose note is shown in the popup
  const [showAll, setShowAll] = useState(false); // full-history dialog
  const [chartRange, setChartRange] = useState('month');
  const [scope, setScope] = useState('yours'); // 'yours' | 'edgeable'
  const [hovered, setHovered] = useState(null); // scrubbed point { date, cum } or null
  const unitSize = Number(userDoc?.unitSize) > 0 ? Number(userDoc.unitSize) : 0;

  // Everyone can see the full track record, so always load all-time P&L.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllPnL();
        if (!cancelled) setEntries(data);
      } catch (e) {
        console.error('PerformanceCard load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const start = toDate(userDoc?.subscriptionStart);
  const subEnd = toDate(userDoc?.subscriptionEnd);
  const hasWindow = !!start;
  // Non-subscribers have no personal window, so they only ever see the overall view.
  const effectiveScope = hasWindow ? scope : 'edgeable';

  // "Yours" counts only days within the subscription window: from your start
  // through min(today, your end). Days outside that window don't count toward
  // your number (but the Edgeable scope shows everything).
  const personalEntries = useMemo(() => {
    if (!start) return [];
    const now = new Date();
    const end = subEnd && subEnd < now ? subEnd : now;
    return entries.filter((e) => {
      const d = toDate(e.date);
      return d && d >= start && d <= end;
    });
  }, [entries, start, subEnd]);

  const recent = entries.slice(0, 7);

  // Chart = selected scope (yours/edgeable), filtered to the selected lookback range.
  const chartEntries = useMemo(() => {
    const base = effectiveScope === 'yours' ? personalEntries : entries;
    const r = CHART_RANGES.find((x) => x.key === chartRange) || CHART_RANGES[3];
    const cutoff = r.days ? Date.now() - r.days * 86400000 : 0;
    return base.filter((e) => {
      const d = toDate(e.date);
      return d && d.getTime() >= cutoff;
    });
  }, [effectiveScope, personalEntries, entries, chartRange]);
  // Dated cumulative series for the interactive chart: [{ t, date, cum }] ascending.
  const chartSeries = useMemo(() => {
    const asc = [...chartEntries].sort(
      (a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0),
    );
    let total = 0;
    return asc.map((e) => {
      total += Number(e.units || 0);
      const d = toDate(e.date);
      return { t: d ? d.getTime() : 0, date: d, cum: total };
    });
  }, [chartEntries]);
  const chartSummary = useMemo(() => summarizePnL(chartEntries), [chartEntries]);
  const chartBlurb = CHART_RANGES.find((r) => r.key === chartRange)?.blurb || '';

  // Reset any active scrub when the data set changes (range/scope switch).
  useEffect(() => { setHovered(null); }, [chartRange, effectiveScope]);

  if (loading) {
    return (
      <CardFrame>
        <h3 className={TITLE}>Performance</h3>
        <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
      </CardFrame>
    );
  }

  const chartTotal = chartSummary.totalUnits;
  // When scrubbing the chart, the headline reflects the hovered point instead.
  const displayTotal = hovered ? hovered.cum : chartTotal;
  const dollarValue = effectiveScope === 'yours' && unitSize > 0 ? displayTotal * unitSize : null;
  const recorded = (chartSummary.wins + chartSummary.losses + chartSummary.pushes) > 0;
  const scopeTitle = effectiveScope === 'yours'
    ? 'Your performance'
    : (hasWindow ? 'Edgeable performance' : 'Edgeable track record');

  return (
    <CardFrame>
      {/* Scope: switch between the subscriber's own window and the overall record. */}
      {hasWindow && (
        <div className="mb-3 grid grid-cols-2 gap-0.5 rounded-md bg-secondary p-0.5">
          {[['yours', 'Yours'], ['edgeable', 'Edgeable']].map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setScope(k)}
              className={cn(
                'rounded px-3 py-1.5 text-sm transition-colors',
                effectiveScope === k
                  ? 'bg-card font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      <h3 className={TITLE}>{scopeTitle}</h3>

      {entries.length === 0 ? (
        <div className="mt-3 text-sm text-muted-foreground">
          No daily P&amp;L recorded yet. Check back soon.
        </div>
      ) : (
        <>
          <div className={cn('mt-2 font-display text-4xl font-bold leading-none', unitsColor(displayTotal))}>
            {formatUnits(displayTotal)}
            {dollarValue != null && (
              <span className="ml-2 text-xl font-semibold">{formatDollars(dollarValue)}</span>
            )}
          </div>

          <div className="mt-2 text-sm text-muted-foreground">
            {hovered ? (
              <span className="font-medium text-foreground/80">{formatDate(hovered.date)}</span>
            ) : (
              <>
                {chartBlurb} · {chartSummary.days} day{chartSummary.days === 1 ? '' : 's'}
                {recorded && <> · {chartSummary.wins}W-{chartSummary.losses}L-{chartSummary.pushes}P</>}
              </>
            )}
          </div>
          {!hasWindow && (
            <div className="mt-1 text-xs text-muted-foreground">
              Subscribe to start tracking your own performance.
            </div>
          )}

          {/* Range control + chart */}
          <div className="mt-4">
            <div className="mb-2 flex justify-end">
              <div className="flex gap-0.5 rounded-md bg-secondary p-0.5">
                {CHART_RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setChartRange(r.key)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs transition-colors',
                      chartRange === r.key
                        ? 'bg-card font-medium text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {chartSeries.length >= 2 ? (
              <PerformanceChart series={chartSeries} height={96} onScrub={setHovered} />
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Not enough data in this range yet.
              </div>
            )}
          </div>
        </>
      )}

      {hasWindow && <UnitSizeRow uid={uid} currentValue={unitSize} />}

      {recent.length > 0 && (
        <>
          <div className="my-4 border-t border-border" />
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent days
          </div>
          <ul className="m-0 list-none p-0">
            {recent.map((e) => (
              <DayRow key={e.id} e={e} unitSize={unitSize} hasWindow={hasWindow} onSeeNotes={setNoteFor} />
            ))}
          </ul>
          {entries.length > recent.length && (
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowAll(true)}>
              View all {entries.length} days
            </Button>
          )}
        </>
      )}

      {/* Single-day note popup */}
      <Dialog open={!!noteFor} onOpenChange={(o) => { if (!o) setNoteFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{noteFor ? `Notes · ${formatDate(noteFor.date)}` : 'Notes'}</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
            {noteFor?.notes}
          </p>
        </DialogContent>
      </Dialog>

      {/* Full history */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>All daily results ({entries.length})</DialogTitle>
          </DialogHeader>
          <ul className="m-0 max-h-[60vh] list-none overflow-y-auto p-0 pr-1">
            {entries.map((e) => (
              <DayRow key={e.id} e={e} unitSize={unitSize} hasWindow={hasWindow} onSeeNotes={setNoteFor} />
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </CardFrame>
  );
}

function DayRow({ e, unitSize, hasWindow, onSeeNotes }) {
  const dollar = hasWindow && unitSize > 0 ? Number(e.units || 0) * unitSize : null;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{formatDate(e.date)}</span>
        {e.notes && (
          <button
            type="button"
            onClick={() => onSeeNotes(e)}
            className="text-xs font-medium text-primary hover:underline"
          >
            (see notes)
          </button>
        )}
      </div>
      <span className={cn('text-sm font-semibold', unitsColor(e.units))}>
        {formatUnits(e.units)}
        {dollar != null && <span className="ml-2 font-medium opacity-85">{formatDollars(dollar)}</span>}
      </span>
    </li>
  );
}

function UnitSizeRow({ uid, currentValue }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue ? String(currentValue) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError('');
    const num = Number(value);
    if (isNaN(num) || num < 0) return setError('Enter a valid amount.');
    setSaving(true);
    try {
      await updateMyUnitSize(uid, num);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
      {!editing ? (
        <>
          <span className="text-foreground/80">
            Your unit size: {currentValue > 0 ? `$${currentValue.toFixed(2)}` : 'Not set'}
          </span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setEditing(true)}>
            {currentValue > 0 ? 'Change' : 'Set'}
          </Button>
          {currentValue === 0 && (
            <span className="text-xs text-muted-foreground">Set this to see dollar values</span>
          )}
        </>
      ) : (
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number" min="0" step="0.01"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              placeholder="50.00"
              autoFocus
              className="h-9 w-28 pl-6"
            />
          </div>
          <Button type="submit" size="sm" disabled={saving}>{saving ? '…' : 'Save'}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setError(''); }} disabled={saving}>
            Cancel
          </Button>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </form>
      )}
    </div>
  );
}
