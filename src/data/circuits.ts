// All circuits used by the game. Coordinates are in SVG units (grid of ~20).
// Convention: V source `a` is the + terminal. I source pushes current out of `a`
// (arrow points to `a`). Component current is measured a -> b through it.
import type { CircuitDefinition } from '../engine/types';

const C: Record<string, CircuitDefinition> = {};
const def = (c: CircuitDefinition) => {
  C[c.id] = c;
  return c;
};

// ───────────────────────── LAB 0: warm-up ─────────────────────────
def({
  id: 'w-ohm',
  points: { g: { x: 0, y: 160 }, t: { x: 0, y: 0 }, r1: { x: 240, y: 0 }, r2: { x: 240, y: 160 } },
  wires: [['t', 'r1'], ['r2', 'g']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 12, display: '12 V' },
    { id: 'R', kind: 'R', a: 'r1', b: 'r2', value: 4, display: '4 Ω' },
  ],
  ground: 'g',
});

def({
  id: 'w-par',
  points: {
    ta: { x: 0, y: 0 }, tb: { x: 0, y: 160 },
    a1: { x: 140, y: 0 }, b1: { x: 140, y: 160 },
    a2: { x: 260, y: 0 }, b2: { x: 260, y: 160 },
  },
  wires: [['ta', 'a1'], ['a1', 'a2'], ['tb', 'b1'], ['b1', 'b2']],
  components: [
    { id: 'R1', kind: 'R', a: 'a1', b: 'b1', value: 6, display: '6 Ω' },
    { id: 'R2', kind: 'R', a: 'a2', b: 'b2', value: 3, display: '3 Ω' },
  ],
  nodes: [{ point: 'ta', label: 'a' }, { point: 'tb', label: 'b' }],
  ground: 'tb',
});

def({
  id: 'w-kcl',
  points: {
    g1: { x: 0, y: 160 }, t1: { x: 0, y: 0 },
    t2: { x: 150, y: 0 }, g2: { x: 150, y: 160 },
    t3: { x: 300, y: 0 }, g3: { x: 300, y: 160 },
  },
  wires: [['t1', 't2'], ['t2', 't3'], ['g1', 'g2'], ['g2', 'g3']],
  components: [
    { id: 'I1', kind: 'I', a: 't1', b: 'g1', value: 5, display: '5 A' },
    { id: 'I2', kind: 'I', a: 'g2', b: 't2', value: 2, display: '2 A' },
    { id: 'R', kind: 'R', a: 't3', b: 'g3', value: 2, display: 'R', name: 'i = ?' },
  ],
  ground: 'g1',
});

def({
  id: 'w-vsrc',
  points: { g: { x: 0, y: 160 }, t: { x: 0, y: 0 }, r1: { x: 240, y: 0 }, r2: { x: 240, y: 160 } },
  wires: [['t', 'r1'], ['r2', 'g']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 9, display: '9 V' },
    { id: 'R', kind: 'R', a: 'r1', b: 'r2', value: 3, display: '3 Ω' },
  ],
  ground: 'g',
});

def({
  id: 'w-isrc',
  points: { g: { x: 0, y: 160 }, t: { x: 0, y: 0 }, r1: { x: 240, y: 0 }, r2: { x: 240, y: 160 } },
  wires: [['t', 'r1'], ['r2', 'g']],
  components: [
    { id: 'I', kind: 'I', a: 't', b: 'g', value: 2, display: '2 A' },
    { id: 'R', kind: 'R', a: 'r1', b: 'r2', value: 3, display: '3 Ω' },
  ],
  ground: 'g',
});

// ───────────────────────── LAB 1: capacitor ─────────────────────────
const chargeLayout = {
  points: {
    g: { x: 0, y: 200 }, t: { x: 0, y: 0 }, s: { x: 130, y: 0 }, r: { x: 290, y: 0 },
    ct: { x: 400, y: 0 }, cb: { x: 400, y: 200 },
  },
  wires: [['r', 'ct'], ['cb', 'g']] as [string, string][],
};

def({
  id: 'c-charge',
  ...chargeLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V', name: 'Batería' },
    { id: 'S', kind: 'SW', a: 't', b: 's', value: 0, sw: { before: false, after: true } },
    { id: 'R', kind: 'R', a: 's', b: 'r', value: 2, display: '2 Ω' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: '0,5 F' },
  ],
  ground: 'g',
  storage: 'C',
  initial: 0,
  probes: [
    { kind: 'i', comp: 'R', label: 'Corriente i' },
    { kind: 'v', comp: 'C', label: 'Voltaje vC' },
    { kind: 'energy', comp: 'C', label: 'Energía en C' },
  ],
});

