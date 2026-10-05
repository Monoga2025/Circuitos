// BOSS FIGHT: no automatic steps. The player picks tools (ANTES, 0⁺, ∞, APAGAR
// FUENTES, VER DESDE C/L, CALCULADORA, GRÁFICA) and answers slots in any order.
// Scored on results AND on procedure (did you look before answering?).
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Calculator } from '../components/Calculator';
import { CircuitView, type RenderMode } from '../components/CircuitView';
import { QuestionCard } from '../components/QuestionCard';
import { ResponseGraph } from '../components/ResponseGraph';
import { useSim, useTimeline } from '../components/sim';
import { TimeScrubber } from '../components/TimeScrubber';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { fmt } from '../engine/analysis';
import { solve } from '../engine/mna';
import type { TimeState } from '../engine/types';
import type { ErrorType } from '../learning/errors';
import { StepLayout } from './Layout';
import { usePlayer, type AnswerEvent, type StepProps } from './common';
import { phaseQuestion, responseString, type PhaseKey } from './numeric';

type Tool = 'antes' | 'cero' | 'inf' | 'apagar' | 'ver' | 'calc' | 'graf';
type SlotKey = Exclude<PhaseKey, 'x0m'>;
const SLOTS: SlotKey[] = ['x0p', 'xinf', 'req', 'tau', 'formula'];
const PREREQ: Record<SlotKey, { tools: Tool[]; slots: SlotKey[]; why: string }> = {
  x0p: { tools: ['antes'], slots: [], why: 'Respondiste el inicio sin mirar ANTES (t = 0⁻).' },
  xinf: { tools: ['inf'], slots: [], why: 'Respondiste el final sin mirar INFINITO.' },
  req: { tools: ['apagar', 'ver'], slots: [], why: 'Req sin APAGAR FUENTES y VER DESDE el elemento.' },
  tau: { tools: [], slots: ['req'], why: 'τ antes de tener Req.' },
  formula: { tools: [], slots: ['x0p', 'xinf', 'tau'], why: 'Fórmula sin tener inicio, final y τ.' },
};

