// VER → TOCAR: flip the switch, watch electrons, charge, field and the curve.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView } from '../components/CircuitView';
import { inspectText } from '../components/Inspector';
import { Meters } from '../components/Meters';
import { ResponseGraph } from '../components/ResponseGraph';
import { elapsedTau, useSim, useTimeline } from '../components/sim';
import { TimeScrubber } from '../components/TimeScrubber';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { SCRUB, fmt } from '../engine/analysis';
import { StepLayout, StepTitle } from './Layout';
import { usePlayer, type StepProps } from './common';

export function ExploreStep({ step, onDone }: StepProps<Extract<Step, { type: 'explore' }>>) {
  const { setHints, setContext, stepSkills, hintLevel } = usePlayer();
  const c = getCircuit(step.circuit);
  const sim = useSim(c);
  const fo = sim.fo!;
  const tl = useTimeline(fo.tau);
  const [flipped, setFlipped] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);
  const [maxSeen, setMaxSeen] = useState(-1);

  useEffect(() => {
    setHints(step.hints ?? []);
    stepSkills(step.skills);
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sol = sim.at(tl.time);
  const el = elapsedTau(tl.time, fo.tau);
  useEffect(() => setMaxSeen((m) => Math.max(m, el)), [el]);

  const narration = useMemo(() => {
    if (!flipped || tl.time.kind === 'before') return step.prompt;
    return step.narration?.find((n) => el <= n.until)?.text ?? '';
  }, [flipped, el, tl.time.kind, step]);
  useEffect(() => setContext(narration), [narration]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = () => {
    sfx.flip();
    if (step.energyFlow) sfx.energy();
    setFlipped(true);
    tl.setS(SCRUB.zeroPlus - 6);
    setTimeout(() => tl.play(), 250);
  };

  const onComp = (id: string) => {
    const comp = c.components.find((k) => k.id === id)!;
    if (comp.kind === 'SW') {
      if (tl.time.kind === 'before') flip();
      else {
        tl.setS(SCRUB.beforeEnd / 2);
        sfx.flip();
      }
      return;
    }
    sfx.click();
    setInspect(id);
  };

  const done = flipped && (step.goal === 'flip' || maxSeen >= 4);

  // heat on resistors ∝ power
  const heat = useMemo(() => {
    const h: Record<string, number> = {};
    const pmax = Math.max(...c.components.filter((k) => k.kind === 'R').map((k) => sim.imax ** 2 * k.value));
    for (const k of c.components) if (k.kind === 'R') h[k.id] = (sol.compI[k.id] ** 2 * k.value) / (pmax || 1);
    return h;
  }, [sol, c, sim.imax]);

  const storage = c.components.find((k) => k.id === c.storage)!;
  const eNow = storage.kind === 'C' ? 0.5 * storage.value * sol.compV[storage.id] ** 2 : 0.5 * storage.value * sol.compI[storage.id] ** 2;
  const e0 = storage.kind === 'C' ? 0.5 * storage.value * fo.x0plus ** 2 : 0.5 * storage.value * fo.x0plus ** 2;
  const info = inspect ? inspectText(c, inspect, sol, tl.time, sim.imax) : null;

  const stage = (
    <div className="explore-stage">
      <StepTitle kicker="Explora" title={step.title} />
      <div className="circuit-wrap">
        <CircuitView
          circuit={c}
          solution={sol}
          time={tl.time}
          imax={sim.imax}
          vmax={sim.vmax}
          onComponentClick={onComp}
          highlight={[...(!flipped ? ['S'] : []), ...(step.hints?.slice(0, hintLevel).flatMap((h) => h.highlight ?? []) ?? [])]}
          heat={heat}
        />
        {!flipped && (
          <button className="btn big primary float-cta pulse" onClick={flip}>
            {step.title}
          </button>
        )}
        {info && (
          <div className="inspector pop-in" onClick={() => setInspect(null)}>
            <b>{info.title}</b>
            <span>{info.line}</span>
          </div>
        )}
      </div>
      <TimeScrubber s={tl.s} onChange={tl.setS} playing={tl.playing} onPlay={tl.play} onPause={tl.pause} />
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <Meters circuit={c} solution={sol} imax={sim.imax} vmax={sim.vmax} />
      {step.energyFlow && (
        <div className="energy-flow">
          <div className="ef-row">
            <span>⚡ en C</span>
            <div className="m-bar big c">
              <div style={{ width: `${(eNow / (e0 || 1)) * 100}%` }} />
            </div>
          </div>
          <div className="ef-row">
            <span>🔥 calor en R</span>
            <div className="m-bar big r">
              <div style={{ width: `${((e0 - eNow) / (e0 || 1)) * 100}%` }} />
            </div>
          </div>
          <div className="ef-note">Total = {fmt(e0, 2)} J (se conserva)</div>
        </div>
      )}
      <ResponseGraph fo={fo} time={tl.time} height={170} label={fo.type === 'RC' ? 'vC' : 'iL'} />
      <button className="btn primary wide" disabled={!done} onClick={() => onDone()}>
        {done ? 'Continuar →' : flipped ? 'Deja correr el tiempo…' : 'Toca el interruptor'}
      </button>
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
