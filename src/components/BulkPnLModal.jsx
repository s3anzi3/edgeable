import { useMemo, useState } from 'react';
import { savePnLEntry } from '../utils/pnl.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';

function pad(n) { return String(n).padStart(2, '0'); }
function toId(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromId(id) { return new Date(id + 'T00:00:00'); }
function shiftDays(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
function fmt(id) {
  const d = fromId(id);
  return isNaN(d) ? id : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
];

export default function BulkPnLModal({ admin, onClose, onSaved }) {
  const [from, setFrom] = useState(toId(shiftDays(-29)));
  const [to, setTo] = useState(toId(shiftDays(0)));
  const [units, setUnits] = useState('');
  const [wins, setWins] = useState('');
  const [losses, setLosses] = useState('');
  const [pushes, setPushes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rangeLabel = useMemo(() => `${fmt(from)} – ${fmt(to)}`, [from, to]);

  const setPreset = (days) => {
    setFrom(toId(shiftDays(-(days - 1))));
    setTo(toId(shiftDays(0)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (fromId(to) < fromId(from)) return setError('"To" must be on or after "From".');
    if (units === '' || isNaN(Number(units))) return setError('Enter the total units (e.g. 250 or -40).');

    const note = notes.trim() ? `${rangeLabel}: ${notes.trim()}` : `${rangeLabel} summary`;

    setSaving(true);
    try {
      // Stored as one P&L entry dated to the end of the period.
      await savePnLEntry({ dateId: to, units, wins, losses, pushes, notes: note, admin });
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save.');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a summary entry</DialogTitle>
          <DialogDescription>
            Log a whole stretch as one entry — e.g. the last 30 days as <strong>+250u, 154‑130‑15</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Period</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p.days} type="button" variant="outline" size="sm" onClick={() => setPreset(p.days)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="mt-1 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="sum-from" className="text-[11px] uppercase tracking-wider text-muted-foreground">From</Label>
                <Input id="sum-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10" />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="sum-to" className="text-[11px] uppercase tracking-wider text-muted-foreground">To</Label>
                <Input id="sum-to" type="date" value={to} max={toId(shiftDays(0))} onChange={(e) => setTo(e.target.value)} className="h-10" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sum-units">Total units</Label>
            <Input
              id="sum-units" type="number" step="0.01" inputMode="decimal"
              value={units} onChange={(e) => setUnits(e.target.value)}
              placeholder="+250"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sum-w">Wins</Label>
              <Input id="sum-w" type="number" min="0" step="1" value={wins} onChange={(e) => setWins(e.target.value)} placeholder="154" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sum-l">Losses</Label>
              <Input id="sum-l" type="number" min="0" step="1" value={losses} onChange={(e) => setLosses(e.target.value)} placeholder="130" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sum-p">Pushes</Label>
              <Input id="sum-p" type="number" min="0" step="1" value={pushes} onChange={(e) => setPushes(e.target.value)} placeholder="15" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sum-notes">Notes (optional)</Label>
            <Input id="sum-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. April results" />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Saved as a single entry dated <strong className="text-foreground">{fmt(to)}</strong>, labeled
            “{rangeLabel} summary”. Use a summary <em>instead of</em> daily entries for that span — don't log both,
            or the totals double-count.
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save summary'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
