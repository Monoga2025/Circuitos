// Full exercise following the professor's generalized method:
// ANTES → 0⁺ → ∞ → Req → τ → fórmula → (other variable).
import { useEffect, useMemo, useState } from 'react';
import { CircuitView, type RenderMode } from '../components/CircuitView';
import { Meters } from '../components/Meters';
import { QuestionCard } from '../components/QuestionCard';
import { ResponseGraph } from '../components/ResponseGraph';
import { useSim, useTimeline } from '../components/sim';
import { TimeScrubber } from '../components/TimeScrubber';
import { getCircuit } from '../data/circuits';
import type { QuestionDef, Step } from '../data/model';
import { fmt } from '../engine/analysis';
import { solve } from '../engine/mna';
import type { TimeState } from '../engine/types';
import { StepLayout, StepTitle } from './Layout';
import { usePlayer, type StepProps } from './common';
import { phaseQuestion, responseString, targetQuestion, type PhaseKey } from './numeric';

type GPhase = PhaseKey | 'target';

export function GuidedStep({ step, onDone }: StepProps<Extract<Step, { type: 'guided' }>>) {
  const { setHints, setContext, stepSkills } = usePlayer();
  const c = getCircuit(step.circuit);
  const sim = useSim(c);
  const fo = sim.fo!;
  const isC = fo.type === 'RC';
  const x = isC ? 'v' : 'i';
  const storage = c.components.find((k) => k.id === c.storage)!;
  const phases: GPhase[] = ['x0m', 'x0p', 'xinf', 'req', 'tau', 'formula', ...(step.target ? (['target'] as const) : [])];
  const [k, setK] = useState(0);
  const finished = k >= phases.length;
  const phase = phases[Math.min(k, phases.length - 1)];
  const tl = useTimeline(fo.tau);
  const guided = step.guidance === 'guided';

  const LABEL: Record<GPhase, [string, string]> = {
    x0m: ['ANTES', `Circuito viejo, mucho tiempo → ${isC ? 'C abierto' : 'L cable'}.`],
    x0p: ['0⁺', `${isC ? 'vC' : 'iL'} no salta.`],
    xinf: ['INFINITO', `Circuito nuevo → ${isC ? 'C abierto' : 'L cable'}.`],
    req: ['Req', `Quita ${isC ? 'C' : 'L'}, apaga fuentes, mira desde sus terminales.`],
    tau: ['τ', isC ? 'τ = Req · C' : 'τ = L / Req'],
    formula: ['FÓRMULA', 'final + (inicio − final)·e^(−t/τ)'],
    target: ['VARIABLE', 'Ohm / LCK sobre el circuito en t > 0.'],
  };

  const questions: Record<GPhase, QuestionDef> = useMemo(
    () => ({
      x0m: phaseQuestion(c, fo, 'x0m'),
      x0p: phaseQuestion(c, fo, 'x0p'),
      xinf: phaseQuestion(c, fo, 'xinf'),
      req: phaseQuestion(c, fo, 'req'),
      tau: phaseQuestion(c, fo, 'tau'),
      formula: phaseQuestion(c, fo, 'formula'),
      target: step.target ? targetQuestion(c, fo, step.target) : phaseQuestion(c, fo, 'formula'),
    }),
    [c, fo, step.target],
  );

  useEffect(() => {
    if (finished) {
      setContext('Resuelto. Mueve el tiempo y comprueba que todo cuadra.');
      return;
    }
    setContext(`${k + 1}/${phases.length} · ${LABEL[phase][0]} — ${LABEL[phase][1]}`);
    setHints([
      { text: LABEL[phase][1], highlight: [storage.id] },
      { text: phase === 'req' ? 'V apagada = cable, I apagada = abierto.' : 'Mira el circuito transformado.' },
      { text: 'Descartamos una opción.' },
    ]);
    stepSkills(questions[phase].skills);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  // stage representation per phase
  const modes: Record<string, RenderMode> = {};
  let time: TimeState = { kind: 'before' };
  let sol = undefined as ReturnType<typeof sim.at> | undefined;
  let terminals: { a: string; b: string } | undefined;
  let imax = sim.imax;
  if (!finished) {
    if (phase === 'x0m') {
      modes[storage.id] = isC ? 'open' : 'short';
      time = { kind: 'before' };
    } else if (phase === 'x0p') {
      modes[storage.id] = 'asSource';
      time = { kind: 'after', t: 0 };
    } else if (phase === 'xinf') {
      modes[storage.id] = isC ? 'open' : 'short';
      time = { kind: 'inf' };
    } else if (phase === 'req') {
      modes[storage.id] = 'removed';
      for (const comp of c.components) {
        if (comp.kind === 'V') modes[comp.id] = 'short';
        if (comp.kind === 'I') modes[comp.id] = 'open';
      }
      time = { kind: 'after', t: 0 };
      terminals = { a: storage.a, b: storage.b };
    } else time = { kind: 'after', t: fo.tau * 0.5 };
  } else time = tl.time;

  if (phase === 'req' && !finished) {
    sol = solve(c, { phase: 'after', storage: { mode: 'removed' }, deactivate: true, testSource: { a: storage.a, b: storage.b, value: 1 } });
    imax = Math.max(0.01, ...Object.values(sol.compI).map(Math.abs));
  } else if (finished || ['x0m', 'x0p', 'xinf'].includes(phase)) sol = sim.at(time);

  const solvedVals: [string, string][] = [
    [`${x}(0⁻)`, `${fmt(fo.x0minus)} ${fo.unit}`],
    [`${x}(0⁺)`, `${fmt(fo.x0plus)} ${fo.unit}`],
    [`${x}(∞)`, `${fmt(fo.xinf)} ${fo.unit}`],
    ['Req', `${fmt(fo.Req)} Ω`],
    ['τ', `${fmt(fo.tau)} s`],
    [`${x}(t)`, responseString(fo.xinf, fo.x0plus, fo.tau, x, fo.unit).split('= ')[1]],
  ];

  const stage = (
    <div className="guided-stage">
      <StepTitle kicker={c.title ?? 'Ejercicio'} title={finished ? '¡Resuelto!' : `${LABEL[phase][0]}`} />
      <div className="phase-track">
        {phases.map((p, i) => (
          <span key={p} className={`pt ${i < k ? 'ok' : i === k ? 'cur' : ''}`}>
            {LABEL[p][0]}
          </span>
        ))}
      </div>
      {guided && !finished && <div className="instr big">{LABEL[phase][1]}</div>}
      <div className="circuit-wrap">
        <CircuitView
          key={finished ? 'fin' : phase}
          circuit={c}
          solution={sol}
          time={time}
          modes={modes}
          sourceLabel={`${isC ? 'vC' : 'iL'}(0⁺) = ${k > 1 ? `${fmt(fo.x0plus)} ${fo.unit}` : '?'}`}
          terminals={terminals}
          meter={phase === 'req' && !finished ? 'Req = ?' : undefined}
          imax={imax}
          vmax={sim.vmax}
          highlight={phase === 'target' && step.target ? [step.target.comp] : []}
        />
      </div>
      {(finished || phase === 'tau' || phase === 'formula' || phase === 'target') && (
        <ResponseGraph fo={fo} time={finished ? tl.time : undefined} height={160} hideValues={!finished && phase === 'tau'} show63={finished} />
      )}
      {finished && <TimeScrubber s={tl.s} onChange={tl.setS} playing={tl.playing} onPlay={tl.play} onPause={tl.pause} />}
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <div className="solved-list">
        {solvedVals.slice(0, Math.min(k, 6)).map(([a, b]) => (
          <div key={a} className="sv pop-in">
            <span>{a}</span>
            <b>{b}</b>
          </div>
        ))}
        {k > 6 && step.target && (
          <div className="sv pop-in">
            <span>{step.target.name}</span>
            <b>✓</b>
          </div>
        )}
      </div>
      {!finished && (
        <QuestionCard
          key={questions[phase].id}
          q={questions[phase]}
          continueLabel={k + 1 < phases.length ? `Siguiente: ${LABEL[phases[k + 1]][0]}` : 'Terminar'}
          onSolved={() => {
            const n = k + 1;
            setK(n);
            if (n >= phases.length) {
              tl.setS(40);
              setTimeout(() => tl.play(), 300);
            }
          }}
        />
      )}
      {finished && (
        <>
          {sol && <Meters circuit={c} solution={sol} imax={sim.imax} vmax={sim.vmax} />}
          <button className="btn primary wide" onClick={() => onDone()}>
            Continuar →
          </button>
        </>
      )}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
