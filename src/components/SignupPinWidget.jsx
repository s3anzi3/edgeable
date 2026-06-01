import { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { getOrRotateSignupPin, rotateSignupPin } from '../utils/signupPin.js';
import { Card, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';

export default function SignupPinWidget() {
  const [pin, setPin] = useState(null);
  const [rotatedAt, setRotatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrRotateSignupPin();
        if (!cancelled) {
          setPin(data.pin);
          setRotatedAt(data.rotatedAt);
        }
      } catch (e) {
        console.error('Failed to load sign-up PIN:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRotate = async () => {
    if (!window.confirm('Rotate to a new PIN? The current PIN will stop working immediately.')) return;
    setRotating(true);
    try {
      const data = await rotateSignupPin();
      setPin(data.pin);
      setRotatedAt(data.rotatedAt);
    } finally {
      setRotating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-[200px] flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Today's sign-up PIN
          </div>
          <div className="mt-1 font-mono text-4xl font-bold tracking-[0.15em] text-foreground">
            {loading ? '…' : pin || '—'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {rotatedAt ? `Set ${formatRelative(rotatedAt)} · auto-rotates after 24h` : ''}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={loading || !pin}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating || loading}>
            <RefreshCw className={rotating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {rotating ? 'Rotating…' : 'Rotate now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelative(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