def({
  id: 'c-hold',
  ...chargeLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V', name: 'Batería' },
    { id: 'S', kind: 'SW', a: 't', b: 's', value: 0, sw: { before: true, after: false } },
    { id: 'R', kind: 'R', a: 's', b: 'r', value: 2, display: '2 Ω' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: '0,5 F' },
  ],
  ground: 'g',
  storage: 'C',
  probes: [
    { kind: 'i', comp: 'R', label: 'Corriente i' },
    { kind: 'v', comp: 'C', label: 'Voltaje vC' },
    { kind: 'energy', comp: 'C', label: 'Energía en C' },
  ],
});

def({
  id: 'c-discharge',
  points: {
    cb: { x: 0, y: 200 }, ct: { x: 0, y: 0 }, s: { x: 160, y: 0 }, rt: { x: 320, y: 0 }, rb: { x: 320, y: 200 },
  },
  wires: [['s', 'rt'], ['rb', 'cb']],
  components: [
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: '0,5 F' },
    { id: 'S', kind: 'SW', a: 'ct', b: 's', value: 0, sw: { before: false, after: true } },
    { id: 'R', kind: 'R', a: 'rt', b: 'rb', value: 2, display: '2 Ω' },
  ],
  ground: 'cb',
  storage: 'C',
  initial: 10,
  probes: [
    { kind: 'v', comp: 'C', label: 'Voltaje vC' },
    { kind: 'energy', comp: 'C', label: 'Energía en C' },
    { kind: 'i', comp: 'R', label: 'Corriente en R' },
  ],
});

// ───────────────────────── LAB 2: inductor ─────────────────────────
def({
  id: 'l-charge',
  ...chargeLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V', name: 'Batería' },
    { id: 'S', kind: 'SW', a: 't', b: 's', value: 0, sw: { before: false, after: true } },
    { id: 'R', kind: 'R', a: 's', b: 'r', value: 2, display: '2 Ω' },
    { id: 'L', kind: 'L', a: 'ct', b: 'cb', value: 2, display: '2 H' },
  ],
  ground: 'g',
  storage: 'L',
  probes: [
    { kind: 'i', comp: 'L', label: 'Corriente iL' },
    { kind: 'v', comp: 'L', label: 'Voltaje vL' },
    { kind: 'energy', comp: 'L', label: 'Energía en L' },
  ],
});

/** Slot builder: the SLOT gets replaced by C or L at runtime (see withSlot). */
def({
  id: 'slot',
  ...chargeLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V' },
    { id: 'S', kind: 'SW', a: 't', b: 's', value: 0, sw: { before: false, after: true } },
    { id: 'R', kind: 'R', a: 's', b: 'r', value: 2, display: '2 Ω' },
    { id: 'X', kind: 'SLOT', a: 'ct', b: 'cb', value: 0 },
  ],
  ground: 'g',
});

export function withSlot(c: CircuitDefinition, kind: 'C' | 'L'): CircuitDefinition {
  return {
    ...c,
    id: `${c.id}-${kind}`,
    storage: 'X',
    components: c.components.map((k) =>
      k.kind === 'SLOT'
        ? { ...k, kind, value: kind === 'C' ? 0.5 : 2, display: kind === 'C' ? '0,5 F' : '2 H' }
        : k,
    ),
    probes: [
      { kind: 'i', comp: 'R', label: 'Corriente i' },
      { kind: 'v', comp: 'X', label: `Voltaje en ${kind}` },
    ],
  };
}

// Two simple switching circuits used for "what survives the jump?"
def({
  id: 'jump-rc',
  points: {
    g: { x: 0, y: 200 }, t: { x: 0, y: 0 }, r: { x: 160, y: 0 }, s: { x: 290, y: 0 },
    ct: { x: 400, y: 0 }, cb: { x: 400, y: 200 }, rt: { x: 530, y: 0 }, rb: { x: 530, y: 200 },
  },
  wires: [['s', 'ct'], ['ct', 'rt'], ['cb', 'g'], ['rb', 'cb']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 12, display: '12 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'r', value: 2, display: '2 Ω' },
    { id: 'S', kind: 'SW', a: 'r', b: 's', value: 0, sw: { before: true, after: false } },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.25, display: '0,25 F' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 6, display: '6 Ω' },
  ],
  ground: 'g',
  storage: 'C',
});

