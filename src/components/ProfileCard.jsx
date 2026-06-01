import { Pencil, MessageSquare } from 'lucide-react';
import { Card, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';

function formatPhoneDisplay(digits) {
  if (!digits) return '—';
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `+${digits}`;
}

export default function ProfileCard({ userDoc, onRequestUpdate }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold tracking-tight">My profile</h3>
          <Button size="sm" variant="outline" onClick={onRequestUpdate}>
            <Pencil className="h-3.5 w-3.5" />
            Request update
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Field label="Display name" value={userDoc?.displayName || '—'} />
          <Field label="Telegram" value={userDoc?.telegramUsername ? `@${userDoc.telegramUsername}` : '—'} />
          <Field label="Phone" value={formatPhoneDisplay(userDoc?.phone)} />
        </div>

        <div className="flex gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Spotted a typo? Tap "Request update" or message the admin on Telegram.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}
