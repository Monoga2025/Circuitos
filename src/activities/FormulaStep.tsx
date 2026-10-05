// Build v(t) = v∞ + (v0 − v∞)·e^(−t/τ) with draggable blocks, each with a meaning.
// Then drop the circuit's numbers in and verify against the live graph.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView } from '../components/CircuitView';
import { ResponseGraph } from '../components/ResponseGraph';
import { useSim, useTimeline } from '../components/sim';
import { TimeScrubber } from '../components/TimeScrubber';
import { useDragDrop } from '../components/useDragDrop';
import { getCircuit } from '../data/circuits';
import type { Step } from '../data/model';
import { fmt } from '../engine/analysis';
import type { ErrorType } from '../learning/errors';
import { useGame } from '../store/game';
import { StepLayout, StepTitle } from './Layout';
import { report, shuffle, usePlayer, type StepProps } from './common';
import { responseString } from './numeric';

interface Block {
  id: string;
  text: string;
  role: 'vinf' | 'v0' | 'exp' | 'expPos' | 'tau';
  meaning: string;
}

const BLOCKS: Block[] = [
  { id: 'b1', text: 'v∞', role: 'vinf', meaning: 'donde terminarás' },
  { id: 'b2', text: 'v₀', role: 'v0', meaning: 'donde empiezas: v(0⁺)' },
  { id: 'b3', text: 'v∞', role: 'vinf', meaning: 'donde terminarás' },
  { id: 'b4', text: 'e^(−t/τ)', role: 'exp', meaning: 'cuánto QUEDA del cambio: 1 → 0' },
  { id: 'b5', text: 'e^(+t/τ)', role: 'expPos', meaning: 'crece sin límite… ¿tiene sentido?' },
  { id: 'b6', text: 'τ', role: 'tau', meaning: 'la velocidad (va DENTRO del exponente)' },
];
const SLOT_ROLE = ['vinf', 'v0', 'vinf', 'exp'] as const;

