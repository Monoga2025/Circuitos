// Drag C or L into the empty slot, run time to ∞, compare. Discovery: C blocks, L conducts.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView } from '../components/CircuitView';
import { OptionIcon } from '../components/Icons';
import { Meters } from '../components/Meters';
import { QuestionCard } from '../components/QuestionCard';
import { elapsedTau, useSim, useTimeline } from '../components/sim';
import { TimeScrubber } from '../components/TimeScrubber';
import { useDragDrop } from '../components/useDragDrop';
import { getCircuit, withSlot } from '../data/circuits';
import type { QuestionDef, Step } from '../data/model';
import { SCRUB } from '../engine/analysis';
import { StepLayout, StepTitle } from './Layout';
import { usePlayer, type StepProps } from './common';

const Q: QuestionDef = {
  id: 'slot-q',
  prompt: 'Después de mucho tiempo, ¿con cuál SIGUE pasando corriente?',
  skills: ['inductorDc', 'capacitorDc'],
  representation: 'slot',
  difficulty: 2,
  options: [
    { id: 'c', label: 'Con el capacitor', visual: { kind: 'icon', icon: 'capacitor' }, error: 'CONFUSION_DC_CAPACITOR' },
    { id: 'l', label: 'Con el inductor', visual: { kind: 'icon', icon: 'inductor' }, correct: true },
    { id: 'b', label: 'Con ambos', error: 'CONFUSION_DC_CAPACITOR' },
  ],
  success: 'C lleno = ABIERTO.  L estable = CABLE.',
};

export function SlotStep({ step, onDone }: StepProps<Extract<Step, { type: 'slot' }>>) {
  const { setHints, setContext, stepSkills } = usePlayer();
  const base = getCircuit('slot');
  const [kind, setKind] = useState<'C' | 'L' | null>(null);
  const [tried, setTried] = useState<{ C: boolean; L: boolean }>({ C: false, L: false });
  const circuit = useMemo(() => (kind ? withSlot(base, kind) : base), [kind, base]);

  useEffect(() => {
    setHints([
      { text: 'Arrastra C o L al hueco punteado.' },
      { text: 'Pulsa ▶ y lleva el tiempo a ∞. Mira la corriente.' },
      { text: 'Luego prueba con el otro.' },
    ]);
    stepSkills(step.skills);
    setContext('Arrastra un elemento al hueco y lleva el tiempo a ∞.');
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { start, ghost, over } = useDragDrop<'C' | 'L'>(
    (item, target) => {
      if (target === 'slot') place(item);
    },
    (item) => place(item),
  );

  const place = (k: 'C' | 'L') => {
    sfx.click();
    setKind(k);
  };

  return (
    <SlotInner
      key={kind ?? 'none'}
      kind={kind}
      circuit={circuit}
      over={over === 'slot'}
      onReachedInf={() => kind && setTried((t) => ({ ...t, [kind]: true }))}
      tried={tried}
      start={start}
      ghost={ghost}
      onDone={onDone}
    />
  );
}

function SlotInner({
  kind,
  circuit,
  over,
  onReachedInf,
  tried,
  start,
  ghost,
  onDone,
}: {
  kind: 'C' | 'L' | null;
  circuit: ReturnType<typeof getCircuit>;
  over: boolean;
  onReachedInf: () => void;
  tried: { C: boolean; L: boolean };
  start: (e: React.PointerEvent, item: 'C' | 'L', label: React.ReactNode) => void;
  ghost: React.ReactNode;
  onDone: () => void;
}) {
  const sim = useSim(circuit);
  const tau = sim.fo?.tau ?? 1;
  const tl = useTimeline(tau);
  const sol = sim.at(kind ? tl.time : { kind: 'after', t: 0 });
  const el = elapsedTau(tl.time, tau);
  useEffect(() => {
    if (kind && el >= 4) onReachedInf();
  }, [el >= 4]); // eslint-disable-line react-hooks/exhaustive-deps

  const both = tried.C && tried.L;
  const stage = (
    <div className="explore-stage">
      <StepTitle kicker="Laboratorio" title="¿Qué pasa si cambio la pieza?" />
      <div className={`circuit-wrap drop-zone ${over ? 'over' : ''}`} data-drop="slot">
        <CircuitView circuit={circuit} solution={sol} time={tl.time} imax={sim.imax} vmax={sim.vmax} highlight={kind ? [] : ['X']} />
        {!kind && <div className="drop-hint">Suelta aquí ↓</div>}
      </div>
      <div className="palette">
        {(['C', 'L'] as const).map((k) => (
          <button key={k} className={`chip-part ${kind === k ? 'active' : ''} ${tried[k] ? 'tried' : ''}`} onPointerDown={(e) => start(e, k, <PartLabel k={k} />)}>
            <PartLabel k={k} />
            {tried[k] && <span className="tick-ok">✓</span>}
          </button>
        ))}
      </div>
      <TimeScrubber
        s={tl.s}
        onChange={tl.setS}
        playing={tl.playing}
        onPlay={() => {
          if (tl.s >= SCRUB.infStart) tl.setS(SCRUB.beforeEnd / 2);
          tl.play();
        }}
        onPause={tl.pause}
        disabled={!kind}
      />
      {ghost}
    </div>
  );
  const panel = (
    <div className="explore-panel">
      {kind && <Meters circuit={circuit} solution={sol} imax={sim.imax} vmax={sim.vmax} />}
      <div className="checklist">
        <div className={tried.C ? 'ok' : ''}>{tried.C ? '✓' : '○'} Probar capacitor hasta ∞</div>
        <div className={tried.L ? 'ok' : ''}>{tried.L ? '✓' : '○'} Probar inductor hasta ∞</div>
      </div>
      {both && <QuestionCard q={Q} onSolved={() => onDone()} />}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}

function PartLabel({ k }: { k: 'C' | 'L' }) {
  return (
    <span className="part-label">
      <OptionIcon icon={k === 'C' ? 'capacitor' : 'inductor'} />
      {k === 'C' ? 'Capacitor' : 'Inductor'}
    </span>
  );
}
