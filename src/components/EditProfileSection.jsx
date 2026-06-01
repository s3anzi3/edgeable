import { useState } from 'react';
import { updateUserProfile } from '../utils/users.js';
import { normalizeTelegramUsername, normalizePhone } from '../utils/auth.js';
import { Card, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';

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

export default function EditProfileSection({ subscriber, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(subscriber.displayName || '');
  const [phone, setPhone] = useState(subscriber.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setDisplayName(subscriber.displayName || '');
    setPhone(subscriber.phone || '');
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await updateUserProfile(subscriber.id, {
        displayName,
        phone,
      });
      setEditing(false);
      if (onUpdated) await onUpdated();
    } catch (e) {
      setError(e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display font-semibold tracking-tight">Profile</h3>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>Edit profile</Button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Display name" value={subscriber.displayName || '—'} />
            <Field label="Email" value={subscriber.email || '—'} />
            <Field label="Telegram username" value={subscriber.telegramUsername ? `@${subscriber.telegramUsername}` : '—'} />
            <Field label="Phone" value={formatPhoneDisplay(subscriber.phone)} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ep-name">Display name</Label>
              <Input
                id="ep-name" type="text" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                {subscriber.email || '(unset)'}
              </div>
              <p className="text-xs text-muted-foreground">
                Email changes require the admin reset script (it's the login + password-reset address).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Telegram username</Label>
              <div className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                @{subscriber.telegramUsername || '(unset)'}
              </div>
              <p className="text-xs text-muted-foreground">
                Username changes require a developer script (auth email is derived from it).
                If wrong, delete the account and have the subscriber re-sign up.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-phone">Phone</Label>
              <Input
                id="ep-phone" type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}