// ───────────────────────── LAB 3: time machine ─────────────────────────
const tmLayout = {
  points: {
    g: { x: 0, y: 220 }, t: { x: 0, y: 0 }, r: { x: 160, y: 0 }, s: { x: 300, y: 0 },
    ct: { x: 420, y: 0 }, cb: { x: 420, y: 220 }, rt: { x: 560, y: 0 }, rb: { x: 560, y: 220 },
  },
  wires: [['s', 'ct'], ['ct', 'rt'], ['cb', 'g'], ['rb', 'cb']] as [string, string][],
};

def({
  id: 'tm-rc-discharge',
  ...tmLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 12, display: '12 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'r', value: 2, display: '2 Ω' },
    { id: 'S', kind: 'SW', a: 'r', b: 's', value: 0, sw: { before: true, after: false }, display: 't = 0' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.25, display: '0,25 F', name: 'v' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 6, display: '6 Ω' },
  ],
  ground: 'g',
  storage: 'C',
  probes: [{ kind: 'v', comp: 'C', label: 'vC' }, { kind: 'i', comp: 'R2', label: 'i en 6 Ω' }],
});

def({
  id: 'tm-rc-charge',
  ...tmLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 20, display: '20 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'r', value: 10, display: '10 Ω' },
    { id: 'S', kind: 'SW', a: 'r', b: 's', value: 0, sw: { before: false, after: true }, display: 't = 0' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.1, display: '0,1 F', name: 'v' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 10, display: '10 Ω' },
  ],
  ground: 'g',
  storage: 'C',
  probes: [{ kind: 'v', comp: 'C', label: 'vC' }, { kind: 'i', comp: 'R1', label: 'i en R1' }],
});

// ───────────────────────── LAB 4: Req hunt ─────────────────────────
def({
  id: 'req-1',
  points: {
    g: { x: 0, y: 220 }, t: { x: 0, y: 0 }, a: { x: 180, y: 0 },
    ct: { x: 260, y: 0 }, cb: { x: 260, y: 220 },
    rt: { x: 380, y: 0 }, rb: { x: 380, y: 220 },
    m: { x: 560, y: 0 }, ib: { x: 560, y: 220 },
  },
  wires: [['a', 'ct'], ['ct', 'rt'], ['g', 'cb'], ['cb', 'rb'], ['rb', 'ib']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 12, display: '12 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'a', value: 4, display: '4 Ω' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: '0,5 F' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 12, display: '12 Ω' },
    { id: 'R3', kind: 'R', a: 'm', b: 'rt', value: 6, display: '6 Ω' },
    { id: 'I', kind: 'I', a: 'm', b: 'ib', value: 2, display: '2 A' },
  ],
  ground: 'g',
  storage: 'C',
});

def({
  id: 'req-2',
  points: {
    g: { x: 0, y: 220 }, t: { x: 0, y: 0 }, m: { x: 180, y: 0 }, mb: { x: 180, y: 220 },
    n: { x: 360, y: 0 }, ct: { x: 420, y: 0 }, cb: { x: 420, y: 220 },
  },
  wires: [['n', 'ct'], ['g', 'mb'], ['mb', 'cb']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'm', value: 2, display: '2 Ω' },
    { id: 'R2', kind: 'R', a: 'm', b: 'mb', value: 8, display: '8 Ω' },
    { id: 'R3', kind: 'R', a: 'm', b: 'n', value: 4, display: '4 Ω' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: '0,5 F' },
  ],
  ground: 'g',
  storage: 'C',
});

def({
  id: 'req-dep',
  points: {
    g: { x: 0, y: 220 }, t: { x: 0, y: 0 }, a: { x: 180, y: 0 },
    dt: { x: 260, y: 0 }, db: { x: 260, y: 220 },
    rt: { x: 380, y: 0 }, rb: { x: 380, y: 220 },
    ct: { x: 500, y: 0 }, cb: { x: 500, y: 220 },
  },
  wires: [['a', 'dt'], ['dt', 'rt'], ['rt', 'ct'], ['g', 'db'], ['db', 'rb'], ['rb', 'cb']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'a', value: 5, display: '5 Ω' },
    { id: 'D', kind: 'VCCS', a: 'db', b: 'dt', value: 0.1, ctrl: { p: 'dt', n: 'db' }, display: '0,1·v' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 10, display: '10 Ω' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.2, display: '0,2 F' },
  ],
  ground: 'g',
  storage: 'C',
});

