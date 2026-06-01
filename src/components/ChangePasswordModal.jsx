import { useState } from 'react';
import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { recordSubscriberEvent, EVENT_TYPES } from '../utils/accountEvents.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';

export default function ChangePasswordModal({ onClose }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPwd.length < 6) return setError('New password must be at least 6 characters.');
    if (newPwd !== confirmPwd) return setError("New passwords don't match.");
    if (newPwd === currentPwd) return setError('New password must be different from current.');

    const user = auth.currentUser;
    if (!user) return setError('You are not signed in.');

    setSubmitting(true);
    try {
      // Re-authenticate with current password (Firebase requires this for password change)
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);

      // Audit log entry — best-effort, don't block the success state
      try {
        await recordSubscriberEvent({
          subscriberUid: user.uid,
          type: EVENT_TYPES.PASSWORD_CHANGE,
          performedBy: 'subscriber',
          performedByUid: user.uid,
        });
      } catch {}

      setDone(true);
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else if (code === 'auth/weak-password') {
        setError('New password is too weak.');
      } else {
        setError(err.message || 'Failed to change password.');
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>

        {done ? (
          <>
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
              Password updated. You're all set.
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-current">Current password</Label>
              <Input
                id="cp-current" type="password" value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required autoFocus autoComplete="current-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-new">New password</Label>
              <Input
                id="cp-new" type="password" value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required minLength={6} autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm">Confirm new password</Label>
              <Input
                id="cp-confirm" type="password" value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required autoComplete="new-password"
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
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
