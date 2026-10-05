// τ is SPEED. Sliders for R and C, ghost of the original curve, challenges.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView } from '../components/CircuitView';
import { QuestionCard } from '../components/QuestionCard';
import { ResponseGraph } from '../components/ResponseGraph';
import { buildSim } from '../components/sim';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { q } from '../data/questions';
import { fmt, xAt } from '../engine/analysis';
import type { CircuitDefinition, FirstOrderResult, TimeState } from '../engine/types';
import { StepLayout, StepTitle } from './Layout';
import { report, usePlayer, type StepProps } from './common';

const CH = [
  { id: 'slow', text: 'Haz la carga MÁS LENTA que la original (τ > 2 s)', test: (t: number) => t > 2 },
  { id: 'fast', text: 'Ahora MUY RÁPIDA (τ < 0,5 s)', test: (t: number) => t < 0.5 },
  { id: 'exact', text: 'Exactamente τ = 3 s', test: (t: number) => Math.abs(t - 3) < 0.051 },
];

export function TauLabStep({ step, onDone }: StepProps<Extract<Step, { type: 'tauLab' }>>) {
  const { setHints, setContext, stepSkills } = usePlayer();
  const [R, setR] = useState(2);
  const [C, setC] = useState(0.5);
  const [done, setDone] = useState(0);
  const [qi, setQi] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [moved, setMoved] = useState(false);
  const tau = R * C;
  const T_SPAN = 12;

  useEffect(() => {
    setHints([
      { text: 'Mueve R o C y mira la curva vs. la fantasma.' },
      { text: 'τ = R·C. Más R o más C → más lento.' },
      { text: 'τ = 3 s: por ejemplo R = 6 Ω y C = 0,5 F.' },
    ]);
    stepSkills(['timeConstantRC']);
    setContext('τ es la VELOCIDAD: cuánto tarda en recorrer el 63 % del camino.');
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // challenge check
  useEffect(() => {
    if (done < CH.length && moved && CH[done].test(tau)) {
      sfx.correct();
      report({
        questionId: `tau-${CH[done].id}`,
        skills: ['timeConstantRC'],
        correctFirstTry: true,
        attempts: 1,
        hints: 0,
        options: 0,
        timeMs: 4000,
        representation: 'slider',
        difficulty: done === 2 ? 2 : 1,
      });
      setDone(done + 1);
      setMoved(false);
    }
  }, [tau, moved]); // eslint-disable-line react-hooks/exhaustive-deps

  // playback in seconds
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      setT((x) => {
        const n = x + dt * 2;
        if (n >= T_SPAN) {
          setPlaying(false);
          return T_SPAN;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const circuit: CircuitDefinition = useMemo(() => {
    const base = getCircuit('c-charge');
    return {
      ...base,
      id: `tau-${R}-${C}`,
      components: base.components.map((k) =>
        k.id === 'R' ? { ...k, value: R, display: `${fmt(R)} Ω` } : k.id === 'C' ? { ...k, value: C, display: `${fmt(C)} F` } : k,
      ),
    };
  }, [R, C]);
  const sim = useMemo(() => buildSim(circuit), [circuit]);
  const fo = sim.fo!;
  const ghost: FirstOrderResult = useMemo(() => ({ ...fo, tau: 1 }), [fo]);
  const time: TimeState = { kind: 'after', t };
  const sol = sim.at(time);
  const pct = fo.xinf ? (xAt(fo, t) / fo.xinf) * 100 : 0;

  const challengesDone = done >= CH.length;
  const qs = [q('tau-63'), q('tau-5')];

  const stage = (
    <div className="tau-stage">
      <StepTitle kicker="Velocidad" title="τ = Req · C" />
      <ResponseGraph fo={fo} ghost={ghost} time={time} tSpan={T_SPAN} yRange={[-1, 11.5]} show63 height={230} label="vC" />
      <div className="tau-row">
        <div className="tau-mini">
          <CircuitView circuit={circuit} solution={sol} time={time} imax={5} vmax={10} />
        </div>
        <div className="tau-readout">
          <div className="big-num">τ = {fmt(R)} · {fmt(C)} = <b>{fmt(tau, 2)} s</b></div>
          <div className="sub">
            t = {fmt(t, 1)} s = {fmt(t / tau, 1)} τ → {fmt(pct, 0)} % del camino
          </div>
          <button
            className="btn"
            onClick={() => {
              setT(0);
              setPlaying(true);
            }}
          >
            ▶ Cargar
          </button>
        </div>
      </div>
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <label className="slider">
        <span>R = {fmt(R)} Ω</span>
        <input type="range" min={0.5} max={10} step={0.5} value={R} onChange={(e) => { setR(Number(e.target.value)); setMoved(true); }} />
      </label>
      <label className="slider">
        <span>C = {fmt(C)} F</span>
        <input type="range" min={0.1} max={2} step={0.05} value={C} onChange={(e) => { setC(Number(e.target.value)); setMoved(true); }} />
      </label>
      <div className="checklist">
        {CH.map((c, k) => (
          <div key={c.id} className={k < done ? 'ok' : k === done ? 'cur' : ''}>
            {k < done ? '✓' : '○'} {c.text}
          </div>
        ))}
      </div>
      {challengesDone && qi < qs.length && (
        <QuestionCard key={qs[qi].id} q={qs[qi]} onSolved={() => (qi + 1 < qs.length ? setQi(qi + 1) : onDone())} continueLabel={qi + 1 < qs.length ? 'Siguiente' : 'Continuar'} />
      )}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