// ───────────────────────── LAB 5: real class exercise ─────────────────────────
// C = 0.2 F, 5 Ω, 10 Ω, 3 A, 20u(-t) V.  v(0+) = 20, v(inf) = 10, Req = 10/3, tau = 2/3 s.
def({
  id: 'clase',
  title: 'Ejercicio de clase',
  points: {
    g: { x: 0, y: 240 }, t: { x: 0, y: 0 }, a: { x: 220, y: 0 }, cb: { x: 220, y: 240 },
    s: { x: 380, y: 0 }, r10t: { x: 480, y: 0 }, r10b: { x: 480, y: 240 },
    it: { x: 620, y: 0 }, ib: { x: 620, y: 240 },
  },
  wires: [['g', 'cb'], ['cb', 'r10b'], ['r10b', 'ib'], ['s', 'r10t'], ['r10t', 'it']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 20, active: 'before', display: '20u(−t) V' },
    { id: 'R5', kind: 'R', a: 't', b: 'a', value: 5, display: '5 Ω', name: 'i →' },
    { id: 'C', kind: 'C', a: 'a', b: 'cb', value: 0.2, display: '0,2 F', name: 'v' },
    { id: 'S', kind: 'SW', a: 'a', b: 's', value: 0, sw: { before: false, after: true }, display: 't = 0' },
    { id: 'R10', kind: 'R', a: 'r10t', b: 'r10b', value: 10, display: '10 Ω' },
    { id: 'I', kind: 'I', a: 'it', b: 'ib', value: 3, display: '3 A' },
  ],
  ground: 'g',
  storage: 'C',
  nodes: [{ point: 'a', label: '+v' }],
  probes: [{ kind: 'v', comp: 'C', label: 'v(t)' }, { kind: 'i', comp: 'R5', label: 'i(t) en 5 Ω' }],
});

// ───────────────────────── LAB 6: RL ─────────────────────────
def({
  id: 'tm-rl-discharge',
  ...tmLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 12, display: '12 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'r', value: 2, display: '2 Ω' },
    { id: 'S', kind: 'SW', a: 'r', b: 's', value: 0, sw: { before: true, after: false }, display: 't = 0' },
    { id: 'L', kind: 'L', a: 'ct', b: 'cb', value: 3, display: '3 H', name: 'i ↓' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 6, display: '6 Ω' },
  ],
  ground: 'g',
  storage: 'L',
  probes: [{ kind: 'i', comp: 'L', label: 'iL' }, { kind: 'v', comp: 'L', label: 'vL' }],
});

def({
  id: 'rl-step',
  ...tmLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'r', value: 5, display: '5 Ω' },
    { id: 'S', kind: 'SW', a: 'r', b: 's', value: 0, sw: { before: false, after: true }, display: 't = 0' },
    { id: 'L', kind: 'L', a: 'ct', b: 'cb', value: 2, display: '2 H', name: 'i ↓' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 20, display: '20 Ω' },
  ],
  ground: 'g',
  storage: 'L',
  probes: [{ kind: 'i', comp: 'L', label: 'iL' }, { kind: 'v', comp: 'L', label: 'vL' }],
});

// ───────────────────────── LAB 7/8: bosses ─────────────────────────
def({
  id: 'boss-rc',
  points: {
    g: { x: 0, y: 240 }, t: { x: 0, y: 0 }, a: { x: 180, y: 0 },
    r12t: { x: 260, y: 0 }, r12b: { x: 260, y: 240 },
    ct: { x: 380, y: 0 }, cb: { x: 380, y: 240 },
    s: { x: 500, y: 0 }, r6t: { x: 600, y: 0 }, r6b: { x: 600, y: 240 },
  },
  wires: [['a', 'r12t'], ['r12t', 'ct'], ['g', 'r12b'], ['r12b', 'cb'], ['cb', 'r6b'], ['s', 'r6t']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 24, display: '24 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'a', value: 4, display: '4 Ω' },
    { id: 'R2', kind: 'R', a: 'r12t', b: 'r12b', value: 12, display: '12 Ω' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: '0,5 F', name: 'v' },
    { id: 'S', kind: 'SW', a: 'ct', b: 's', value: 0, sw: { before: false, after: true }, display: 't = 0' },
    { id: 'R3', kind: 'R', a: 'r6t', b: 'r6b', value: 6, display: '6 Ω' },
  ],
  ground: 'g',
  storage: 'C',
  probes: [{ kind: 'v', comp: 'C', label: 'v(t)' }, { kind: 'i', comp: 'R3', label: 'i en 6 Ω' }],
});

