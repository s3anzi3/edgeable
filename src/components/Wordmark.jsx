import { cn } from '../lib/utils.js';

/**
 * Edgeable wordmark — custom cut-edge "E" + Space Grotesk "dgeable".
 * The right edge of the E tapers diagonally inward, visual pun on "edge".
 *
 * Sizes scale with font-size (the SVG uses em-based height), so wrap in any
 * font-size you want or pass a `size` shortcut.
 */
const SIZE_CLASSES = {
  sm: 'text-lg',     // ~18px
  md: 'text-2xl',    // ~24px
  lg: 'text-4xl',    // ~36px
  xl: 'text-5xl sm:text-6xl', // hero
};

export default function Wordmark({ size = 'md', className, accentColor = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-display font-semibold tracking-tight text-foreground',
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className,
      )}
      aria-label="Edgeable"
    >
      <CutEdgeE accent={accentColor} />
      <span aria-hidden>dgeable</span>
    </span>
  );
}

/**
 * Just the E mark — for favicons, avatars, tight spots.
 * Pass `className` with a height (e.g. "h-8 w-auto").
 */
export function EdgeMark({ className, accent = false }) {
  return (
    <svg
      viewBox="0 0 60 70"
      role="img"
      aria-label="Edgeable mark"
      className={cn('h-8 w-auto text-foreground', className)}
    >
      <EPath accent={accent} />
    </svg>
  );
}

function CutEdgeE({ accent }) {
  return (
    <svg
      viewBox="0 0 60 70"
      aria-hidden
      style={{ height: '0.72em', width: 'auto', display: 'inline-block', marginRight: '0.02em' }}
    >
      <EPath accent={accent} />
    </svg>
  );
}

function EPath({ accent }) {
  return (
    <g>
      <path
        d="M 0 0 L 60 0 L 60 12 L 12 12 L 12 30 L 50 30 L 50 42 L 12 42 L 12 58 L 40 58 L 40 70 L 0 70 Z"
        fill="currentColor"
      />
      {accent && (
        <line
          x1="60"
          y1="6"
          x2="40"
          y2="64"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}
