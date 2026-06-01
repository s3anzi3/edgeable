import { useEffect, useMemo, useRef, useState } from 'react';
import { unitsCssColor } from '../utils/pnl.js';

// Monotone-cubic spline (Fritsch–Carlson) → smooth, non-overshooting curve.
// Returns an SVG path string of cubic bezier segments through the points.
function smoothPath(xs, ys) {
  const n = xs.length;
  if (n < 2) return '';
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i] || 1e-6;
    slope[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m[i] = 0;
    else m[i] = (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) { const t = 3 / h; m[i] = t * a * slope[i]; m[i + 1] = t * b * slope[i]; }
  }
  let d = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = xs[i] + dx[i] / 3;
    const c1y = ys[i] + (m[i] * dx[i]) / 3;
    const c2x = xs[i + 1] - dx[i] / 3;
    const c2y = ys[i + 1] - (m[i + 1] * dx[i]) / 3;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${xs[i + 1].toFixed(2)} ${ys[i + 1].toFixed(2)}`;
  }
  return d;
}

export default function PerformanceChart({ series, height = 120, onScrub }) {
  const ref = useRef(null);
  const rafRef = useRef(0);
  const pendingX = useRef(null);
  const lastIdx = useRef(-1);
  const [active, setActive] = useState(null);

  const n = series?.length || 0;
  const W = 100;
  const H = height;

  const geom = useMemo(() => {
    if (n < 2) return null;
    const cums = series.map((p) => p.cum);
    const min = Math.min(...cums, 0);
    const max = Math.max(...cums, 0);
    const range = max - min || 1;
    const xs = series.map((_, i) => (i / (n - 1)) * W);
    const ys = cums.map((v) => H - ((v - min) / range) * H);
    const line = smoothPath(xs, ys);
    const zeroY = H - ((0 - min) / range) * H;
    return { xs, ys, line, zeroY, fill: `${line} L ${W} ${zeroY.toFixed(2)} L 0 ${zeroY.toFixed(2)} Z` };
  }, [series, n, H]);

  // Reset hover state and cancel pending frames on unmount.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (!geom) return null;

  const color = unitsCssColor(series[n - 1].cum);
  const sig = `${n}-${series[0].t}-${series[n - 1].t}`; // remounts SVG → replays reveal on data change

  const resolve = () => {
    rafRef.current = 0;
    const el = ref.current;
    if (!el || pendingX.current == null) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (pendingX.current - rect.left) / rect.width));
    const idx = Math.round(frac * (n - 1));
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      setActive(idx);
      onScrub?.(series[idx]);
    }
  };
  const move = (clientX) => {
    pendingX.current = clientX;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(resolve);
  };
  const end = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    pendingX.current = null;
    lastIdx.current = -1;
    setActive(null);
    onScrub?.(null);
  };

  const leftPct = active != null ? (active / (n - 1)) * 100 : 0;
  const topPct = active != null ? (geom.ys[active] / H) * 100 : 0;

  return (
    <div
      ref={ref}
      className="relative select-none"
      style={{ height: `${H}px`, touchAction: 'none' }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.pressure > 0 || e.pointerType === 'mouse') move(e.clientX); }}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
    >
      <svg
        key={sig}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="animate-chart-reveal block h-full w-full"
        aria-hidden="true"
      >
        <line
          x1="0" y1={geom.zeroY} x2={W} y2={geom.zeroY}
          stroke="hsl(var(--border))" strokeDasharray="2,3" strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        <path d={geom.fill} fill={color} fillOpacity="0.14" />
        <path d={geom.line} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>

      {/* Gliding crosshair + dot (HTML overlay so they ease between points) */}
      <div
        className="pointer-events-none absolute bottom-0 top-0 w-px bg-muted-foreground/40 transition-[left,opacity] duration-75 ease-out"
        style={{ left: `${leftPct}%`, opacity: active != null ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow transition-[left,top,opacity] duration-75 ease-out"
        style={{ left: `${leftPct}%`, top: `${topPct}%`, opacity: active != null ? 1 : 0, backgroundColor: color }}
      />
    </div>
  );
}
