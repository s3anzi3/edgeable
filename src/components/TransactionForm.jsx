import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import SubscriberPicker from './SubscriberPicker.jsx';
import LengthPicker from './LengthPicker.jsx';
import ImageUploader from './ImageUploader.jsx';
import { applyLength } from '../utils/dateMath.js';
import { toDate, formatDate } from '../utils/subscription.js';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Textarea } from './ui/textarea.jsx';

export default function TransactionForm({
  initial,           // { subscriberUid, length, price, notes, proofImageUrl } when editing
  lockSubscriber,    // disable subscriber picker
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const [subscriberUid, setSubscriberUid] = useState(initial?.subscriberUid || null);
  const [length, setLength] = useState(initial?.length || { years: 0, months: 1, weeks: 0 });
  const [price, setPrice] = useState(initial?.price ?? '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [subscriberDoc, setSubscriberDoc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!subscriberUid) {
        setSubscriberDoc(null);
        return;
      }
      const snap = await getDoc(doc(db, 'users', subscriberUid));
      if (!cancelled) {
        setSubscriberDoc(snap.exists() ? snap.data() : null);
      }
    })();
    return () => { cancelled = true; };
  }, [subscriberUid]);

  const preview = useMemo(() => {
    if (!subscriberDoc) return null;
    const today = new Date();
    const currentEnd = toDate(subscriberDoc.subscriptionEnd);
    const extendFrom = (currentEnd && currentEnd > today) ? currentEnd : today;
    const newEnd = applyLength(extendFrom, length);
    const expired = !currentEnd || currentEnd <= today;
    return { extendFrom, newEnd, expired, subscriberName: subscriberDoc.displayName };
  }, [subscriberDoc, length]);

  const isNew = !initial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!subscriberUid) { setError('Please select a subscriber.'); return; }
    if (length.years === 0 && length.months === 0 && length.weeks === 0) {
      setError('Please specify a length (at least one of years, months, or weeks).');
      return;
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      setError('Please enter a valid price.');
      return;
    }
    if (isNew && !imageFile) {
      setError('Please upload a proof image.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ subscriberUid, length, price, notes, imageFile });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Subscriber">
        <SubscriberPicker
          value={subscriberUid}
          onChange={setSubscriberUid}
          disabled={lockSubscriber}
        />
      </Field>

      <Field label="Length purchased">
        <LengthPicker value={length} onChange={setLength} />
      </Field>

      <Field label="Price ($)" htmlFor="tf-price">
        <Input
          id="tf-price"
          type="number" min="0" step="0.01"
          value={price} onChange={(e) => setPrice(e.target.value)}
          placeholder="49.99"
        />
      </Field>

      <Field label="Proof of payment">
        <ImageUploader
          value={imageFile}
          onChange={setImageFile}
          existingUrl={initial?.proofImageUrl}
        />
      </Field>

      <Field label="Notes (optional)" htmlFor="tf-notes">
        <Textarea
          id="tf-notes"
          value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Payment method, conversation reference, etc."
        />
      </Field>

      {preview && (
        <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Preview</div>
          <div>
            This will extend <strong className="font-medium">{preview.subscriberName || 'subscriber'}</strong>'s
            subscription from <strong className="font-medium">{formatDate(preview.extendFrom)}</strong>
            {preview.expired && <span className="italic text-muted-foreground"> (was expired — extending from today)</span>}
            {' '}to <strong className="font-medium">{formatDate(preview.newEnd)}</strong>.
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : (submitLabel || 'Save')}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
