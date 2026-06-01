import { useState } from 'react';
import { createProfileChangeRequest } from '../utils/profileRequests.js';
import {
  normalizePhone, isValidPhone,
  normalizeEmail, isValidEmail,
  normalizeTelegramUsername, isValidTelegramUsername,
} from '../utils/auth.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Textarea } from './ui/textarea.jsx';

const SELECT_CLS = 'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

const FIELDS = [
  { key: 'displayName', label: 'Display name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone number' },
  { key: 'telegramUsername', label: 'Telegram username' },
];

const REASONS = {
  displayName: ['Spelling correction', 'Updated name', 'Other'],
  email: ['Got a new email', 'Original was wrong', 'Other'],
  phone: ['Got a new phone', 'Original was wrong', 'Other'],
  telegramUsername: ['Changed my Telegram handle', 'Original was wrong', 'Other'],
};

export default function RequestProfileUpdateModal({ uid, userDoc, onClose, onSubmitted }) {
  const [field, setField] = useState('displayName');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState(REASONS.displayName[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFieldChange = (newField) => {
    setField(newField);
    setReason(REASONS[newField][0]);
    setProposedValue('');
    setError('');
  };

  const currentValue = userDoc?.[field] || '';
  const displayCurrent = !currentValue
    ? '(empty)'
    : field === 'phone'
    ? `+${currentValue}`
    : field === 'telegramUsername'
    ? `@${currentValue}`
    : currentValue;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let valueToSubmit = proposedValue.trim();
    if (!valueToSubmit) return setError('Please enter the new value.');

    if (field === 'phone') {
      const normalized = normalizePhone(valueToSubmit);
      if (!isValidPhone(normalized)) return setError('Phone must be 7-15 digits.');
      valueToSubmit = normalized;
    } else if (field === 'email') {
      const normalized = normalizeEmail(valueToSubmit);
      if (!isValidEmail(normalized)) return setError('Please enter a valid email address.');
      valueToSubmit = normalized;
    } else if (field === 'telegramUsername') {
      const normalized = normalizeTelegramUsername(valueToSubmit);
      if (!isValidTelegramUsername(normalized)) {
        return setError('Telegram username must be 5-32 chars: letters, numbers, or underscore.');
      }
      valueToSubmit = normalized;
    }

    if (valueToSubmit === currentValue) {
      return setError('That\'s the same as your current value.');
    }

    setSubmitting(true);
    try {
      await createProfileChangeRequest({
        subscriberUid: uid,
        subscriberDisplayName: userDoc.displayName,
        field,
        currentValue,
        proposedValue: valueToSubmit,
        reason,
        notes,
      });
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to submit request.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a profile update</DialogTitle>
          <DialogDescription>
            The admin will review your request and apply the change.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pu-field">What do you want to change?</Label>
            <select id="pu-field" value={field} onChange={(e) => handleFieldChange(e.target.value)} className={SELECT_CLS}>
              {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>

          <div className="rounded-md border border-border bg-secondary/50 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current</div>
            <div className="mt-0.5 text-sm">{displayCurrent}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pu-value">New value</Label>
            <Input
              id="pu-value"
              type={field === 'phone' ? 'tel' : field === 'email' ? 'email' : 'text'}
              value={proposedValue}
              onChange={(e) => setProposedValue(e.target.value)}
              maxLength={field === 'telegramUsername' ? 33 : field === 'email' ? 254 : 100}
              placeholder={
                field === 'phone' ? '+1 555 123 4567'
                : field === 'email' ? 'you@example.com'
                : field === 'telegramUsername' ? '@yourname'
                : 'Your new display name'
              }
              autoCapitalize="off"
              autoCorrect="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pu-reason">Reason</Label>
            <select id="pu-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={SELECT_CLS}>
              {REASONS[field].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pu-notes">Notes (optional)</Label>
            <Textarea
              id="pu-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything else the admin should know"
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
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
