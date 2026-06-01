import { Link } from 'react-router-dom';
import Wordmark from './Wordmark.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function AuthLayout({ children, footer }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* Subtle grid background */}
      <div className="bg-grid absolute inset-0 pointer-events-none" aria-hidden />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <Link to="/login" aria-label="Edgeable home">
          <Wordmark size="md" />
        </Link>
        <ThemeToggle />
      </header>

      {/* Centered content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>

      {footer && (
        <footer className="relative z-10 px-4 py-6 text-center text-xs text-muted-foreground">
          {footer}
        </footer>
      )}
    </div>
  );
}
