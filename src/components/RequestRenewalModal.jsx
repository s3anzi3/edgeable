import { useEffect, useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import LengthPicker from './LengthPicker.jsx';
import ImageUploader from './ImageUploader.jsx';
import { createTransactionRequest } from '../utils/transactionRequests.js';
import {
  getTotalPaidMonths, computeSuggestedPrice, describePriceBreakdown, lengthInMonthsApprox,
} from '../utils/pricing.js';
import { getPaymentInfo } from '../utils/paymentInfo.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Textarea } from './ui/textarea.jsx';
import { cn } from '../lib/utils.js';

export default function RequestRenewalModal({ uid, userDoc, onClose, onSubmitted }) {
  const { emailVerified, refreshEmailVerified, resendVerification } = useAuth();
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);

  const [length, setLength] = useState({ years: 0, months: 1, weeks: 0 });
  const [paymentMethod, setPaymentMethod] = useState('cashapp');
  const [declaredPrice, setDeclaredPrice] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [paidMonths, setPaidMonths] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [months, info] = await Promise.all([
          getTotalPaidMonths(uid),
          getPaymentInfo(),
        ]);
        if (cancelled) return;
        setPaidMonths(months);
        setPaymentInfo(info);
        setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  // Pick up a verification that may have happened in another tab.
  useEffect(() => { refreshEmailVerified(); }, [refreshEmailVerified]);

  const handleResendVerification = async () => {
    setVerifyBusy(true);
    setVerifyMsg('');
    try {
      await resendVerification();
      setVerifyMsg('Verification email sent. Check your inbox (and spam folder).');
    } catch (e) {
      setVerifyMsg(e?.message || 'Could not send the email. Try again in a minute.');
    }
    setVerifyBusy(false);
  };

  const handleRecheckVerification = async () => {
    setVerifyBusy(true);
    setVerifyMsg('');
    const ok = await refreshEmailVerified();
    if (!ok) setVerifyMsg('Still not verified. Click the link in the email, then re-check.');
    setVerifyBusy(false);
  };

  const breakdown = computeSuggestedPrice(paidMonths, length);
  const suggestedPrice = breakdown.total;

  // Auto-fill declaredPrice with the suggested amount when length changes
  useEffect(() => {
    if (loaded && lengthInMonthsApprox(length) > 0) {
      setDeclaredPrice(suggestedPrice.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length.years, length.months, length.weeks, loaded]);

  const recipient = paymentInfo?.[paymentMethod]?.recipient || '';
  const paymentEnabled = paymentInfo?.[paymentMethod]?.enabled !== false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (lengthInMonthsApprox(length) <= 0) return setError('Please choose a length.');
    if (!imageFile) return setError('Please upload proof of payment.');
    if (declaredPrice === '' || isNaN(Number(declaredPrice)) || Number(declaredPrice) < 0) {
      return setError('Please enter the amount you paid.');
    }

    setSubmitting(true);
    try {
      await createTransactionRequest({
        subscriberUid: uid,
        subscriberDisplayName: userDoc?.displayName,
        subscriberTelegramUsername: userDoc?.telegramUsername,
        subscriberPhone: userDoc?.phone,
        length,
        declaredPrice,
        paymentMethod,
        paymentReference,
        notes,
        imageFile,
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
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Subscription request</DialogTitle>
          <DialogDescription>
            Send your payment, then submit this form with proof. The admin will review and
            activate your subscription.
          </DialogDescription>
        </DialogHeader>

        {!loaded ? (
          <div className="py-4 text-sm text-muted-foreground">Loading…</div>
        ) : !emailVerified ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
              <MailWarning className="h-5 w-5 shrink-0 text-warning" />
              <div className="space-y-1">
                <div className="font-medium text-foreground">Verify your email first</div>
                <p className="text-muted-foreground">
                  Before submitting a payment request, please confirm your email address. We sent a
                  link to <strong className="text-foreground">{userDoc?.email || 'your email'}</strong>.
                  Open it, then re-check below.
                </p>
              </div>
            </div>

            {verifyMsg && (
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                {verifyMsg}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleResendVerification} disabled={verifyBusy}>
                Resend email
              </Button>
              <Button type="button" onClick={handleRecheckVerification} disabled={verifyBusy}>
                {verifyBusy ? 'Checking…' : "I've verified — re-check"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Length to purchase">
              <LengthPicker value={length} onChange={setLength} />
            </Field>

            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-secondary/50 p-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Suggested total
                </div>
                <div className="mt-0.5 font-display text-2xl font-bold leading-tight">
                  ${suggestedPrice.toFixed(2)}
                </div>
                {(breakdown.discountedMonths > 0 && breakdown.standardMonths > 0) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {describePriceBreakdown(breakdown)}
                  </div>
                )}
                {(breakdown.discountedMonths > 0 && breakdown.standardMonths === 0) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    First-6-months rate: ${breakdown.discountedRate}/mo
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                You've paid for ~{paidMonths.toFixed(1)} months so far
              </div>
            </div>

            <Field label="Payment method">
              <div className="flex gap-2">
                {['cashapp', 'zelle'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors',
                      paymentMethod === method
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border bg-card hover:bg-secondary',
                    )}
                  >
                    {method === 'cashapp' ? 'Cashapp' : 'Zelle'}
                  </button>
                ))}
              </div>
              {paymentEnabled ? (
                <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Send to:
                  </div>
                  <div className="mt-0.5 break-all font-mono text-base font-semibold text-primary">
                    {recipient}
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  This payment method is currently disabled. Please choose the other.
                </div>
              )}
            </Field>

            <Field label="Amount you paid ($)" htmlFor="rr-amount">
              <Input
                id="rr-amount"
                type="number" min="0" step="0.01"
                value={declaredPrice}
                onChange={(e) => setDeclaredPrice(e.target.value)}
                placeholder="0.00"
              />
              {Number(declaredPrice) !== suggestedPrice && declaredPrice !== '' && (
                <div className="mt-1.5 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground dark:text-warning">
                  This is different from the suggested price (${suggestedPrice.toFixed(2)}).
                  The admin will see both values when reviewing.
                </div>
              )}
            </Field>

            <Field label="Proof of payment (screenshot)">
              <ImageUploader value={imageFile} onChange={setImageFile} />
            </Field>

            <Field label="Reference (optional)" htmlFor="rr-ref">
              <Input
                id="rr-ref"
                type="text" value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID, Zelle confirmation, etc."
              />
            </Field>

            <Field label="Notes (optional)" htmlFor="rr-notes">
              <Textarea
                id="rr-notes"
                value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything else the admin should know"
              />
            </Field>

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
        )}
      </DialogContent>
    </Dialog>
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
