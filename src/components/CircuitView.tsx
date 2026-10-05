// SVG renderer for CircuitDefinition: symbols, animated electron flow, charge,
// magnetic field, heat, switch animation and physical "transformations"
// (capacitor → open, inductor → wire, source → short/open, element removed…).
import { memo, useMemo } from 'react';
import type { CircuitDefinition, ComponentDefinition, Solution, TimeState } from '../engine/types';
import { wireCurrents } from '../engine/flow';
import { fmt } from '../engine/analysis';

export type RenderMode = 'normal' | 'open' | 'short' | 'removed' | 'asSource' | 'off';

export interface CircuitViewProps {
  circuit: CircuitDefinition;
  solution?: Solution;
  time?: TimeState;
  modes?: Record<string, RenderMode>;
  /** label used when a storage element is drawn as a source (t = 0+) */
  sourceLabel?: string;
  highlight?: string[];
  selected?: string[];
  dim?: string[];
  showFlow?: boolean;
  imax?: number;
  vmax?: number;
  onComponentClick?: (id: string) => void;
  clickable?: (c: ComponentDefinition) => boolean;
  terminals?: { a: string; b: string };
  heat?: Record<string, number>;
  hideDisplay?: boolean;
  className?: string;
  /** Show the ohmmeter at the terminals (Req view) */
  meter?: string;
}

const HALF = 26;

function geom(c: CircuitDefinition, comp: ComponentDefinition) {
  const A = c.points[comp.a];
  const B = c.points[comp.b];
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len };
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const horiz = Math.abs(u.x) >= Math.abs(u.y);
  const side = comp.labelSide ?? 1;
  const n = horiz ? { x: 0, y: -side } : { x: side, y: 0 };
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const s1 = { x: mid.x - u.x * HALF, y: mid.y - u.y * HALF };
  const s2 = { x: mid.x + u.x * HALF, y: mid.y + u.y * HALF };
  return { A, B, u, mid, n, angle, s1, s2, horiz, len };
}

function Flow({ d, i, imax, active }: { d: string; i: number; imax: number; active: boolean }) {
  const ratio = imax > 0 ? Math.min(1, Math.abs(i) / imax) : 0;
  if (!active || ratio < 0.015) return null;
  const dur = 1.6 - 1.35 * ratio; // more current → faster dots
  return (
    <path
      d={d}
      className="flow"
      style={{
        animationDuration: `${dur}s`,
        animationDirection: i > 0 ? 'normal' : 'reverse',
        opacity: 0.35 + 0.65 * ratio,
      }}
    />
  );
}

