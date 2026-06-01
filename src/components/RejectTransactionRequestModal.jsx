import { useState } from 'react';
import { rejectTransactionRequest } from '../utils/transactionRequests.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Label } from './ui/label.jsx';
import { Textarea } from './ui/textarea.jsx';

const COMMON_REASONS = [
  'Proof image is unreadable',
  'Proof image doesn\'t match the claim',
  'Payment not received',
  'Other',
];

const SELECT_CLS = 'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

export default function RejectTransactionRequestModal({ request, admin, onClose, onDone }) {
  const [reasonChoice, setReasonChoice] = useState(COMMON_REASONS[0]);
  const [extraDetail, setExtraDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const finalReason = reasonChoice === 'Other'
      ? extraDetail.trim()
      : (extraDetail.trim() ? `${reasonChoice} — ${extraDetail.trim()}` : reasonChoice);
    if (!finalReason) return setError('Please provide a reason (the subscriber will see this).');
    setSubmitting(true);
    try {
      await rejectTransactionRequest(request.id, finalReason, admin);
      if (onDone) await onDone();
      onClose();
    } catch (e) {
      setError(e.message || 'Reject failed.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject request</DialogTitle>
          <DialogDescription>
            The subscriber will see the reason on their portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rj-reason">Reason</Label>
            <select id="rj-reason" value={reasonChoice} onChange={(e) => setReasonChoice(e.target.value)} className={SELECT_CLS}>
              {COMMON_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rj-detail">
              {reasonChoice === 'Other' ? 'Please explain' : 'Extra detail (optional)'}
            </Label>
            <Textarea
              id="rj-detail"
              value={extraDetail} onChange={(e) => setExtraDetail(e.target.value)}
              rows={3}
              placeholder={reasonChoice === 'Other'
                ? 'Required — the subscriber will see this'
                : 'Add anything specific'}
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
            <Button variant="destructive" type="submit" disabled={submitting}>
              {submitting ? 'Rejecting…' : 'Reject request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
