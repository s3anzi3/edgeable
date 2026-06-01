import { Link, useNavigate } from 'react-router-dom';
import { LogOut, KeyRound, ChevronDown, User as UserIcon, ShieldCheck, BookOpen } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import Wordmark from './Wordmark.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { Button } from './ui/button.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.jsx';
import { cn } from '../lib/utils.js';

export default function AppShell({ children, nav, onChangePassword, container = 'narrow' }) {
  const { userDoc, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = (userDoc?.displayName || userDoc?.telegramUsername || 'U')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const containerCls =
    container === 'wide'
      ? 'max-w-7xl'
      : container === 'medium'
      ? 'max-w-4xl'
      : 'max-w-3xl';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={cn('mx-auto flex h-14 items-center justify-between px-4 sm:px-6', containerCls)}>
          <Link
            to={role === 'admin' ? '/admin' : '/dashboard'}
            className="flex items-center"
            aria-label="Edgeable home"
          >
            <Wordmark size="sm" />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {nav}
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-9 rounded-md border border-border bg-card pl-1 pr-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  aria-label="Account menu"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary/15 text-primary text-xs font-semibold">
                    {initials}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
                  <span className="text-sm font-medium text-foreground">
                    {userDoc?.displayName || 'Account'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {role === 'admin' ? (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    ) : userDoc?.telegramUsername ? (
                      `@${userDoc.telegramUsername}`
                    ) : (
                      'Subscriber'
                    )}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/guide')}>
                  <BookOpen /> How it works
                </DropdownMenuItem>
                {onChangePassword && (
                  <DropdownMenuItem onSelect={onChangePassword}>
                    <KeyRound /> Change password
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className={cn('mx-auto px-4 sm:px-6 py-6 sm:py-8', containerCls)}>{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
