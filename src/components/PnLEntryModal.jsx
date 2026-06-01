import { useEffect, useState } from 'react';
import { getPnLEntry, savePnLEntry } from '../utils/pnl.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Textarea } from './ui/textarea.jsx';

export default function PnLEntryModal({ dateId: initialDateId, admin, onClose, onSaved }) {
  const [dateId, setDateId] = useState(initialDateId);
  const [units, setUnits] = useState('');
  const [wins, setWins] = useState('');
  const [losses, setLosses] = useState('');
  const [pushes, setPushes] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getPnLEntry(dateId);
        if (cancelled) return;
        if (existing) {
          setUnits(String(existing.units ?? ''));
          setWins(existing.wins != null ? String(existing.wins) : '');
          setLosses(existing.losses != null ? String(existing.losses) : '');
          setPushes(existing.pushes != null ? String(existing.pushes) : '');
          setNotes(existing.notes || '');
        } else {
          setUnits(''); setWins(''); setLosses(''); setPushes(''); setNotes('');
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dateId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (units === '' || isNaN(Number(units))) {
      return setError('Units is required and must be a number.');
    }
    setSubmitting(true);
    try {
      await savePnLEntry({ dateId, units, wins, losses, pushes, notes, admin });
      if (onSaved) await onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>P&amp;L entry · {dateId}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pnl-date">Date</Label>
            <Input id="pnl-date" type="date" value={dateId} onChange={(e) => setDateId(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pnl-units">Units (e.g., 2.5 or -1.0)</Label>
            <Input
              id="pnl-units" type="number" step="0.01" value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="0" disabled={loading}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pnl-wins">Wins</Label>
              <Input id="pnl-wins" type="number" min="0" step="1" value={wins} onChange={(e) => setWins(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pnl-losses">Losses</Label>
              <Input id="pnl-losses" type="number" min="0" step="1" value={losses} onChange={(e) => setLosses(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pnl-pushes">Pushes</Label>
              <Input id="pnl-pushes" type="number" min="0" step="1" value={pushes} onChange={(e) => setPushes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pnl-notes">Notes (optional)</Label>
            <Textarea
              id="pnl-notes"
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything noteworthy about today"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loading}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
