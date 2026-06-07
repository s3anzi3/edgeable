import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import {
  normalizeTelegramUsername, isValidTelegramUsername,
  normalizePhone, isValidPhone, isValidEmail,
} from '../utils/auth.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';

export default function Signup() {
  const { signup, currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const errorRef = useRef(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const fail = (msg) => {
    setError(msg);
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedUsername = normalizeTelegramUsername(telegramUsername);
    const normalizedPhone = normalizePhone(phone);
    const hasUsername = !!normalizedUsername;
    const hasPhone = !!normalizedPhone;

    if (!displayName.trim()) return fail('Please enter your display name.');
    if (!isValidEmail(email)) return fail('Please enter a valid email address.');
    if (!hasUsername) return fail('Please enter your Telegram username.');
    if (!isValidTelegramUsername(normalizedUsername)) {
      return fail('Telegram username must be 5-32 characters: letters, numbers, or underscore.');
    }
    if (!hasPhone) return fail('Please enter your phone number.');
    if (!isValidPhone(normalizedPhone)) {
      return fail('Phone must be 7-15 digits.');
    }
    if (password.length < 6) return fail('Password must be at least 6 characters.');
    if (password !== confirmPassword) return fail("Passwords don't match.");

    setSubmitting(true);
    try {
      await signup({ displayName, email, telegramUsername, phone, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      fail(err.message || 'Sign-up failed. Please try again.');
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardContent className="p-6 sm:p-8">
          {error && (
            <div
              ref={errorRef}
              role="alert"
              className="mb-5 flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Sign-up failed</div>
                <div className="text-destructive/90">{error}</div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your Telegram and phone so we can match you to your subscription.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
                placeholder="How you'd like to be called"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground">
                You'll get a link to confirm this email. Used to sign in and to reset your
                password if you forget it.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="mb-3 text-xs text-muted-foreground">
                Both your Telegram username and phone number are required.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="telegramUsername">Telegram username</Label>
                  <Input
                    id="telegramUsername"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    required
                    maxLength={33}
                    autoCapitalize="off"
                    autoCorrect="off"
                    placeholder="@yourname"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6+ characters"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                After signing up your account will be <strong className="text-foreground">inactive</strong>{' '}
                until your first payment is processed. You'll be able to submit a renewal request from your dashboard.
              </span>
            </div>

            <Button type="submit" disabled={submitting} size="lg" className="w-full">
              {submitting ? (
                'Creating account…'
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