export function BossStep({ step, onDone }: StepProps<Extract<Step, { type: 'boss' }>>) {
  const { exam, setHints, setContext, stepSkills, onBossResult, hintLevel } = usePlayer();
  const c = getCircuit(step.circuit);
  const sim = useSim(c);
  const fo = sim.fo!;
  const isC = fo.type === 'RC';
  const x = isC ? 'vC' : 'iL';
  const storage = c.components.find((k) => k.id === c.storage)!;
  const [used, setUsed] = useState<Tool[]>([]);
  const [view, setView] = useState<'normal' | 'antes' | 'cero' | 'inf'>('normal');
  const [off, setOff] = useState(false);
  const [from, setFrom] = useState(false);
  const [calc, setCalc] = useState(false);
  const [open, setOpen] = useState<SlotKey | null>(null);
  const [res, setRes] = useState<Partial<Record<SlotKey, { ok: boolean; pts: number; proc: boolean }>>>({});
  const [hearts, setHearts] = useState(3);
  const [errors, setErrors] = useState<ErrorType[]>([]);
  const [procNotes, setProcNotes] = useState<string[]>([]);
  const [graph, setGraph] = useState(false);
  const [hit, setHit] = useState(0);
  const tl = useTimeline(fo.tau);

  const questions = useMemo(() => Object.fromEntries(SLOTS.map((s) => [s, phaseQuestion(c, fo, s)])) as Record<SlotKey, ReturnType<typeof phaseQuestion>>, [c, fo]);
  const answered = SLOTS.filter((s) => res[s]);
  const finished = answered.length === SLOTS.length;
  const score = answered.reduce((a, s) => a + res[s]!.pts, 0);
  const max = SLOTS.length * 25;
  const hp = Math.max(0, 100 - SLOTS.filter((s) => res[s]?.ok).length * 20);

  useEffect(() => {
    setHints([
      { text: 'Empieza por la herramienta ANTES.' },
      { text: 'Orden de la profe: ANTES → 0⁺ → INFINITO → APAGAR FUENTES + VER DESDE → τ → fórmula.' },
      { text: `En ANTES/INFINITO: ${isC ? 'C = abierto' : 'L = cable'}. En 0⁺ se conserva ${x}.` },
    ]);
    stepSkills(['generalizedResponse', 'initialCondition', 'finalCondition', 'theveninResistance']);
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setContext(finished ? 'Boss derrotado. Verifica con la gráfica.' : exam ? 'Modo examen: sin ayudas. Puntos por resultado y por procedimiento.' : 'Elige herramientas y responde las casillas en el orden que creas correcto.');
  }, [finished, exam]); // eslint-disable-line react-hooks/exhaustive-deps

  const use = (t: Tool) => {
    sfx.click();
    setUsed((u) => (u.includes(t) ? u : [...u, t]));
    if (t === 'antes' || t === 'cero' || t === 'inf') {
      setView(t);
      setOff(false);
      setFrom(false);
    }
    if (t === 'apagar') {
      setView('normal');
      setOff((v) => !v);
    }
    if (t === 'ver') {
      setView('normal');
      setFrom((v) => !v);
    }
    if (t === 'calc') setCalc((v) => !v);
    if (t === 'graf') {
      setGraph(true);
      tl.setS(40);
      setTimeout(() => tl.play(), 300);
    }
  };

  const answer = (s: SlotKey, ev: AnswerEvent) => {
    const pre = PREREQ[s];
    const proc = pre.tools.every((t) => used.includes(t)) && pre.slots.every((k) => res[k]);
    const ok = exam ? ev.correctFirstTry : true; // in training the card only resolves when correct
    const first = ev.correctFirstTry;
    const pts = (ok ? (first ? 20 : 8) : 0) + (proc ? 5 : 0);
    if (!first) {
      setHearts((h) => Math.max(0, h - 1));
      if (ev.error) setErrors((e) => [...e, ev.error!]);
    }
    if (!proc) setProcNotes((n) => [...n, pre.why]);
    if (ok) {
      setHit((h) => h + 1);
      sfx.correct();
    }
    setRes((r) => ({ ...r, [s]: { ok, pts, proc } }));
    setOpen(null);
  };

  useEffect(() => {
    if (finished) onBossResult({ name: step.name, score, max, errors, procedure: procNotes });
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // stage view
  const modes: Record<string, RenderMode> = {};
  let time: TimeState | undefined;
  let sol;
  let imax = sim.imax;
  let terminals: { a: string; b: string } | undefined;
  if (view === 'antes') {
    time = { kind: 'before' };
    modes[storage.id] = isC ? 'open' : 'short';
    sol = sim.at(time);
  } else if (view === 'cero') {
    time = { kind: 'after', t: 0 };
    modes[storage.id] = 'asSource';
    sol = sim.at(time);
  } else if (view === 'inf') {
    time = { kind: 'inf' };
    modes[storage.id] = isC ? 'open' : 'short';
    sol = sim.at(time);
  } else {
    time = { kind: 'after', t: 0 };
    if (off)
      for (const comp of c.components) {
        if (comp.kind === 'V') modes[comp.id] = 'short';
        if (comp.kind === 'I') modes[comp.id] = 'open';
      }
    if (from) {
      modes[storage.id] = 'removed';
      terminals = { a: storage.a, b: storage.b };
      if (off) {
        sol = solve(c, { phase: 'after', storage: { mode: 'removed' }, deactivate: true, testSource: { a: storage.a, b: storage.b, value: 1 } });
        imax = Math.max(0.01, ...Object.values(sol.compI).map(Math.abs));
      }
    }
  }
  if (graph) {
    time = tl.time;
    sol = sim.at(time);
  }

  const TOOLS: { id: Tool; label: string; dis?: boolean }[] = [
    { id: 'antes', label: 'ANTES' },
    { id: 'cero', label: '0⁺' },
    { id: 'inf', label: 'INFINITO' },
    { id: 'apagar', label: 'APAGAR FUENTES' },
    { id: 'ver', label: `VER DESDE ${isC ? 'C' : 'L'}` },
    { id: 'calc', label: 'CALCULADORA' },
    { id: 'graf', label: 'GRÁFICA', dis: !res.formula },
  ];
  const SLOT_LABEL: Record<SlotKey, string> = { x0p: `${x}(0⁺)`, xinf: `${x}(∞)`, req: 'Req', tau: 'τ', formula: `${x}(t)` };
  const slotVal = (s: SlotKey) =>
    s === 'x0p' ? `${fmt(fo.x0plus)} ${fo.unit}` : s === 'xinf' ? `${fmt(fo.xinf)} ${fo.unit}` : s === 'req' ? `${fmt(fo.Req)} Ω` : s === 'tau' ? `${fmt(fo.tau)} s` : '✓';
  const stars = score >= max * 0.9 ? 3 : score >= max * 0.7 ? 2 : 1;

  const stage = (
    <div className="boss-stage">
      <div className="boss-head">
        <div className={`boss-avatar ${hit ? 'hit' : ''}`} key={hit}>
          {isC ? '👾' : '🐉'}
        </div>
        <div className="boss-info">
          <div className="boss-name">{step.name}</div>
          <div className="hp">
            <div style={{ width: `${hp}%` }} />
          </div>
        </div>
        {!exam && <div className="hearts">{'❤'.repeat(hearts)}{'♡'.repeat(3 - hearts)}</div>}
      </div>
      <div className="toolbar">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool ${used.includes(t.id) ? 'used' : ''} ${(t.id === view || (t.id === 'apagar' && off) || (t.id === 'ver' && from) || (t.id === 'calc' && calc)) ? 'active' : ''} ${!exam && hintLevel > 0 && !used.includes(t.id) && t.id === 'antes' ? 'pulse' : ''}`}
            onClick={() => use(t.id)}
            disabled={t.dis}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="circuit-wrap">
        <CircuitView
          key={`${view}-${off}-${from}`}
          circuit={c}
          solution={sol}
          time={time}
          modes={modes}
          sourceLabel={`${x}(0⁺) = ?`}
          terminals={terminals}
          imax={imax}
          vmax={sim.vmax}
        />
        {calc && (
          <div className="calc-float">
            <Calculator onClose={() => setCalc(false)} />
          </div>
        )}
      </div>
      {graph && (
        <>
          <ResponseGraph fo={fo} time={tl.time} height={150} show63 />
          <TimeScrubber s={tl.s} onChange={tl.setS} playing={tl.playing} onPlay={tl.play} onPause={tl.pause} />
        </>
      )}
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <div className="slots">
        {SLOTS.map((s) => {
          const r = res[s];
          return (
            <button key={s} className={`slot-btn ${r ? (r.ok ? 'ok' : 'bad') : ''} ${open === s ? 'open' : ''}`} disabled={!!r || finished} onClick={() => setOpen(s)}>
              <span className="sl-name">{SLOT_LABEL[s]}</span>
              <span className="sl-val">{r ? (r.ok ? slotVal(s) : '✗') : '?'}</span>
              {r && !r.proc && <span className="sl-proc" title={PREREQ[s].why}>⚠ proc.</span>}
            </button>
          );
        })}
      </div>
      {open && !finished && (
        <div className="boss-q">
          <QuestionCard key={open} q={questions[open]} continueLabel={null} onSolved={(ev) => answer(open, ev)} />
          <button className="btn ghost wide" onClick={() => setOpen(null)}>
            ← volver a las herramientas
          </button>
        </div>
      )}
      {finished && (
        <div className="boss-result pop-in">
          <div className="br-score">
            {score} / {max} pts {'★'.repeat(stars)}
          </div>
          {res.formula?.ok && <div className="br-formula">{responseString(fo.xinf, fo.x0plus, fo.tau, isC ? 'v' : 'i', fo.unit)}</div>}
          {procNotes.length > 0 && (
            <ul className="br-notes">
              {procNotes.map((n) => (
                <li key={n}>⚠ {n}</li>
              ))}
            </ul>
          )}
          {!graph && (
            <button className="btn wide" onClick={() => use('graf')}>
              📈 Ver gráfica
            </button>
          )}
          <button className="btn primary wide" onClick={() => onDone(stars)}>
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
