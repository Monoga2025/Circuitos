import { fmt } from '../engine/analysis';
import type { CircuitDefinition, Probe, Solution } from '../engine/types';

interface Props {
  circuit: CircuitDefinition;
  solution: Solution;
  probes?: Probe[];
  imax: number;
  vmax: number;
  hidden?: boolean;
}

export function Meters({ circuit, solution, probes, imax, vmax, hidden }: Props) {
  const list = probes ?? circuit.probes ?? [];
  if (!list.length) return null;
  return (
    <div className="meters">
      {list.map((p) => {
        const comp = circuit.components.find((c) => c.id === p.comp)!;
        let val = 0;
        let unit = '';
        let ratio = 0;
        if (p.kind === 'v') {
          val = solution.compV[p.comp];
          unit = 'V';
          ratio = Math.abs(val) / (vmax || 1);
        } else if (p.kind === 'i') {
          val = solution.compI[p.comp];
          unit = 'A';
          ratio = Math.abs(val) / (imax || 1);
        } else {
          if (comp.kind === 'C') {
            val = 0.5 * comp.value * solution.compV[p.comp] ** 2;
            ratio = val / (0.5 * comp.value * vmax ** 2 || 1);
          } else {
            val = 0.5 * comp.value * solution.compI[p.comp] ** 2;
            ratio = val / (0.5 * comp.value * imax ** 2 || 1);
          }
          unit = 'J';
        }
        return (
          <div key={p.label} className={`meter m-${p.kind}`}>
            <div className="m-label">{p.label}</div>
            <div className="m-val">{hidden ? '?' : `${fmt(val, 2)} ${unit}`}</div>
            <div className="m-bar">
              <div style={{ width: `${Math.min(1, ratio) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
