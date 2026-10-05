// Core data model for pedagogical first-order circuits.
//
// A circuit is drawn on a grid of named points. Wires join points (zero ohm),
// components sit between two points. Electrical nodes are derived by merging
// points joined by wires.

export type ComponentKind =
  | 'R' // resistor
  | 'V' // independent DC voltage source, v(a) - v(b) = value (a = '+')
  | 'I' // independent DC current source, pushes `value` A out of terminal a (arrow points to a)
  | 'C' // capacitor (F)
  | 'L' // inductor (H)
  | 'SW' // ideal switch
  | 'VCCS' // dependent current source: i (into a) = gain * (v(ctrl.p) - v(ctrl.n))
  | 'SLOT'; // empty drop zone (open until something is dropped in)

/** When an independent source is ON. 'before' models e.g. 20u(-t), 'after' models u(t). */
export type SourceActivity = 'always' | 'before' | 'after';

export interface SwitchState {
  before: boolean; // closed for t < 0 ?
  after: boolean; // closed for t > 0 ?
}

export interface ComponentDefinition {
  id: string;
  kind: ComponentKind;
  a: string;
  b: string;
  value: number;
  /** Short name shown on the schematic, e.g. "R1" */
  name?: string;
  /** Value text shown on the schematic, e.g. "20u(−t) V" */
  display?: string;
  active?: SourceActivity;
  sw?: SwitchState;
  ctrl?: { p: string; n: string };
  /** Label side relative to the component axis */
  labelSide?: 1 | -1;
}

export interface Point {
  x: number;
  y: number;
}

/** A labelled node for the student (e.g. "a", "+v−"). */
export interface NodeDefinition {
  point: string;
  label: string;
}

export interface CircuitDefinition {
  id: string;
  title?: string;
  points: Record<string, Point>;
  wires: [string, string][];
  components: ComponentDefinition[];
  ground: string;
  /** id of the energy-storage element (C or L) when the circuit is first order */
  storage?: string;
  /** Override for the initial condition (vC(0-) or iL(0-)). */
  initial?: number;
  nodes?: NodeDefinition[];
  /** Probe definitions shown in the meters panel */
  probes?: Probe[];
  /** Viewbox override */
  view?: { x: number; y: number; w: number; h: number };
}

export type Probe =
  | { kind: 'v'; comp: string; label: string }
  | { kind: 'i'; comp: string; label: string }
  | { kind: 'energy'; comp: string; label: string };

/** Discrete time instants used everywhere in the UI. */
export type TimeState =
  | { kind: 'before' } // t < 0  (also t = 0-)
  | { kind: 'after'; t: number } // t >= 0+ (seconds)
  | { kind: 'inf' }; // t -> infinity

/** How the storage element is represented in a particular solve. */
export type StorageMode =
  | { mode: 'open' }
  | { mode: 'short' }
  | { mode: 'vsrc'; value: number }
  | { mode: 'isrc'; value: number }
  | { mode: 'removed' };

export interface SolveOptions {
  phase: 'before' | 'after';
  storage?: StorageMode;
  /** Turn off all independent sources (V -> short, I -> open). Dependent sources stay. */
  deactivate?: boolean;
  /** Extra test current source injected into point a from point b (for Req). */
  testSource?: { a: string; b: string; value: number };
}

export interface Solution {
  /** Voltage at every point */
  pointV: Record<string, number>;
  /** Current through each component, measured from a to b through the component */
  compI: Record<string, number>;
  /** Voltage across each component v(a) - v(b) */
  compV: Record<string, number>;
}

export interface FirstOrderResult {
  type: 'RC' | 'RL';
  /** variable name: 'v' for RC (vC), 'i' for RL (iL) */
  variable: 'v' | 'i';
  unit: 'V' | 'A';
  x0minus: number;
  x0plus: number;
  xinf: number;
  Req: number;
  tau: number;
  storageValue: number;
}
