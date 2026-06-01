// Tiny SVG sparkline showing cumulative P&L over time. No dependencies.
// Theme-aware: uses CSS variables for colors.

export default function Sparkline({ points, height = 64 }) {
  if (!points || points.length < 2) return null;

  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = (max - min) || 1;
  const W = 100;
  const H = height;

  const xStep = W / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * xStep;
    const y = H - ((p - min) / range) * H;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  const zeroY = H - ((0 - min) / range) * H;

  const final = points[points.length - 1];
  const color =
    final > 0 ? 'hsl(var(--success))'
    : final < 0 ? 'hsl(var(--destructive))'
    : 'hsl(var(--muted-foreground))';

  const fillPath = `${path} L ${W} ${zeroY.toFixed(2)} L 0 ${zeroY.toFixed(2)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: `${H}px`, display: 'block' }}
      aria-hidden="true"
    >
      <line
        x1="0" y1={zeroY} x2={W} y2={zeroY}
        stroke="hsl(var(--border))" strokeDasharray="2,3" strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
      <path d={fillPath} fill={color} fillOpacity="0.14" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
