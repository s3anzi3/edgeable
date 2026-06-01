import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';

export default function AdminResetPasswordModal({ subscriber, onClose }) {
  const [copied, setCopied] = useState(false);
  const command = `node scripts/reset-user-password.js ${subscriber.telegramUsername}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const code = 'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.82rem]';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Resetting another user's password requires a server-side script
            (Firebase doesn't allow it from the browser).
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80">
          <li>Open a terminal in <code className={code}>C:\Users\panky\Desktop\edgeable</code></li>
          <li>Run the command below — it'll print a new random password</li>
          <li>Send the new password to <strong className="text-foreground">@{subscriber.telegramUsername}</strong> on Telegram</li>
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-900 p-3 text-zinc-100">
          <code className="flex-1 break-all font-mono text-sm">{command}</code>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </Button>
        </div>

        <div className="border-t border-border pt-3 text-sm text-muted-foreground">
          To set a specific password instead of a random one:
          <br />
          <code className={code}>{command} TheirNewPassword</code>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
