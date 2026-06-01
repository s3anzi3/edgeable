import { useState } from 'react';
import { setSubscriptionDates } from '../utils/users.js';
import { toDate } from '../utils/subscription.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';

function pad(n) { return String(n).padStart(2, '0'); }
function toInputDate(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function SubscriptionDatesModal({ subscriber, onClose, onSaved }) {
  const [startDate, setStartDate] = useState(toInputDate(subscriber.subscriptionStart));
  const [endDate, setEndDate] = useState(toInputDate(subscriber.subscriptionEnd));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await setSubscriptionDates(subscriber.id, { startDate, endDate });
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
          <DialogTitle>Edit subscription dates</DialogTitle>
          <DialogDescription>
            Use this for legacy clients — set when they originally joined so their dashboard shows
            performance from that date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sd-start">Member since</Label>
            <Input id="sd-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Controls the “performance since you joined” window the subscriber sees. Set to e.g. May 1
              to include pre-launch results.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sd-end">Subscription ends</Label>
            <Input id="sd-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Their access / expiry date (inclusive). A future date marks them <strong>Active</strong>.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Recording future renewal payments still works normally and will extend from this end date.
            Leave a field blank to clear it.
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save dates'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
