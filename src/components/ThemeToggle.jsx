import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../ThemeContext.jsx';
import { cn } from '../lib/utils.js';

export default function ThemeToggle({ className }) {
  const { resolvedTheme, toggle } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md',
        'border border-border bg-card text-muted-foreground',
        'hover:text-foreground hover:bg-secondary transition-colors',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
