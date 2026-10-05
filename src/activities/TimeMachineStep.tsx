// LA MÁQUINA DEL TIEMPO: ANTES (0⁻) → JUSTO DESPUÉS (0⁺) → MUCHO DESPUÉS (∞).
// The circuit physically transforms: C → open / L → wire / C → "battery" at 0⁺.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView, type RenderMode } from '../components/CircuitView';
import { QuestionCard } from '../components/QuestionCard';
import { ResponseGraph } from '../components/ResponseGraph';
import { useSim, useTimeline } from '../components/sim';
import { TimeScrubber } from '../components/TimeScrubber';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { fmt } from '../engine/analysis';
import type { TimeState } from '../engine/types';
import { StepLayout, StepTitle } from './Layout';
import { usePlayer, type StepProps } from './common';
import { phaseQuestion } from './numeric';

export const TM_PHASES = [
  { key: 'x0m' as const, btn: 'ANTES', sub: 't = 0⁻ · circuito viejo', time: { kind: 'before' } as TimeState },
  { key: 'x0p' as const, btn: 'JUSTO DESPUÉS', sub: 't = 0⁺ · lo guardado se conserva', time: { kind: 'after', t: 0 } as TimeState },
  { key: 'xinf' as const, btn: 'MUCHO DESPUÉS', sub: 't → ∞ · DC estable', time: { kind: 'inf' } as TimeState },
];

export function TimeMachineStep({ step, onDone }: StepProps<Extract<Step, { type: 'timeMachine' }>>) {
  const { setHints, setContext, stepSkills, hintLevel } = usePlayer();
  const c = getCircuit(step.circuit);
  const sim = useSim(c);
  const fo = sim.fo!;
  const isC = fo.type === 'RC';
  const x = isC ? 'vC' : 'iL';
  const [view, setView] = useState<number | null>(null); // which photo is shown
  const [solved, setSolved] = useState(0); // phases answered
  const [warn, setWarn] = useState('');
  const tl = useTimeline(fo.tau);
  const movie = solved >= 3;

  useEffect(() => {
    setHints([
      { text: `Pulsa ${TM_PHASES[Math.min(solved, 2)].btn}.`, highlight: [c.storage!, 'S'] },
      { text: isC ? 'Antes y en ∞: C = circuito abierto. En 0⁺: C = batería con su voltaje viejo.' : 'Antes y en ∞: L = cable. En 0⁺: L = fuente de corriente con su corriente vieja.' },
      { text: 'Con el elemento transformado, usa divisor de voltaje / Ohm.' },
    ]);
    stepSkills(['initialCondition', isC ? 'capacitorContinuity' : 'inductorContinuity', 'finalCondition']);
  }, [step.id, solved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (movie) setContext('La película completa: arrastra el tiempo o pulsa ▶.');
    else if (view === null) setContext(`Tres fotos. Empieza por ${TM_PHASES[solved].btn}.`);
    else setContext(TM_PHASES[view].sub);
  }, [view, solved, movie]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = useMemo(() => TM_PHASES.map((p) => phaseQuestion(c, fo, p.key)), [c, fo]);

  const press = (k: number) => {
    if (movie) return;
    if (k > solved) {
      sfx.wrong();
      setWarn(k === 1 ? `Para saber ${x}(0⁺) necesitas ${x}(0⁻): primero ANTES.` : `Primero termina ${TM_PHASES[solved].btn}.`);
      return;
    }
    setWarn('');
    sfx.flip();
    setView(k);
  };

  const shown = movie ? null : view;
  const time: TimeState = movie ? tl.time : shown !== null ? TM_PHASES[shown].time : { kind: 'before' };
  const modes: Record<string, RenderMode> = {};
  if (shown === 0 || shown === 2) modes[c.storage!] = isC ? 'open' : 'short';
  if (shown === 1) modes[c.storage!] = 'asSource';
  const sourceLabel = shown === 1 ? `${x}(0⁺) = ${solved > 1 ? `${fmt(fo.x0plus)} ${fo.unit}` : '?'}` : undefined;
  const sol = sim.at(time);

  const stage = (
    <div className="tm-stage">
      <StepTitle kicker="Máquina del tiempo" title={movie ? 'La película completa' : 'Tres fotos del mismo circuito'} />
      <div className="tm-buttons">
        {TM_PHASES.map((p, k) => (
          <button
            key={p.key}
            className={`tm-btn ${shown === k ? 'active' : ''} ${k < solved ? 'done' : ''} ${k === solved && !movie && (step.guidance === 'guided' || hintLevel > 0) ? 'pulse' : ''}`}
            onClick={() => press(k)}
            disabled={movie || (step.guidance === 'guided' && k > solved)}
          >
            <span className="tm-btn-title">{p.btn}</span>
            <span className="tm-btn-sub">{k < solved ? `${x} = ${fmt([fo.x0minus, fo.x0plus, fo.xinf][k])} ${fo.unit}` : p.sub}</span>
          </button>
        ))}
      </div>
      <div className="circuit-wrap">
        <CircuitView
          key={`${shown}`}
          circuit={c}
          solution={shown === null && !movie ? undefined : sol}
          time={time}
          modes={modes}
          sourceLabel={sourceLabel}
          imax={sim.imax}
          vmax={sim.vmax}
          highlight={hintLevel > 0 ? [c.storage!] : []}
        />
        {shown !== null && (
          <div className="transform-tag pop-in" key={`tag${shown}`}>
            {shown === 0 && (isC ? 'Mucho tiempo en DC → C = ABIERTO' : 'Mucho tiempo en DC → L = CABLE')}
            {shown === 1 && (isC ? 'Switch cambió · C = batería con su voltaje viejo' : 'Switch cambió · L = fuente con su corriente vieja')}
            {shown === 2 && (isC ? 'Circuito NUEVO · C = ABIERTO' : 'Circuito NUEVO · L = CABLE')}
          </div>
        )}
      </div>
      {movie && <TimeScrubber s={tl.s} onChange={tl.setS} playing={tl.playing} onPlay={tl.play} onPause={tl.pause} />}
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <div className="chain">
        {TM_PHASES.map((p, k) => (
          <span key={p.key} className={`chain-chip ${k < solved ? 'ok' : k === solved ? 'cur' : ''}`}>
            {x}({['0⁻', '0⁺', '∞'][k]}) = {k < solved ? `${fmt([fo.x0minus, fo.x0plus, fo.xinf][k])} ${fo.unit}` : '?'}
          </span>
        ))}
      </div>
      {warn && <div className="warn pop-in">{warn}</div>}
      {!movie && view === solved && (
        <QuestionCard
          key={questions[solved].id}
          q={questions[solved]}
          continueLabel={solved < 2 ? `Siguiente: ${TM_PHASES[solved + 1].btn}` : 'Ver la película'}
          onSolved={() => {
            const n = solved + 1;
            setSolved(n);
            setView(n < 3 ? null : null);
            if (n >= 3) {
              tl.setS(40);
              setTimeout(() => tl.play(), 400);
            }
          }}
        />
      )}
      {!movie && view !== solved && <div className="muted-note">Pulsa {TM_PHASES[solved].btn} arriba ↑</div>}
      {movie && (
        <>
          <ResponseGraph fo={fo} time={tl.time} height={170} show63 />
          <button className="btn primary wide" onClick={() => onDone()}>
            Continuar →
          </button>
        </>
      )}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
