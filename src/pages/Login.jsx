import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';

export default function Login() {
  const { login, currentUser, role, loading } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) {
      navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [currentUser, role, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(friendlyError(err) || 'Login failed.');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your subscription portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Sign-in failed</div>
                  <div className="text-destructive/90">{error}</div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email, Telegram username, or phone</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com, @yourname, or +15551234567"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={submitting} size="lg" className="w-full">
              {submitting ? (
                'Signing in…'
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

function friendlyError(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Login or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return err?.message || null;
  }
}