def({
  id: 'boss-rl',
  points: {
    g: { x: 0, y: 240 }, t: { x: 0, y: 0 },
    r1t: { x: 150, y: 0 }, r1b: { x: 150, y: 240 },
    q1: { x: 290, y: 0 }, q2: { x: 290, y: 110 }, q3: { x: 290, y: 240 },
    b: { x: 470, y: 0 }, lb: { x: 470, y: 240 },
  },
  wires: [['t', 'r1t'], ['r1t', 'q1'], ['g', 'r1b'], ['r1b', 'q3'], ['q3', 'lb']],
  components: [
    { id: 'I', kind: 'I', a: 't', b: 'g', value: 6, display: '6 A' },
    { id: 'R1', kind: 'R', a: 'r1t', b: 'r1b', value: 3, display: '3 Ω' },
    { id: 'S', kind: 'SW', a: 'q1', b: 'q2', value: 0, sw: { before: false, after: true }, display: 't = 0' },
    { id: 'R3', kind: 'R', a: 'q2', b: 'q3', value: 6, display: '6 Ω' },
    { id: 'R2', kind: 'R', a: 'q1', b: 'b', value: 6, display: '6 Ω' },
    { id: 'L', kind: 'L', a: 'b', b: 'lb', value: 4, display: '4 H', name: 'i ↓' },
  ],
  ground: 'g',
  storage: 'L',
  probes: [{ kind: 'i', comp: 'L', label: 'iL' }, { kind: 'v', comp: 'L', label: 'vL' }],
});

def({
  id: 'exam-rc',
  ...tmLayout,
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: '10 V' },
    { id: 'R1', kind: 'R', a: 't', b: 'r', value: 5, display: '5 Ω' },
    { id: 'S', kind: 'SW', a: 'r', b: 's', value: 0, sw: { before: true, after: false }, display: 't = 0' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.05, display: '0,05 F', name: 'v' },
    { id: 'R2', kind: 'R', a: 'rt', b: 'rb', value: 20, display: '20 Ω' },
  ],
  ground: 'g',
  storage: 'C',
  probes: [{ kind: 'v', comp: 'C', label: 'vC' }],
});

// Tiny isolated circuits for "No entiendo nada" reductions
def({
  id: 'mini-c',
  points: { g: { x: 0, y: 160 }, t: { x: 0, y: 0 }, r: { x: 150, y: 0 }, ct: { x: 260, y: 0 }, cb: { x: 260, y: 160 } },
  wires: [['r', 'ct'], ['cb', 'g']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: 'DC' },
    { id: 'R', kind: 'R', a: 't', b: 'r', value: 2, display: 'R' },
    { id: 'C', kind: 'C', a: 'ct', b: 'cb', value: 0.5, display: 'C' },
  ],
  ground: 'g',
  storage: 'C',
  initial: 0,
});

def({
  id: 'mini-l',
  points: { g: { x: 0, y: 160 }, t: { x: 0, y: 0 }, r: { x: 150, y: 0 }, ct: { x: 260, y: 0 }, cb: { x: 260, y: 160 } },
  wires: [['r', 'ct'], ['cb', 'g']],
  components: [
    { id: 'V', kind: 'V', a: 't', b: 'g', value: 10, display: 'DC' },
    { id: 'R', kind: 'R', a: 't', b: 'r', value: 2, display: 'R' },
    { id: 'L', kind: 'L', a: 'ct', b: 'cb', value: 2, display: 'L' },
  ],
  ground: 'g',
  storage: 'L',
  initial: 0,
});

export const circuits = C;
export function getCircuit(id: string): CircuitDefinition {
  const c = C[id];
  if (!c) throw new Error(`Unknown circuit ${id}`);
  return c;
}
