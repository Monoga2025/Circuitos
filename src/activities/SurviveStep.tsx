// "¿Qué sobrevive al salto?" — flick the switch on an RC and an RL at once,
// pick which quantities do NOT jump. Reveal real graphs from the engine.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView } from '../components/CircuitView';
import { MiniCurve } from '../components/ResponseGraph';
import { useSim } from '../components/sim';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { fmt } from '../engine/analysis';
import type { TimeState } from '../engine/types';
import { useGame } from '../store/game';
import { StepLayout, StepTitle } from './Layout';
import { report, usePlayer, type StepProps } from './common';

const ROUNDS: [string, string][] = [
  ['jump-rc', 'tm-rl-discharge'],
  ['tm-rc-charge', 'rl-step'],
  ['boss-rc', 'boss-rl'],
];

type Qty = 'vC' | 'iC' | 'vL' | 'iL';
const QTY: { id: Qty; label: string; survives: boolean }[] = [
  { id: 'vC', label: 'Voltaje del capacitor', survives: true },
  { id: 'iC', label: 'Corriente del capacitor', survives: false },
  { id: 'vL', label: 'Voltaje del inductor', survives: false },
  { id: 'iL', label: 'Corriente del inductor', survives: true },
];

export function SurviveStep({ step, onDone }: StepProps<Extract<Step, { type: 'survive' }>>) {
  const { setHints, setContext, stepSkills } = usePlayer();
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sel, setSel] = useState<Qty[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [t0, setT0] = useState(performance.now());

  useEffect(() => {
    setHints([
      { text: 'Lo que guarda ENERGÍA no puede saltar: w = ½Cv², w = ½Li².' },
      { text: 'C protege su voltaje; L protege su corriente.' },
      { text: 'Sobreviven: vC e iL.' },
    ]);
    stepSkills(['capacitorContinuity', 'inductorContinuity']);
    setContext('Cambia los switches y elige lo que NO salta.');
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [rcId, rlId] = ROUNDS[round % ROUNDS.length];
  const rc = getCircuit(rcId);
  const rl = getCircuit(rlId);
  const simC = useSim(rc);
  const simL = useSim(rl);
  const time: TimeState = flipped ? { kind: 'after', t: 0 } : { kind: 'before' };

  const values = useMemo(() => {
    const get = (sim: typeof simC, c: typeof rc, kind: 'v' | 'i') => {
      const s = c.storage!;
      const pick = (t: TimeState) => (kind === 'v' ? sim.at(t).compV[s] : sim.at(t).compI[s]);
      return { before: pick({ kind: 'before' }), start: pick({ kind: 'after', t: 0 }), end: pick({ kind: 'inf' }) };
    };
    return { vC: get(simC, rc, 'v'), iC: get(simC, rc, 'i'), vL: get(simL, rl, 'v'), iL: get(simL, rl, 'i') };
  }, [simC, simL, rc, rl]);

  const check = () => {
    const ok = QTY.every((q) => sel.includes(q.id) === q.survives);
    setChecked(ok);
    ok ? sfx.correct() : sfx.wrong();
    for (const [skill, ids] of [
      ['capacitorContinuity', ['vC', 'iC']],
      ['inductorContinuity', ['vL', 'iL']],
    ] as const) {
      const good = ids.every((id) => sel.includes(id) === QTY.find((q) => q.id === id)!.survives);
      report({
        questionId: `survive-${round}-${skill}`,
        skills: [skill],
        correctFirstTry: good,
        attempts: 1,
        hints: 0,
        options: 4,
        timeMs: performance.now() - t0,
        representation: 'survive',
        difficulty: 2,
        error: good ? undefined : 'ERROR_CONTINUIDAD',
      });
      if (!good) useGame.getState().logError('ERROR_CONTINUIDAD');
    }
  };

  const next = () => {
    setRound((r) => r + 1);
    setFlipped(false);
    setSel([]);
    setChecked(null);
    setT0(performance.now());
  };

  const stage = (
    <div className="survive-stage">
      <StepTitle kicker="Minijuego" title="¿Qué sobrevive al salto?" />
      <div className="twin">
        <div className="twin-cell">
          <CircuitView circuit={rc} solution={simC.at(time)} time={time} imax={simC.imax} vmax={simC.vmax} highlight={['C']} />
        </div>
        <div className="twin-cell">
          <CircuitView circuit={rl} solution={simL.at(time)} time={time} imax={simL.imax} vmax={simL.vmax} highlight={['L']} />
        </div>
      </div>
      {!flipped ? (
        <button
          className="btn big primary pulse center"
          onClick={() => {
            sfx.flip();
            setFlipped(true);
          }}
        >
          ⚡ ¡Cambiar los switches en t = 0!
        </button>
      ) : (
        <div className="qty-grid">
          {QTY.map((q) => {
            const on = sel.includes(q.id);
            const v = values[q.id];
            const unit = q.id[0] === 'v' ? 'V' : 'A';
            const jumped = Math.abs(v.before - v.start) > 1e-6;
            return (
              <button
                key={q.id}
                className={`qty ${on ? 'on' : ''} ${checked !== null ? (q.survives ? 'right' : 'nope') : ''}`}
                disabled={checked !== null}
                onClick={() => setSel((s) => (on ? s.filter((x) => x !== q.id) : [...s, q.id]))}
              >
                <span className="qty-name">{q.id}</span>
                <span className="qty-label">{q.label}</span>
                {checked !== null && (
                  <span className="qty-graph pop-in">
                    <MiniCurve before={v.before} start={v.start} end={v.end} />
                    <span className={jumped ? 'jumped' : 'kept'}>
                      {fmt(v.before, 2)} → {fmt(v.start, 2)} {unit} {jumped ? '¡SALTA!' : 'sobrevive'}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <div className="score-row">
        <span>Ronda {round + 1}</span>
      </div>
      {flipped && checked === null && (
        <button className="btn primary wide" disabled={!sel.length} onClick={check}>
          Comprobar
        </button>
      )}
      {checked === true && (
        <div className="success pop-in">
          <div className="success-title">✓ vC e iL sobreviven al salto</div>
          <div className="success-line">Lo demás puede saltar sin problema.</div>
          <button className="btn primary wide" onClick={() => onDone(round === 0 ? 3 : 2)}>
            Continuar →
          </button>
        </div>
      )}
      {checked === false && (
        <div className="fail pop-in">
          <div>Mira las gráficas: ¿cuáles NO tienen escalón en t=0?</div>
          <button className="btn wide" onClick={next}>
            Otra ronda (circuitos nuevos) →
          </button>
        </div>
      )}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
