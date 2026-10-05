// First-order analysis: the professor's generalized method, computed deterministically.
//   1. initial condition   2. final condition   3. Req seen by C/L   4. tau   5. x(t)
import { solve } from './mna';
import type { CircuitDefinition, FirstOrderResult, Solution, StorageMode, TimeState } from './types';

const BIG = 1e7;

export function storageOf(c: CircuitDefinition) {
  const s = c.components.find((k) => k.id === c.storage);
  if (!s) throw new Error(`Circuit ${c.id} has no storage element`);
  return s;
}

export function firstOrder(c: CircuitDefinition): FirstOrderResult {
  const s = storageOf(c);
  const isC = s.kind === 'C';
  // 1. t = 0-: old circuit in DC steady state (C open / L short)
  let x0minus: number;
  if (c.initial !== undefined) x0minus = c.initial;
  else {
    const before = solve(c, { phase: 'before', storage: { mode: isC ? 'open' : 'short' } });
    x0minus = isC ? before.compV[s.id] : before.compI[s.id];
  }
  // continuity: vC(0+) = vC(0-), iL(0+) = iL(0-)
  const x0plus = x0minus;
  // 2. t -> inf: new circuit in DC steady state
  const after = solve(c, { phase: 'after', storage: { mode: isC ? 'open' : 'short' } });
  const xinf = isC ? after.compV[s.id] : after.compI[s.id];
  // 3. Req: remove element, deactivate independent sources, test source of 1 A
  const Req = theveninResistance(c, s.a, s.b);
  // 4. tau
  const tau = isC ? Req * s.value : Req < 1e-12 ? Infinity : s.value / Req;
  return {
    type: isC ? 'RC' : 'RL',
    variable: isC ? 'v' : 'i',
    unit: isC ? 'V' : 'A',
    x0minus: clean(x0minus),
    x0plus: clean(x0plus),
    xinf: clean(xinf),
    Req: clean(Req),
    tau: Req >= BIG ? Infinity : clean(tau),
    storageValue: s.value,
  };
}

export function theveninResistance(c: CircuitDefinition, a: string, b: string, phase: 'before' | 'after' = 'after'): number {
  const sol = solve(c, {
    phase,
    storage: { mode: 'removed' },
    deactivate: true,
    testSource: { a, b, value: 1 },
  });
  const r = sol.pointV[a] - sol.pointV[b];
  return r > BIG ? Infinity : r;
}

/** Value of the state variable x(t) for t >= 0 */
export function xAt(fo: FirstOrderResult, t: number): number {
  if (!isFinite(fo.tau)) return fo.x0plus;
  if (fo.tau <= 0) return fo.xinf;
  return fo.xinf + (fo.x0plus - fo.xinf) * Math.exp(-t / fo.tau);
}

/** Full circuit snapshot at a given time. Exact for linear first-order circuits with DC sources. */
export function solveAt(c: CircuitDefinition, time: TimeState, fo?: FirstOrderResult): Solution {
  const s = storageOf(c);
  const r = fo ?? firstOrder(c);
  const isC = s.kind === 'C';
  if (time.kind === 'before') {
    if (c.initial !== undefined) {
      const storage: StorageMode = isC ? { mode: 'vsrc', value: c.initial } : { mode: 'isrc', value: c.initial };
      return solve(c, { phase: 'before', storage });
    }
    return solve(c, { phase: 'before', storage: { mode: isC ? 'open' : 'short' } });
  }
  if (time.kind === 'inf') {
    if (!isFinite(r.tau)) {
      const storage: StorageMode = isC ? { mode: 'vsrc', value: r.x0plus } : { mode: 'isrc', value: r.x0plus };
      return solve(c, { phase: 'after', storage });
    }
    return solve(c, { phase: 'after', storage: { mode: isC ? 'open' : 'short' } });
  }
  const x = xAt(r, time.t);
  const storage: StorageMode = isC ? { mode: 'vsrc', value: x } : { mode: 'isrc', value: x };
  return solve(c, { phase: 'after', storage });
}

/** Value of any probe-able quantity at a time (component voltage / current). */
export function quantityAt(
  c: CircuitDefinition,
  q: { comp: string; kind: 'v' | 'i' },
  time: TimeState,
  fo?: FirstOrderResult,
): number {
  const sol = solveAt(c, time, fo);
  return clean(q.kind === 'v' ? sol.compV[q.comp] : sol.compI[q.comp]);
}

export function clean(v: number): number {
  if (!isFinite(v)) return v;
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
}

/** Pretty number: up to 3 significant decimals, no trailing zeros. */
export function fmt(v: number, digits = 3): string {
  if (!isFinite(v)) return '∞';
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  const s = (Object.is(r, -0) ? 0 : r).toString();
  return s.replace('.', ',');
}

export function fmtTau(fo: FirstOrderResult): string {
  return fmt(fo.tau);
}

/** Map a scrubber position to time. s in [0, 1000]. */
export const SCRUB = {
  max: 1000,
  beforeEnd: 120, // [0,120) -> t<0
  zeroPlus: 140, // [120,140) -> 0+
  infStart: 920, // [920,1000] -> inf
  tauSpan: 6, // linear section covers 0..6 tau
};

export function scrubToTime(s: number, tau: number): TimeState {
  if (s < SCRUB.beforeEnd) return { kind: 'before' };
  if (s >= SCRUB.infStart) return { kind: 'inf' };
  if (s < SCRUB.zeroPlus) return { kind: 'after', t: 0 };
  const f = (s - SCRUB.zeroPlus) / (SCRUB.infStart - SCRUB.zeroPlus);
  const T = isFinite(tau) ? tau : 1;
  return { kind: 'after', t: f * SCRUB.tauSpan * T };
}

export function timeToScrub(time: TimeState, tau: number): number {
  if (time.kind === 'before') return SCRUB.beforeEnd / 2;
  if (time.kind === 'inf') return SCRUB.max;
  const T = isFinite(tau) ? tau : 1;
  if (time.t <= 0) return SCRUB.zeroPlus - 10;
  const f = Math.min(1, time.t / (SCRUB.tauSpan * T));
  return SCRUB.zeroPlus + f * (SCRUB.infStart - SCRUB.zeroPlus);
}