function CircuitViewImpl(p: CircuitViewProps) {
  const { circuit: c, solution, modes = {}, highlight = [], selected = [], dim = [], imax = 1 } = p;
  const showFlow = p.showFlow ?? true;
  const phase = !p.time || p.time.kind === 'before' ? 'before' : 'after';

  const flows = useMemo(() => (solution ? wireCurrents(c, solution) : null), [c, solution]);

  const box = useMemo(() => {
    if (c.view) return c.view;
    const xs = Object.values(c.points).map((q) => q.x);
    const ys = Object.values(c.points).map((q) => q.y);
    const pad = 64;
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [c]);

  const vmax = p.vmax ?? 10;

  return (
    <svg
      className={`circuit ${p.className ?? ''}`}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={c.title ?? 'circuito'}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="heat">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* wires */}
      {c.wires.map(([a, b], k) => {
        const A = c.points[a];
        const B = c.points[b];
        const d = `M${A.x} ${A.y}L${B.x} ${B.y}`;
        return (
          <g key={`w${k}`}>
            <path d={d} className="wire" />
            {showFlow && flows && <Flow d={d} i={flows[k]} imax={imax} active />}
          </g>
        );
      })}

      {/* ground marker */}
      {(() => {
        const g = c.points[c.ground];
        return (
          <g className="ground" transform={`translate(${g.x} ${g.y})`}>
            <circle r="3.5" className="node-dot" />
          </g>
        );
      })()}

      {c.components.map((comp) => {
        const g = geom(c, comp);
        const mode = modes[comp.id] ?? 'normal';
        const i = solution?.compI[comp.id] ?? 0;
        const v = solution?.compV[comp.id] ?? 0;
        const isHi = highlight.includes(comp.id);
        const isSel = selected.includes(comp.id);
        const isDim = dim.includes(comp.id);
        const canClick = !!p.onComponentClick && (p.clickable ? p.clickable(comp) : true);
        const lead1 = `M${g.A.x} ${g.A.y}L${g.s1.x} ${g.s1.y}`;
        const lead2 = `M${g.s2.x} ${g.s2.y}L${g.B.x} ${g.B.y}`;
        const through = `M${g.A.x} ${g.A.y}L${g.B.x} ${g.B.y}`;
        const heat = p.heat?.[comp.id] ?? 0;
        const closedNow = comp.kind === 'SW' ? (phase === 'before' ? comp.sw!.before : comp.sw!.after) : false;

        let body: React.ReactNode = null;
        let showLeads = true;
        let flowPath: string | null = through;

        if (mode === 'removed') {
          body = null;
          showLeads = false;
          flowPath = null;
        } else if (mode === 'short') {
          body = (
            <g className="morph" key="short">
              <line x1={-HALF} y1={0} x2={HALF} y2={0} className="wire short-wire" />
            </g>
          );
        } else if (mode === 'open' || mode === 'off') {
          flowPath = null;
          body = (
            <g className="morph" key="open">
              <line x1={-HALF} y1={0} x2={-9} y2={0} className="wire" />
              <line x1={9} y1={0} x2={HALF} y2={0} className="wire" />
              <circle cx={-9} cy={0} r={3.5} className="open-end" />
              <circle cx={9} cy={0} r={3.5} className="open-end" />
            </g>
          );
        } else if (mode === 'asSource') {
          body =
            comp.kind === 'L' ? (
              <g className="morph as-source" key="src">
                <circle r={17} className="sym src-l" />
                <path d="M9 0 L-8 0 M-8 0 l6 -5 M-8 0 l6 5" className="sym-line" transform="rotate(180)" />
              </g>
            ) : (
              <g className="morph as-source" key="src">
                <circle r={17} className="sym src-c" />
              </g>
            );
        } else {
          body = <Symbol comp={comp} closed={closedNow} v={v} i={i} vmax={vmax} imax={imax} />;
        }

        const valueText = !p.hideDisplay && mode !== 'removed' ? labelFor(comp, mode, p.sourceLabel) : '';
        const lab = { x: g.mid.x + g.n.x * (g.horiz ? 30 : 30), y: g.mid.y + g.n.y * 30 };
        const anchor = g.horiz ? 'middle' : g.n.x > 0 ? 'start' : 'end';

        // charge glyphs on capacitor plates
        const charges: React.ReactNode[] = [];
        if (comp.kind === 'C' && mode === 'normal' && Math.abs(v) > vmax * 0.03) {
          const count = Math.max(1, Math.round(Math.min(1, Math.abs(v) / vmax) * 4));
          const perp = { x: -g.u.y, y: g.u.x };
          for (let k = 0; k < count; k++) {
            const s = count === 1 ? 0 : -15 + (30 * k) / (count - 1);
            const pa = { x: g.mid.x - g.u.x * 13 + perp.x * s, y: g.mid.y - g.u.y * 13 + perp.y * s };
            const pb = { x: g.mid.x + g.u.x * 13 + perp.x * s, y: g.mid.y + g.u.y * 13 + perp.y * s };
            const posA = v > 0;
            charges.push(
              <text key={`ca${k}`} x={pa.x} y={pa.y + 4} className={posA ? 'q-pos' : 'q-neg'} textAnchor="middle">
                {posA ? '+' : '−'}
              </text>,
              <text key={`cb${k}`} x={pb.x} y={pb.y + 4} className={posA ? 'q-neg' : 'q-pos'} textAnchor="middle">
                {posA ? '−' : '+'}
              </text>,
            );
          }
        }

        // magnetic field around inductor
        let field: React.ReactNode = null;
        if (comp.kind === 'L' && mode === 'normal') {
          const r = Math.min(1, Math.abs(i) / (imax || 1));
          if (r > 0.02)
            field = (
              <g transform={`translate(${g.mid.x} ${g.mid.y}) rotate(${g.angle})`} style={{ opacity: 0.15 + 0.85 * r }}>
                {[0, 1, 2].map((k) => (
                  <ellipse key={k} cx={0} cy={-4} rx={34 + k * 9} ry={(14 + k * 7) * (0.5 + r / 2)} className="bfield" />
                ))}
              </g>
            );
        }

        return (
          <g
            key={comp.id}
            className={`comp comp-${comp.kind} ${isHi ? 'hi' : ''} ${isSel ? 'sel' : ''} ${isDim ? 'dim' : ''} ${canClick ? 'clickable' : ''}`}
            onClick={canClick ? () => p.onComponentClick!(comp.id) : undefined}
          >
            {heat > 0.02 && <circle cx={g.mid.x} cy={g.mid.y} r={22 + 26 * heat} fill="url(#heat)" opacity={Math.min(1, heat)} />}
            {field}
            {(isHi || isSel) && (
              <rect
                x={g.mid.x - (g.horiz ? HALF + 8 : 26)}
                y={g.mid.y - (g.horiz ? 26 : HALF + 8)}
                width={g.horiz ? 2 * HALF + 16 : 52}
                height={g.horiz ? 52 : 2 * HALF + 16}
                rx={12}
                className={isSel ? 'sel-ring' : 'hi-ring'}
              />
            )}
            {showLeads && (
              <>
                <path d={lead1} className="wire" />
                <path d={lead2} className="wire" />
              </>
            )}
            {body && <g transform={`translate(${g.mid.x} ${g.mid.y}) rotate(${g.angle})`}>{body}</g>}
            {/* source polarity signs in global coords so they never rotate */}
            {comp.kind === 'V' && mode === 'normal' && (
              <>
                <text x={g.mid.x - g.u.x * 8} y={g.mid.y - g.u.y * 8 + 4.5} textAnchor="middle" className="pol">+</text>
                <text x={g.mid.x + g.u.x * 8} y={g.mid.y + g.u.y * 8 + 4.5} textAnchor="middle" className="pol">−</text>
              </>
            )}
            {comp.kind === 'C' && mode === 'asSource' && (
              <>
                <text x={g.mid.x - g.u.x * 8} y={g.mid.y - g.u.y * 8 + 4.5} textAnchor="middle" className="pol">+</text>
                <text x={g.mid.x + g.u.x * 8} y={g.mid.y + g.u.y * 8 + 4.5} textAnchor="middle" className="pol">−</text>
              </>
            )}
            {charges}
            {showFlow && solution && flowPath && <Flow d={flowPath} i={i} imax={imax} active={mode !== 'open'} />}
            {canClick && (
              <rect
                x={g.mid.x - 34}
                y={g.mid.y - 34}
                width={68}
                height={68}
                className="hit"
                rx={14}
              />
            )}
            {valueText && (
              <text x={lab.x} y={lab.y + 4} textAnchor={anchor} className={`clabel ${mode !== 'normal' ? 'mode' : ''}`}>
                {valueText}
              </text>
            )}
            {comp.name && mode !== 'removed' && !p.hideDisplay && (
              <text x={lab.x} y={lab.y + 20} textAnchor={anchor} className="cname">
                {comp.name}
              </text>
            )}
          </g>
        );
      })}

      {(p.terminals ? [] : c.nodes ?? []).map((nd) => {
        const pt = c.points[nd.point];
        return (
          <g key={nd.point}>
            <circle cx={pt.x} cy={pt.y} r={4} className="node-dot" />
            <text x={pt.x + 6} y={pt.y - 10} className="node-label">
              {nd.label}
            </text>
          </g>
        );
      })}

      {p.terminals && (
        <g className="terminals">
          {[p.terminals.a, p.terminals.b].map((pt, k) => (
            <g key={pt}>
              <circle cx={c.points[pt].x} cy={c.points[pt].y} r={7} className="term" />
              <text x={c.points[pt].x + 12} y={c.points[pt].y + (k === 0 ? -8 : 18)} className="term-label">
                {k === 0 ? 'a' : 'b'}
              </text>
            </g>
          ))}
          {p.meter && (
            <g transform={`translate(${(c.points[p.terminals.a].x + c.points[p.terminals.b].x) / 2 + 14} ${(c.points[p.terminals.a].y + c.points[p.terminals.b].y) / 2})`}>
              <rect x={0} y={-20} width={96} height={40} rx={10} className="meter-box" />
              <text x={48} y={6} textAnchor="middle" className="meter-text">
                {p.meter}
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

function labelFor(comp: ComponentDefinition, mode: RenderMode, sourceLabel?: string): string {
  if (mode === 'asSource') return sourceLabel ?? '';
  if (mode === 'open') return comp.kind === 'C' ? 'C → abierto' : comp.kind === 'I' ? '0 A → abierto' : 'abierto';
  if (mode === 'short') return comp.kind === 'L' ? 'L → cable' : comp.kind === 'V' ? '0 V → cable' : 'cable';
  if (mode === 'off') return 'apagada';
  if (comp.kind === 'SW') return comp.display ?? '';
  return comp.display ?? '';
}

function Symbol({ comp, closed }: { comp: ComponentDefinition; closed: boolean; v: number; i: number; vmax: number; imax: number }) {
  switch (comp.kind) {
    case 'R':
      return <polyline points="-26,0 -20,0 -16,-9 -8,9 0,-9 8,9 16,-9 20,0 26,0" className="sym-line" />;
    case 'V':
      return (
        <>
          <line x1={-HALF} y1={0} x2={-17} y2={0} className="sym-line" />
          <line x1={17} y1={0} x2={HALF} y2={0} className="sym-line" />
          <circle r={17} className={`sym src-v ${comp.active && comp.active !== 'always' ? 'timed' : ''}`} />
        </>
      );
    case 'I':
      return (
        <>
          <line x1={-HALF} y1={0} x2={-17} y2={0} className="sym-line" />
          <line x1={17} y1={0} x2={HALF} y2={0} className="sym-line" />
          <circle r={17} className="sym src-i" />
          <path d="M9 0 L-9 0 M-9 0 l6 -5 M-9 0 l6 5" className="sym-line arrow" />
        </>
      );
    case 'VCCS':
      return (
        <>
          <line x1={-HALF} y1={0} x2={-18} y2={0} className="sym-line" />
          <line x1={18} y1={0} x2={HALF} y2={0} className="sym-line" />
          <path d="M-18 0 L0 -18 L18 0 L0 18 Z" className="sym src-dep" />
          <path d="M9 0 L-9 0 M-9 0 l6 -5 M-9 0 l6 5" className="sym-line arrow" />
        </>
      );
    case 'C':
      return (
        <>
          <line x1={-HALF} y1={0} x2={-5} y2={0} className="sym-line" />
          <line x1={5} y1={0} x2={HALF} y2={0} className="sym-line" />
          <line x1={-5} y1={-17} x2={-5} y2={17} className="plate" />
          <line x1={5} y1={-17} x2={5} y2={17} className="plate" />
        </>
      );
    case 'L':
      return (
        <path
          d="M-26 0 L-24 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 L26 0"
          className="sym-line coil"
        />
      );
    case 'SW':
      return (
        <>
          <line x1={-HALF} y1={0} x2={-18} y2={0} className="sym-line" />
          <line x1={18} y1={0} x2={HALF} y2={0} className="sym-line" />
          <circle cx={-18} cy={0} r={3.5} className="sw-dot" />
          <circle cx={18} cy={0} r={3.5} className="sw-dot" />
          <g className="lever" style={{ transform: `rotate(${closed ? 0 : -32}deg)`, transformOrigin: '-18px 0px' }}>
            <line x1={-18} y1={0} x2={19} y2={0} className="sym-line lever-line" />
          </g>
        </>
      );
    case 'SLOT':
      return (
        <>
          <rect x={-22} y={-20} width={44} height={40} rx={8} className="slot" />
          <text x={0} y={6} textAnchor="middle" className="slot-q" transform="rotate(-90)">
            ?
          </text>
        </>
      );
  }
}

export const CircuitView = memo(CircuitViewImpl);

export function valueLabel(v: number, unit: string) {
  return `${fmt(v, 2)} ${unit}`;
}
