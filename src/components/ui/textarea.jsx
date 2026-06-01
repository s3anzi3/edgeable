import { forwardRef } from 'react';
import { cn, stripEmoji } from '../../lib/utils.js';

const Textarea = forwardRef(({ className, onChange, maxLength = 1000, ...props }, ref) => {
  const handleChange = onChange
    ? (e) => {
        const cleaned = stripEmoji(e.target.value);
        if (cleaned !== e.target.value) e.target.value = cleaned;
        onChange(e);
      }
    : undefined;

  return (
    <textarea
      ref={ref}
      maxLength={maxLength}
      onChange={handleChange}
      className={cn(
        'flex w-full rounded-md border border-input bg-card px-3 py-2 text-base',
        'placeholder:text-muted-foreground/70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
