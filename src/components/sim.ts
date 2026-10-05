import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { firstOrder, SCRUB, scrubToTime, solveAt } from '../engine/analysis';
import { solve } from '../engine/mna';
import type { CircuitDefinition, FirstOrderResult, Solution, TimeState } from '../engine/types';

export interface Sim {
  fo: FirstOrderResult | null;
  imax: number;
  vmax: number;
  at: (t: TimeState) => Solution;
}

export function useSim(c: CircuitDefinition): Sim {
  return useMemo(() => buildSim(c), [c]);
}

export function buildSim(c: CircuitDefinition): Sim {
  const fo = c.storage ? firstOrder(c) : null;
  const cache = new Map<string, Solution>();
  const at = (t: TimeState): Solution => {
    const key = t.kind === 'after' ? `a${t.t.toFixed(4)}` : t.kind;
    const hit = cache.get(key);
    if (hit) return hit;
    const sol = fo ? solveAt(c, t, fo) : solve(c, { phase: 'after' });
    if (cache.size > 400) cache.clear();
    cache.set(key, sol);
    return sol;
  };
  let imax = 0.001;
  let vmax = 0.001;
  const samples: TimeState[] = fo ? [{ kind: 'before' }, { kind: 'after', t: 0 }, { kind: 'inf' }] : [{ kind: 'after', t: 0 }];
  for (const s of samples) {
    const sol = at(s);
    for (const k of Object.keys(sol.compI)) imax = Math.max(imax, Math.abs(sol.compI[k]));
    if (c.storage) vmax = Math.max(vmax, Math.abs(sol.compV[c.storage]));
  }
  if (fo && fo.type === 'RC') vmax = Math.max(vmax, Math.abs(fo.x0plus), Math.abs(fo.xinf));
  return { fo, imax, vmax, at };
}

/** Scrubber position + play loop (1 tau per second of real time). */
export function useTimeline(tau: number, initial = SCRUB.beforeEnd / 2) {
  const [s, setS] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const last = useRef(0);
  const sRef = useRef(s);
  sRef.current = s;

  useEffect(() => {
    if (!playing) return;
    const speed = (SCRUB.infStart - SCRUB.zeroPlus) / SCRUB.tauSpan; // units per second
    const tick = (now: number) => {
      const dt = last.current ? (now - last.current) / 1000 : 0;
      last.current = now;
      let next = sRef.current + speed * dt;
      if (sRef.current < SCRUB.zeroPlus) next = SCRUB.zeroPlus;
      if (next >= SCRUB.infStart) {
        setS(SCRUB.max);
        setPlaying(false);
        return;
      }
      setS(next);
      raf.current = requestAnimationFrame(tick);
    };
    last.current = 0;
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const time = useMemo(() => scrubToTime(s, tau), [s, tau]);
  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const jump = useCallback((v: number) => {
    setPlaying(false);
    setS(v);
  }, []);
  return { s, setS: jump, time, playing, play, pause };
}

export function elapsedTau(time: TimeState, tau: number): number {
  if (time.kind === 'before') return -1;
  if (time.kind === 'inf') return 99;
  return isFinite(tau) && tau > 0 ? time.t / tau : time.t;
}
