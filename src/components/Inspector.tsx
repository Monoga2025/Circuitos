import { fmt } from '../engine/analysis';
import type { CircuitDefinition, Solution, TimeState } from '../engine/types';

/** Tap a component → what is it doing right now? (one line, no theory) */
export function inspectText(c: CircuitDefinition, id: string, sol: Solution, time: TimeState, imax: number): { title: string; line: string } {
  const comp = c.components.find((k) => k.id === id)!;
  const v = sol.compV[id];
  const i = sol.compI[id];
  const small = Math.abs(i) < imax * 0.02;
  switch (comp.kind) {
    case 'C': {
      const state = time.kind === 'before' || time.kind === 'inf' || small ? 'Lleno/estable: no entra corriente → ABIERTO' : i * v >= 0 ? 'Cargándose: entra corriente' : 'Descargándose: entrega energía';
      return { title: `Capacitor ${comp.display ?? ''}`, line: `v = ${fmt(v, 2)} V · i = ${fmt(i, 2)} A · w = ${fmt(0.5 * comp.value * v * v, 2)} J. ${state}` };
    }
    case 'L': {
      const state = Math.abs(v) < 0.01 ? 'Corriente estable: vL = 0 → CABLE' : 'La corriente está cambiando: vL ≠ 0';
      return { title: `Inductor ${comp.display ?? ''}`, line: `i = ${fmt(i, 2)} A · v = ${fmt(v, 2)} V · w = ${fmt(0.5 * comp.value * i * i, 2)} J. ${state}` };
    }
    case 'R':
      return { title: `Resistencia ${comp.display ?? ''}`, line: `v = ${fmt(v, 2)} V · i = ${fmt(i, 2)} A · calor p = ${fmt(i * i * comp.value, 2)} W` };
    case 'V':
      return { title: `Fuente ${comp.display ?? ''}`, line: `Entrega i = ${fmt(-i, 2)} A` };
    case 'I':
      return { title: `Fuente de corriente ${comp.display ?? ''}`, line: `Fuerza ${fmt(comp.value, 2)} A · su voltaje: ${fmt(-v, 2)} V` };
    case 'SW':
      return { title: 'Interruptor', line: time.kind === 'before' ? (comp.sw!.before ? 'Cerrado antes de t=0' : 'Abierto antes de t=0') : comp.sw!.after ? 'Cerrado después de t=0' : 'Abierto después de t=0' };
    default:
      return { title: comp.kind, line: `v = ${fmt(v, 2)} V · i = ${fmt(i, 2)} A` };
  }
}