export function FormulaStep({ step, onDone }: StepProps<Extract<Step, { type: 'formula' }>>) {
  const { setHints, setContext, stepSkills, hintLevel, solution } = usePlayer();
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [stage2, setStage2] = useState(false);
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const palette = useMemo(() => shuffle(BLOCKS), []);

  useEffect(() => {
    setHints([
      { text: 'El primer bloque es donde TERMINAS.' },
      { text: 'Entre paréntesis: cuánto te falta recorrer = inicio − final.' },
      { text: 'Al final, lo que se apaga con el tiempo: e^(−t/τ).' },
    ]);
    stepSkills(['generalizedResponse']);
    setContext('Arrastra cada bloque a su lugar. Toca un bloque para ver qué significa.');
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (solution) setSlots(['b1', 'b2', 'b3', 'b4']);
  }, [solution]);

  const place = (blockId: string, target: string) => {
    if (!target.startsWith('s')) return;
    const k = Number(target.slice(1));
    sfx.click();
    setSlots((s) => {
      const n = s.map((x) => (x === blockId ? null : x));
      n[k] = blockId;
      return n;
    });
    setSel(null);
    setMsg('');
  };
  const { start, ghost, over } = useDragDrop<string>(place, (id) => setSel(id));

  const check = () => {
    const roles = slots.map((id) => BLOCKS.find((b) => b.id === id)?.role);
    const ok = roles.every((r, k) => r === SLOT_ROLE[k]);
    const n = tries + 1;
    setTries(n);
    if (ok) {
      sfx.correct();
      report({ questionId: 'formula-blocks', skills: ['generalizedResponse'], correctFirstTry: n === 1, attempts: n, hints: hintLevel, options: 0, timeMs: 0, representation: 'blocks', difficulty: 2 });
      setTimeout(() => setStage2(true), 700);
      return;
    }
    sfx.wrong();
    let e: ErrorType = 'ERROR_FORMULA_EXPONENCIAL';
    if (roles.includes('expPos')) setMsg('e^(+t/τ) crece para siempre: el circuito nunca se estabilizaría.');
    else if (roles.includes('tau')) setMsg('τ solo no: va DENTRO del exponente.');
    else if (roles[0] === 'v0') setMsg('Empiezas en v₀ pero TERMINAS en v∞: cuando e^(−t/τ) → 0 debe quedar v∞.');
    else {
      setMsg('Prueba t = 0: debe dar v₀. Prueba t = ∞: debe dar v∞.');
      e = 'ERROR_FORMULA_EXPONENCIAL';
    }
    useGame.getState().logError(e);
  };

  if (stage2) return <NumbersStage circuitId={step.circuit} onDone={onDone} />;

  const filled = slots.every(Boolean);
  const blk = (id: string | null) => BLOCKS.find((b) => b.id === id);
  const slotEl = (k: number) => {
    const b = blk(slots[k]);
    return (
      <span
        className={`f-slot ${over === `s${k}` ? 'over' : ''} ${b ? 'filled' : ''} ${sel ? 'armed' : ''}`}
        data-drop={`s${k}`}
        onClick={() => {
          if (sel) place(sel, `s${k}`);
          else if (b) setSlots((s) => s.map((x, i) => (i === k ? null : x)));
        }}
      >
        {b ? b.text : '?'}
      </span>
    );
  };
  const meaningOf = slots[1] && slots[2] ? 'v₀ − v∞ = cuánto te falta recorrer' : null;
  const selected = sel ? blk(sel) : null;

  const stageEl = (
    <div className="formula-stage">
      <StepTitle kicker="Ensambla" title="La fórmula, pieza por pieza" />
      <div className="formula-row">
        <span className="f-fixed">v(t) =</span>
        {slotEl(0)}
        <span className="f-fixed">+ (</span>
        {slotEl(1)}
        <span className="f-fixed">−</span>
        {slotEl(2)}
        <span className="f-fixed">) ·</span>
        {slotEl(3)}
      </div>
      {meaningOf && <div className="f-meaning pop-in">{meaningOf}</div>}
      <div className="palette blocks">
        {palette.map((b) => {
          const used = slots.includes(b.id);
          return (
            <button
              key={b.id}
              className={`f-block ${used ? 'used' : ''} ${sel === b.id ? 'selected' : ''}`}
              disabled={used}
              onPointerDown={(e) => start(e, b.id, <span className="f-block ghosted">{b.text}</span>)}
            >
              {b.text}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="block-meaning pop-in">
          <b>{selected.text}</b> = {selected.meaning}
        </div>
      )}
      {msg && <div className="toast pop-in">{msg}</div>}
      {ghost}
    </div>
  );
  const panel = (
    <div className="explore-panel">
      <div className="legend-cards">
        <div><b>v∞</b> donde terminarás</div>
        <div><b>v₀ − v∞</b> cuánto te falta recorrer</div>
        <div><b>e^(−t/τ)</b> cuánto queda del cambio</div>
      </div>
      <button className="btn primary wide" disabled={!filled} onClick={check}>
        Comprobar
      </button>
    </div>
  );
  return <StepLayout stage={stageEl} panel={panel} />;
}

function NumbersStage({ circuitId, onDone }: { circuitId: string; onDone: () => void }) {
  const { setContext, setHints } = usePlayer();
  const c = getCircuit(circuitId);
  const sim = useSim(c);
  const fo = sim.fo!;
  const tl = useTimeline(fo.tau);
  const chips = useMemo(() => {
    const src = Math.max(...c.components.filter((k) => k.kind === 'V').map((k) => k.value));
    const vals = [fo.xinf, fo.x0plus, fo.tau, src, fo.Req];
    const uniq = vals.filter((v, i) => vals.findIndex((w) => Math.abs(w - v) < 1e-9) === i);
    return shuffle(uniq.map((v, i) => ({ id: `n${i}`, v })));
  }, [c, fo]);
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const want = [fo.xinf, fo.x0plus, fo.xinf, fo.tau];

  useEffect(() => {
    setContext(`Del Lab 3: v(0⁺) = ${fmt(fo.x0plus)} V, v(∞) = ${fmt(fo.xinf)} V, τ = ${fmt(fo.tau)} s. Pon los números.`);
    setHints([{ text: 'v∞ va en el 1º y 3º hueco.' }, { text: 'v₀ en el 2º.' }, { text: 'τ en el exponente.' }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const place = (id: string, target: string) => {
    if (!target.startsWith('s')) return;
    const k = Number(target.slice(1));
    sfx.click();
    setSlots((s) => {
      const n = s.slice();
      n[k] = id;
      return n;
    });
    setSel(null);
  };
  const { start, ghost, over } = useDragDrop<string>(place, (id) => setSel(id));
  const val = (id: string | null) => chips.find((x) => x.id === id)?.v;

  const check = () => {
    const ok = slots.every((id, k) => Math.abs((val(id) ?? NaN) - want[k]) < 1e-9);
    const n = tries + 1;
    setTries(n);
    if (ok) {
      sfx.level();
      report({ questionId: 'formula-numbers', skills: ['generalizedResponse', 'stepResponse'], correctFirstTry: n === 1, attempts: n, hints: 0, options: 0, timeMs: 0, representation: 'numbers', difficulty: 2 });
      setDone(true);
      tl.setS(40);
      setTimeout(() => tl.play(), 300);
    } else {
      sfx.wrong();
      const v2 = val(slots[3]);
      if (v2 !== undefined && Math.abs(v2 - fo.Req) < 1e-9) {
        setMsg('En el exponente va τ (segundos), no Req.');
        useGame.getState().logError('ERROR_TAU');
      } else {
        setMsg('Revisa: ¿dónde empieza (v₀) y dónde termina (v∞)?');
        useGame.getState().logError('ERROR_FORMULA_EXPONENCIAL');
      }
    }
  };

  const slot = (k: number) => (
    <span
      className={`f-slot num ${over === `s${k}` ? 'over' : ''} ${slots[k] ? 'filled' : ''}`}
      data-drop={`s${k}`}
      onClick={() => sel && place(sel, `s${k}`)}
    >
      {slots[k] ? fmt(val(slots[k])!) : k === 3 ? 'τ' : k === 1 ? 'v₀' : 'v∞'}
    </span>
  );

  const stage = (
    <div className="formula-stage">
      <StepTitle kicker="Ensambla" title="Ahora con números" />
      <div className="mini-circuit wide">
        <CircuitView circuit={c} solution={done ? sim.at(tl.time) : undefined} time={done ? tl.time : undefined} imax={sim.imax} vmax={sim.vmax} />
      </div>
      <div className="formula-row">
        <span className="f-fixed">v(t) =</span>
        {slot(0)}
        <span className="f-fixed">+ (</span>
        {slot(1)}
        <span className="f-fixed">−</span>
        {slot(2)}
        <span className="f-fixed">)·e^(−t/</span>
        {slot(3)}
        <span className="f-fixed">)</span>
      </div>
      {!done && (
        <div className="palette blocks">
          {chips.map((ch) => (
            <button key={ch.id} className={`f-block num ${sel === ch.id ? 'selected' : ''}`} onPointerDown={(e) => start(e, ch.id, <span className="f-block ghosted">{fmt(ch.v)}</span>)}>
              {fmt(ch.v)}
            </button>
          ))}
        </div>
      )}
      {done && <div className="banner pop-in">{responseString(fo.xinf, fo.x0plus, fo.tau, 'v', 'V')}</div>}
      {done && <TimeScrubber s={tl.s} onChange={tl.setS} playing={tl.playing} onPlay={tl.play} onPause={tl.pause} />}
      {msg && !done && <div className="toast pop-in">{msg}</div>}
      {ghost}
    </div>
  );
  const panel = (
    <div className="explore-panel">
      {done ? (
        <>
          <ResponseGraph fo={fo} time={tl.time} height={180} show63 />
          <div className="success-line">La fórmula y el circuito dicen lo mismo. Muévete por el tiempo.</div>
          <button className="btn primary wide" onClick={() => onDone()}>
            Continuar →
          </button>
        </>
      ) : (
        <button className="btn primary wide" disabled={!slots.every(Boolean)} onClick={check}>
          Comprobar
        </button>
      )}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
