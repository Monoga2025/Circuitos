// Tiny Modified Nodal Analysis solver for DC snapshots of pedagogical circuits.
import type { CircuitDefinition, ComponentDefinition, SolveOptions, Solution, StorageMode } from './types';

const GMIN = 1e-9; // keeps floating nodes solvable (e.g. open capacitor branches)

/** Union-find over wires: maps every point to an electrical node id (a representative point). */
export function electricalNodes(c: CircuitDefinition): Record<string, string> {
  const parent: Record<string, string> = {};
  for (const p of Object.keys(c.points)) parent[p] = p;
  const find = (x: string): string => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const [p, q] of c.wires) {
    const rp = find(p);
    const rq = find(q);
    if (rp !== rq) parent[rp] = rq;
  }
  const out: Record<string, string> = {};
  for (const p of Object.keys(c.points)) out[p] = find(p);
  return out;
}

type Elem =
  | { t: 'G'; a: number; b: number; g: number }
  | { t: 'V'; a: number; b: number; v: number; key: string }
  | { t: 'I'; a: number; b: number; iab: number } // current a->b through the element
  | { t: 'VCCS'; a: number; b: number; p: number; n: number; gain: number };

function sourceOn(comp: ComponentDefinition, phase: 'before' | 'after'): boolean {
  const act = comp.active ?? 'always';
  return act === 'always' || act === phase;
}

export function solve(c: CircuitDefinition, opts: SolveOptions): Solution {
  const nodeOf = electricalNodes(c);
  const groundNode = nodeOf[c.ground];
  const uniq = Array.from(new Set(Object.values(nodeOf))).filter((n) => n !== groundNode);
  const idx: Record<string, number> = {};
  uniq.forEach((n, i) => (idx[n] = i));
  const ni = (point: string) => {
    const n = nodeOf[point];
    if (n === undefined) throw new Error(`Unknown point ${point} in ${c.id}`);
    return n === groundNode ? -1 : idx[n];
  };

  const elems: Elem[] = [];
  // How each component current is recovered after the solve
  const currentOf: Record<string, (x: number[], vkeys: Record<string, number>) => number> = {};

  const addV = (comp: string, a: number, b: number, v: number) => {
    elems.push({ t: 'V', a, b, v, key: comp });
    currentOf[comp] = (x, vk) => x[vk[comp]];
  };

  for (const comp of c.components) {
    const a = ni(comp.a);
    const b = ni(comp.b);
    const kind = comp.kind;
    const value = comp.value;
    const isStorage = comp.id === c.storage;
    switch (kind) {
      case 'SLOT': // an empty slot is an open circuit
        currentOf[comp.id] = () => 0;
        break;
      case 'R':
        elems.push({ t: 'G', a, b, g: 1 / value });
        currentOf[comp.id] = (x) => (volt(x, a) - volt(x, b)) / value;
        break;
      case 'V': {
        const on = !opts.deactivate && sourceOn(comp, opts.phase);
        addV(comp.id, a, b, on ? value : 0); // an OFF voltage source is a short
        break;
      }
      case 'I': {
        const on = !opts.deactivate && sourceOn(comp, opts.phase);
        const iab = on ? -value : 0; // an OFF current source is an open
        elems.push({ t: 'I', a, b, iab });
        currentOf[comp.id] = () => iab;
        break;
      }
      case 'VCCS': {
        const p = ni(comp.ctrl!.p);
        const n = ni(comp.ctrl!.n);
        elems.push({ t: 'VCCS', a, b, p, n, gain: value });
        currentOf[comp.id] = (x) => -value * (volt(x, p) - volt(x, n));
        break;
      }
      case 'SW': {
        const closed = opts.phase === 'before' ? comp.sw!.before : comp.sw!.after;
        if (closed) addV(comp.id, a, b, 0);
        else currentOf[comp.id] = () => 0;
        break;
      }
      case 'C':
      case 'L': {
        // Default representation if the element is not the analysed storage: DC steady state.
        const mode: StorageMode = isStorage && opts.storage ? opts.storage : { mode: kind === 'C' ? 'open' : 'short' };
        switch (mode.mode) {
          case 'open':
          case 'removed':
            currentOf[comp.id] = () => 0;
            break;
          case 'short':
            addV(comp.id, a, b, 0);
            break;
          case 'vsrc':
            addV(comp.id, a, b, mode.value);
            break;
          case 'isrc':
            elems.push({ t: 'I', a, b, iab: mode.value });
            currentOf[comp.id] = () => mode.value;
            break;
        }
        break;
      }
    }
  }

  if (opts.testSource) {
    const a = ni(opts.testSource.a);
    const b = ni(opts.testSource.b);
    elems.push({ t: 'I', a, b, iab: -opts.testSource.value });
  }

  // Assemble
  const nN = uniq.length;
  const vsrcs = elems.filter((e) => e.t === 'V') as Extract<Elem, { t: 'V' }>[];
  const n = nN + vsrcs.length;
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const z: number[] = new Array(n).fill(0);
  const vkeys: Record<string, number> = {};
  for (let i = 0; i < nN; i++) A[i][i] += GMIN;
  let k = nN;
  for (const e of elems) {
    if (e.t === 'G') {
      stamp(A, e.a, e.a, e.g);
      stamp(A, e.b, e.b, e.g);
      stamp(A, e.a, e.b, -e.g);
      stamp(A, e.b, e.a, -e.g);
    } else if (e.t === 'V') {
      // unknown j = current entering the element at a
      stamp(A, e.a, k, 1);
      stamp(A, e.b, k, -1);
      stamp(A, k, e.a, 1);
      stamp(A, k, e.b, -1);
      z[k] = e.v;
      vkeys[e.key] = k;
      k++;
    } else if (e.t === 'I') {
      // current leaving node a through element = iab
      if (e.a >= 0) z[e.a] -= e.iab;
      if (e.b >= 0) z[e.b] += e.iab;
    } else if (e.t === 'VCCS') {
      // current into node a = gain (vp - vn)  => leaving a = -gain(vp - vn)
      stamp(A, e.a, e.p, -e.gain);
      stamp(A, e.a, e.n, e.gain);
      stamp(A, e.b, e.p, e.gain);
      stamp(A, e.b, e.n, -e.gain);
    }
  }

  const x = gauss(A, z);

  const pointV: Record<string, number> = {};
  for (const p of Object.keys(c.points)) {
    const id = ni(p);
    pointV[p] = id < 0 ? 0 : x[id];
  }
  const compI: Record<string, number> = {};
  const compV: Record<string, number> = {};
  for (const comp of c.components) {
    compV[comp.id] = pointV[comp.a] - pointV[comp.b];
    compI[comp.id] = currentOf[comp.id] ? currentOf[comp.id](x, vkeys) : 0;
  }
  return { pointV, compI, compV };
}

function volt(x: number[], i: number): number {
  return i < 0 ? 0 : x[i];
}

function stamp(A: number[][], r: number, c: number, v: number) {
  if (r < 0 || c < 0) return;
  A[r][c] += v;
}

function gauss(Ain: number[][], zin: number[]): number[] {
  const n = zin.length;
  const A = Ain.map((r) => r.slice());
  const z = zin.slice();
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-15) continue; // singular column: leave as 0
    [A[col], A[piv]] = [A[piv], A[col]];
    [z[col], z[piv]] = [z[piv], z[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      if (f === 0) continue;
      for (let cc = col; cc < n; cc++) A[r][cc] -= f * A[col][cc];
      z[r] -= f * z[col];
    }
  }
  return z.map((v, i) => (Math.abs(A[i][i]) < 1e-15 ? 0 : v / A[i][i]));
}
