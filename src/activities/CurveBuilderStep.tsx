// INICIO · FINAL · VELOCIDAD: drag three handles until the curve matches the circuit.
// "Comienzo aquí → termino aquí → me acerco exponencialmente."
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView } from '../components/CircuitView';
import { useSim } from '../components/sim';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { fmt } from '../engine/analysis';
import { StepLayout, StepTitle } from './Layout';
import { report, usePlayer, type StepProps } from './common';

const W = 560;
const H = 300;
const PL = 50;
const PR = 30;
const PT = 20;
const PB = 34;
const Y_MIN = -2;
const Y_MAX = 12;
const T_MAX = 9;

const X = (t: number) => PL + (t / T_MAX) * (W - PL - PR);
const Y = (v: number) => PT + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PT - PB);
const invY = (py: number) => Y_MIN + (1 - (py - PT) / (H - PT - PB)) * (Y_MAX - Y_MIN);
const invX = (px: number) => ((px - PL) / (W - PL - PR)) * T_MAX;

type Handle = 'start' | 'end' | 'tau';

export function CurveBuilderStep({ step, onDone }: StepProps<Extract<Step, { type: 'curveBuilder' }>>) {
  const { setHints, setContext, stepSkills, hintLevel, solution } = usePlayer();
  const c = getCircuit(step.circuit);
  const sim = useSim(c);
  const fo = sim.fo!;
  const [start, setStart] = useState(4);
  const [end, setEnd] = useState(6);
  const [tau, setTau] = useState(3.5);
  const [focus, setFocus] = useState<Handle | null>(null);
  const [drag, setDrag] = useState<Handle | null>(null);
  const [won, setWon] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const [t0] = useState(performance.now());

  useEffect(() => {
    setHints([
      { text: 'Arrastra el punto verde (INICIO) hasta v(0⁺).' },
      { text: 'Arrastra la línea punteada (FINAL) hasta v(∞).' },
      { text: 'Arrastra el rombo (VELOCIDAD) hasta t = τ.' },
    ]);
    stepSkills(['generalizedResponse']);
    setContext('Tres números definen TODA la curva.');
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!solution) return;
    setStart(fo.x0plus);
    setEnd(fo.xinf);
    setTau(Math.round(fo.tau * 10) / 10);
  }, [solution]); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = {
    start: Math.abs(start - fo.x0plus) < 0.26,
    end: Math.abs(end - fo.xinf) < 0.26,
    tau: Math.abs(tau - fo.tau) < 0.11,
  };
  const all = ok.start && ok.end && ok.tau;

  useEffect(() => {
    if (all && !won) {
      setWon(true);
      sfx.level();
      report({ questionId: 'curve-builder', skills: ['generalizedResponse'], correctFirstTry: hintLevel === 0, attempts: 1, hints: hintLevel, options: 0, timeMs: performance.now() - t0, representation: 'curve-drag', difficulty: 2 });
    }
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  const grab = (h: Handle) => (e: React.PointerEvent) => {
    svg.current?.setPointerCapture(e.pointerId);
    setDrag(h);
    setFocus(h);
  };
  const toLocal = (e: React.PointerEvent) => {
    // exact client → SVG mapping (handles letterboxing from preserveAspectRatio)
    const el = svg.current!;
    const m = el.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag || won) return;
    const p = toLocal(e);
    if (drag === 'start') setStart(Math.round(Math.max(Y_MIN, Math.min(Y_MAX, invY(p.y))) * 2) / 2);
    if (drag === 'end') setEnd(Math.round(Math.max(Y_MIN, Math.min(Y_MAX, invY(p.y))) * 2) / 2);
    if (drag === 'tau') setTau(Math.round(Math.max(0.2, Math.min(T_MAX / 1.2, invX(p.x))) * 10) / 10);
  };

  const curve = useMemo(() => {
    let d = `M${X(0)} ${Y(start)}`;
    for (let k = 1; k <= 100; k++) {
      const t = (k / 100) * T_MAX;
      d += ` L${X(t)} ${Y(end + (start - end) * Math.exp(-t / tau))}`;
    }
    return d;
  }, [start, end, tau]);
  const target = useMemo(() => {
    let d = `M${X(0)} ${Y(fo.x0plus)}`;
    for (let k = 1; k <= 100; k++) {
      const t = (k / 100) * T_MAX;
      d += ` L${X(t)} ${Y(fo.xinf + (fo.x0plus - fo.xinf) * Math.exp(-t / fo.tau))}`;
    }
    return d;
  }, [fo]);
  const v63 = end + (start - end) * Math.exp(-1);

  const stage = (
    <div className="curve-stage">
      <StepTitle kicker="La fórmula sin memorizar" title="Construye la curva" />
      <svg
        ref={svg}
        className="graph builder"
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <line x1={PL} y1={Y(0)} x2={W - PR} y2={Y(0)} className="axis" />
        <line x1={X(0)} y1={PT} x2={X(0)} y2={H - PB} className="axis zero" />
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <text key={v} x={PL - 8} y={Y(v) + 4} textAnchor="end" className="g-tick">
            {v}
          </text>
        ))}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
          <text key={t} x={X(t)} y={H - 12} textAnchor="middle" className="g-tick">
            {t}s
          </text>
        ))}
        {won && <path d={target} className="curve ghost" />}
        <path d={curve} className={`curve ${won ? 'won' : ''}`} />
        {/* FINAL */}
        <line x1={X(0)} y1={Y(end)} x2={W - PR} y2={Y(end)} className={`asym handle-line ${focus === 'end' ? 'emph' : ''} ${ok.end ? 'ok' : ''}`} />
        <rect x={W - PR - 60} y={Y(end) - 14} width={60} height={28} rx={8} className={`handle h-end ${ok.end ? 'ok' : ''}`} onPointerDown={grab('end')} />
        <rect x={W - PR - 90} y={Y(end) - 24} width={100} height={48} className="hit" onPointerDown={grab('end')} />
        <text x={W - PR - 30} y={Y(end) + 5} textAnchor="middle" className="h-text">
          {fmt(end, 1)}
        </text>
        {/* VELOCIDAD */}
        <line x1={X(tau)} y1={PT} x2={X(tau)} y2={H - PB} className={`tau-line ${focus === 'tau' ? 'emph' : ''}`} />
        <circle cx={X(tau)} cy={Y(v63)} r={4} className="p63" />
        <path d={`M${X(tau)} ${H - PB - 16} l12 12 l-12 12 l-12 -12 Z`} className={`handle h-tau ${ok.tau ? 'ok' : ''}`} onPointerDown={grab('tau')} />
        <rect x={X(tau) - 26} y={H - PB - 26} width={52} height={50} className="hit" onPointerDown={grab('tau')} />
        <text x={X(tau)} y={PT + 10} textAnchor="middle" className="h-text">
          τ = {fmt(tau, 1)} s
        </text>
        {/* INICIO */}
        <circle cx={X(0)} cy={Y(start)} r={13} className={`handle h-start ${ok.start ? 'ok' : ''} ${focus === 'start' ? 'emph' : ''}`} onPointerDown={grab('start')} />
        <circle cx={X(0)} cy={Y(start)} r={28} className="hit" onPointerDown={grab('start')} />
        <text x={X(0) + 20} y={Y(start) - 10} className="h-text">
          {fmt(start, 1)}
        </text>
      </svg>
      {won && <div className="banner pop-in">Comienzo aquí → termino aquí → me acerco exponencialmente.</div>}
    </div>
  );

  const card = (k: Handle, title: string, val: string, desc: string) => (
    <button className={`num-card card-${k} ${ok[k] ? 'ok' : ''} ${focus === k ? 'focus' : ''}`} onClick={() => setFocus(k)}>
      <span className="nc-title">{title}</span>
      <span className="nc-val">{val}</span>
      <span className="nc-desc">{desc}</span>
      {ok[k] && <span className="tick-ok">✓</span>}
    </button>
  );

  const panel = (
    <div className="explore-panel">
      <div className="mini-circuit">
        <CircuitView circuit={c} showFlow={false} hideDisplay={false} />
      </div>
      {card('start', 'INICIO', `v(0⁺) = ${fmt(fo.x0plus)} V`, 'donde empiezas (no salta)')}
      {card('end', 'FINAL', `v(∞) = ${fmt(fo.xinf)} V`, 'donde terminarás')}
      {card('tau', 'VELOCIDAD', `τ = ${fmt(fo.tau)} s`, 'en 1τ recorres el 63 %')}
      <button className="btn primary wide" disabled={!won} onClick={() => onDone()}>
        {won ? 'Continuar →' : 'Ajusta los 3 controles'}
      </button>
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
