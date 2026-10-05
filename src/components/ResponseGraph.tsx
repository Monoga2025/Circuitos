// Live exponential plot with τ markers, 63 % point, asymptote and a time cursor.
import { useMemo } from 'react';
import { fmt, xAt } from '../engine/analysis';
import type { FirstOrderResult, TimeState } from '../engine/types';

interface Props {
  fo: FirstOrderResult;
  time?: TimeState;
  label?: string;
  /** Hide numbers until the student finds them */
  hideValues?: boolean;
  showTauMarks?: boolean;
  show63?: boolean;
  ghost?: FirstOrderResult | null;
  height?: number;
  /** Fixed y range (useful when comparing curves) */
  yRange?: [number, number];
  /** Fixed time span in seconds (otherwise 6τ) */
  tSpan?: number;
  emphasize?: 'start' | 'end' | 'tau' | null;
}

const W = 520;

export function ResponseGraph({
  fo,
  time,
  label,
  hideValues,
  showTauMarks = true,
  show63 = false,
  ghost,
  height = 200,
  yRange,
  tSpan,
  emphasize,
}: Props) {
  const H = height;
  const padL = 46;
  const padR = 34;
  const padT = 16;
  const padB = 30;
  const tau = isFinite(fo.tau) && fo.tau > 0 ? fo.tau : 1;
  const T = tSpan ?? 6 * tau;
  const tMin = -T * 0.15;
  const tMax = T;

  const [ymin, ymax] = useMemo(() => {
    if (yRange) return yRange;
    const vals = [fo.x0minus, fo.x0plus, fo.xinf, 0];
    if (ghost) vals.push(ghost.x0plus, ghost.xinf, ghost.x0minus);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi - lo < 1e-6) {
      hi += 1;
      lo -= 1;
    }
    const m = (hi - lo) * 0.12;
    return [lo - m, hi + m];
  }, [fo, ghost, yRange]);

  const X = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin)) * (H - padT - padB);

  const path = (r: FirstOrderResult) => {
    let d = `M${X(tMin)} ${Y(r.x0minus)} L${X(0)} ${Y(r.x0minus)}`;
    d += ` L${X(0)} ${Y(r.x0plus)}`;
    const N = 90;
    for (let k = 1; k <= N; k++) {
      const t = (k / N) * tMax;
      d += ` L${X(t)} ${Y(xAt(r, t))}`;
    }
    return d;
  };

  let cursor: { x: number; y: number } | null = null;
  if (time) {
    if (time.kind === 'before') cursor = { x: X(tMin * 0.5), y: Y(fo.x0minus) };
    else if (time.kind === 'inf') cursor = { x: X(tMax), y: Y(fo.xinf) };
    else {
      const t = Math.min(time.t, tMax);
      cursor = { x: X(t), y: Y(xAt(fo, t)) };
    }
  }
  const unit = fo.unit;
  const v63 = fo.xinf + (fo.x0plus - fo.xinf) * Math.exp(-1);
  const jump = Math.abs(fo.x0minus - fo.x0plus) > 1e-9;

  return (
    <svg className="graph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* axes */}
      <line x1={padL} y1={Y(Math.max(ymin, Math.min(ymax, 0)))} x2={W - padR + 10} y2={Y(Math.max(ymin, Math.min(ymax, 0)))} className="axis" />
      <line x1={X(0)} y1={padT - 6} x2={X(0)} y2={H - padB + 4} className="axis zero" />
      <text x={X(0)} y={H - 10} textAnchor="middle" className="g-tick">0</text>
      <text x={X(tMin) + 2} y={H - 10} className="g-tick">t&lt;0</text>
      <text x={8} y={padT + 6} className="g-label">{label ?? (fo.type === 'RC' ? 'vC' : 'iL')}</text>

      {showTauMarks &&
        [1, 2, 3, 4, 5].map((k) =>
          k * tau <= tMax ? (
            <g key={k}>
              <line x1={X(k * tau)} y1={padT} x2={X(k * tau)} y2={H - padB} className={`tau-line ${emphasize === 'tau' && k === 1 ? 'emph' : ''}`} />
              <text x={X(k * tau)} y={H - 10} textAnchor="middle" className="g-tick">
                {k}τ
              </text>
            </g>
          ) : null,
        )}

      {/* asymptote */}
      <line x1={X(0)} y1={Y(fo.xinf)} x2={W - padR + 10} y2={Y(fo.xinf)} className={`asym ${emphasize === 'end' ? 'emph' : ''}`} />
      {!hideValues && (
        <text x={W - padR + 12} y={Y(fo.xinf) + 4} className="g-val">
          {fmt(fo.xinf, 2)}
        </text>
      )}

      {ghost && <path d={path(ghost)} className="curve ghost" />}
      <path d={path(fo)} className="curve" />

      {/* start point */}
      <circle cx={X(0)} cy={Y(fo.x0plus)} r={emphasize === 'start' ? 7 : 4.5} className={`start-dot ${emphasize === 'start' ? 'emph' : ''}`} />
      {jump && <circle cx={X(0)} cy={Y(fo.x0minus)} r={4} className="jump-dot" />}
      {!hideValues && (
        <text x={X(0) + 8} y={Y(fo.x0plus) - 8} className="g-val">
          {fmt(fo.x0plus, 2)} {unit}
        </text>
      )}

      {show63 && isFinite(fo.tau) && (
        <g>
          <circle cx={X(tau)} cy={Y(v63)} r={5} className="p63" />
          <text x={X(tau) + 8} y={Y(v63) + (fo.xinf > fo.x0plus ? 16 : -8)} className="g-63">
            63 %
          </text>
        </g>
      )}

      {cursor && (
        <g>
          <line x1={cursor.x} y1={padT} x2={cursor.x} y2={H - padB} className="cursor-line" />
          <circle cx={cursor.x} cy={cursor.y} r={6} className="cursor" />
        </g>
      )}
    </svg>
  );
}

/** Small thumbnail curve for multiple-choice options. */
export function MiniCurve({ before, start, end, tau = 1, max }: { before: number; start: number; end: number; tau?: number; max?: number }) {
  const W2 = 120;
  const H2 = 64;
  const hi = max ?? Math.max(1, before, start, end);
  const lo = Math.min(0, before, start, end);
  const Y = (v: number) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (H2 - 16);
  const X0 = 26;
  let d = `M4 ${Y(before)} L${X0} ${Y(before)} L${X0} ${Y(start)}`;
  for (let k = 1; k <= 40; k++) {
    const t = (k / 40) * 4;
    d += ` L${X0 + (k / 40) * (W2 - X0 - 4)} ${Y(end + (start - end) * Math.exp(-t / tau))}`;
  }
  return (
    <svg viewBox={`0 0 ${W2} ${H2}`} className="mini-curve">
      <line x1={X0} y1={2} x2={X0} y2={H2 - 2} className="axis zero" />
      <line x1={2} y1={Y(0)} x2={W2 - 2} y2={Y(0)} className="axis" />
      <path d={d} className="curve" />
    </svg>
  );
}
