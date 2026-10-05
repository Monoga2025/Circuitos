import { useEffect, useMemo } from 'react';
import { CircuitView } from '../components/CircuitView';
import { Meters } from '../components/Meters';
import { QuestionCard } from '../components/QuestionCard';
import { useLoopTime } from '../components/Remediation';
import { useSim } from '../components/sim';
import { getCircuit } from '../data/circuits';
import type { Hint, QuestionDef, QuestionVisual } from '../data/model';
import { StepLayout, StepTitle } from './Layout';
import { usePlayer } from './common';

const GUIDANCE_LABEL = { guided: 'Ejemplo guiado', partial: 'Con poca ayuda', free: 'Sin guía', transfer: 'Transferencia' };

export function QuestionStep({
  q,
  guidance,
  onDone,
  kicker,
}: {
  q: QuestionDef;
  guidance?: keyof typeof GUIDANCE_LABEL;
  onDone: () => void;
  kicker?: string;
}) {
  const { setHints, stepSkills, setContext } = usePlayer();
  useEffect(() => {
    const auto: Hint[] = q.hints ?? [];
    const v = q.visual;
    const hints: Hint[] = auto.length
      ? auto
      : [
          { text: v?.highlight ? 'Mira lo que brilla.' : 'Piensa en qué pasa después de mucho tiempo vs. justo en el salto.', highlight: v?.highlight },
          { text: 'Imagina la transformación: C → abierto, L → cable, fuente apagada → corto/abierto.' },
          { text: 'Descartamos una opción incorrecta.' },
        ];
    setHints(hints);
    stepSkills(q.skills);
    setContext(guidance ? GUIDANCE_LABEL[guidance] : '');
  }, [q.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = <QuestionCard q={q} onSolved={() => onDone()} />;
  if (!q.visual) {
    return <StepLayout stage={<div className="concept-stage">{kicker && <StepTitle kicker={kicker} title="" />}{card}</div>} />;
  }
  return <StepLayout stage={<VisualStage v={q.visual} hints={q.hints} />} panel={<>{kicker && <div className="kicker">{kicker}</div>}{card}</>} />;
}

function VisualStage({ v, hints }: { v: QuestionVisual; hints?: Hint[] }) {
  const { hintLevel } = usePlayer();
  const c = getCircuit(v.circuit);
  const sim = useSim(c);
  const loop = useLoopTime(sim.fo?.tau ?? 1, 5);
  const hintTime = hints?.slice(0, hintLevel).reverse().find((h) => h.time)?.time;
  const time = hintTime ?? (v.play ? loop : v.time ?? { kind: 'after' as const, t: 0 });
  const sol = sim.at(time);
  const hl = useMemo(() => {
    const fromHints = hints?.slice(0, hintLevel).flatMap((h) => h.highlight ?? []) ?? [];
    return [...(v.highlight ?? []), ...fromHints];
  }, [v, hints, hintLevel]);
  return (
    <div className="visual-stage">
      <CircuitView circuit={c} solution={sol} time={time} imax={sim.imax} vmax={sim.vmax} highlight={hl} showFlow={!v.hideFlow} />
      {!v.hideValues && c.probes && <Meters circuit={c} solution={sol} imax={sim.imax} vmax={sim.vmax} />}
    </div>
  );
}
