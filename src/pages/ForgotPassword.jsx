import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { isValidEmail } from '../utils/auth.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter the email address on your account.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Don't reveal whether an account exists — show success for user-not-found.
      if (err?.code === 'auth/user-not-found') {
        setSent(true);
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
        setSubmitting(false);
      } else {
        setError(err?.message || 'Could not send the reset email. Try again.');
        setSubmitting(false);
      }
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Mail className="h-5 w-5" />
          </div>

          {sent ? (
            <>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">Check your email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  If an account exists for <strong className="text-foreground">{email}</strong>, we've sent a
                  link to reset your password.
                </p>
              </div>
              <div className="flex gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Open the link in the email, then set a new password and sign in.</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Didn't get it? Check spam, or message the admin on Telegram and they'll reset it for you.
              </p>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">Forgot your password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your account email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoCapitalize="off"
                    autoCorrect="off"
                    placeholder="you@example.com"
                  />
                </div>

                <Button type="submit" disabled={submitting} size="lg" className="w-full">
                  {submitting ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground">
                No access to your email? Message the admin on Telegram and they'll reset it manually.
              </p>
            </>
          )}

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
