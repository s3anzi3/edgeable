import { forwardRef } from 'react';
import { cn, stripEmoji } from '../../lib/utils.js';

// Loose default cap so no text field is ever unbounded (override per-field as needed).
// Length-limiting only makes sense for free-text inputs, not number/date/etc.
const TEXTISH = ['text', 'email', 'tel', 'password', 'search', 'url'];
const DEFAULT_MAX = 200;

const Input = forwardRef(({ className, type = 'text', onChange, maxLength, ...props }, ref) => {
  const handleChange = onChange
    ? (e) => {
        // Block emoji in every field by stripping them before they reach state.
        const cleaned = stripEmoji(e.target.value);
        if (cleaned !== e.target.value) e.target.value = cleaned;
        onChange(e);
      }
    : undefined;

  const effectiveMax = maxLength ?? (TEXTISH.includes(type) ? DEFAULT_MAX : undefined);

  return (
    <input
      type={type}
      ref={ref}
      maxLength={effectiveMax}
      onChange={handleChange}
      className={cn(
        'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base',
        'placeholder:text-muted-foreground/70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
