// Current through every wire segment, so electrons can be animated along wires.
// Inside each electrical node the wires usually form a tree: prune leaves using KCL.
import type { CircuitDefinition, Solution } from './types';

export function wireCurrents(c: CircuitDefinition, sol: Solution): number[] {
  const supply: Record<string, number> = {};
  for (const p of Object.keys(c.points)) supply[p] = 0;
  for (const comp of c.components) {
    const i = sol.compI[comp.id] ?? 0;
    supply[comp.a] -= i; // leaves point a into the component
    supply[comp.b] += i; // arrives at point b
  }
  const flows = new Array(c.wires.length).fill(0);
  const adj: Record<string, number[]> = {};
  c.wires.forEach(([p, q], w) => {
    (adj[p] ??= []).push(w);
    (adj[q] ??= []).push(w);
  });
  const done = new Array(c.wires.length).fill(false);
  const degree = (p: string) => (adj[p] ?? []).filter((w) => !done[w]).length;
  let progress = true;
  while (progress) {
    progress = false;
    for (const p of Object.keys(adj)) {
      if (degree(p) !== 1) continue;
      const w = adj[p].find((k) => !done[k])!;
      const [a, b] = c.wires[w];
      const other = a === p ? b : a;
      // flow from p to other equals what p must push out
      const f = supply[p];
      flows[w] = a === p ? f : -f; // positive = from wire[0] to wire[1]
      supply[other] += f;
      supply[p] = 0;
      done[w] = true;
      progress = true;
    }
  }
  return flows;
}
