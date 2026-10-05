// Error-specific micro-animations. Never a paragraph: one picture, one line, retry.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCircuit } from '../data/circuits';
import { firstOrder } from '../engine/analysis';
import type { TimeState } from '../engine/types';
import type { ErrorType } from '../learning/errors';
import { ERRORS } from '../learning/errors';
import { CircuitView, type RenderMode } from './CircuitView';
import { ResponseGraph } from './ResponseGraph';
import { buildSim } from './sim';

/** Loops t from 0 to 6τ every `period` seconds. */
export function useLoopTime(tau: number, period = 5): TimeState {
  const [t, setT] = useState(0);
  const start = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const f = ((now - start.current) / 1000 / period) % 1.15;
      setT(Math.min(1, f) * 6 * tau);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tau, period]);
  return { kind: 'after', t };
}

function LiveMini({ circuitId, stages, probe }: { circuitId: string; stages: [number, string][]; probe: 'i' | 'v' }) {
  const c = getCircuit(circuitId);
  const sim = useMemo(() => buildSim(c), [c]);
  const tau = sim.fo!.tau;
  const time = useLoopTime(tau, 4.5);
  const sol = sim.at(time);
  const el = time.kind === 'after' ? time.t / tau : 0;
  const storage = c.storage!;
  const val = probe === 'i' ? sol.compI[storage] : sol.compV[storage];
  const max = probe === 'i' ? sim.imax : sim.vmax;
  return (
    <div className="remed-live">
      <CircuitView circuit={c} solution={sol} time={time} imax={sim.imax} vmax={sim.vmax} highlight={[storage]} hideDisplay />
      <div className="remed-bar">
        <span>{probe === 'i' ? 'corriente' : 'voltaje'}</span>
        <div className="m-bar big">
          <div style={{ width: `${Math.min(1, Math.abs(val) / max) * 100}%` }} />
        </div>
      </div>
      <div className="stage-chips">
        {stages.map(([until, text], k) => {
          const prev = k === 0 ? -1 : stages[k - 1][0];
          const on = el > prev && el <= until;
          return (
            <span key={text} className={`chip ${on ? 'on' : ''}`}>
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ circuitId, comp, a, b, labelA, labelB }: { circuitId: string; comp: string; a: RenderMode; b: RenderMode; labelA: string; labelB: string }) {
  const c = getCircuit(circuitId);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn((x) => !x), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="remed-live">
      <CircuitView circuit={c} modes={{ [comp]: on ? b : a }} highlight={[comp]} showFlow={false} />
      <div className="stage-chips">
        <span className={`chip ${!on ? 'on' : ''}`}>{labelA}</span>
        <span className={`chip ${on ? 'on' : ''}`}>{labelB}</span>
      </div>
    </div>
  );
}

export function Remediation({ error, onRetry }: { error: ErrorType; onRetry: () => void }) {
  let body: React.ReactNode;
  let line = '';
  switch (error) {
    case 'CONFUSION_DC_CAPACITOR':
      body = <LiveMini circuitId="mini-c" probe="i" stages={[[0.4, 'al inicio → MUCHA'], [3, 'después → disminuye'], [99, 'estable → CERO']]} />;
      line = 'Corriente al capacitor: se apaga sola. Lleno = abierto.';
      break;
    case 'CONFUSION_DC_INDUCTOR':
      body = <LiveMini circuitId="mini-l" probe="v" stages={[[0.4, 'al inicio: vL grande'], [3, 'vL baja'], [99, 'estable: vL = 0 → cable']]} />;
      line = 'Sin voltaje y con corriente: eso es un cable.';
      break;
    case 'ERROR_CONTINUIDAD': {
      const fo = firstOrder(getCircuit('tm-rc-discharge'));
      body = <ResponseGraph fo={fo} emphasize="start" showTauMarks={false} height={170} />;
      line = 'vC (y iL) arrancan EXACTAMENTE donde quedaron. Sin saltos.';
      break;
    }
    case 'ERROR_CONDICION_INICIAL':
      body = (
        <CircuitView circuit={getCircuit('tm-rc-discharge')} time={{ kind: 'before' }} modes={{ C: 'open' }} highlight={['S']} showFlow={false} />
      );
      line = 't < 0: switch en su posición VIEJA y C abierto.';
      break;
    case 'ERROR_CONDICION_FINAL':
      body = (
        <CircuitView circuit={getCircuit('tm-rc-charge')} time={{ kind: 'inf' }} modes={{ C: 'open' }} highlight={['S', 'C']} showFlow={false} />
      );
      line = 't → ∞: switch en posición NUEVA y C abierto (L cable).';
      break;
    case 'ERROR_APAGAR_FUENTES':
      body = (
        <div className="remed-pair">
          <Toggle circuitId="w-vsrc" comp="V" a="normal" b="short" labelA="fuente V" labelB="V apagada = cable" />
          <Toggle circuitId="w-isrc" comp="I" a="normal" b="open" labelA="fuente I" labelB="I apagada = abierto" />
        </div>
      );
      line = 'Dependientes: NO se apagan.';
      break;
    case 'ERROR_REQ':
      body = (
        <CircuitView
          circuit={getCircuit('req-1')}
          modes={{ C: 'removed', V: 'short', I: 'open' }}
          terminals={{ a: 'ct', b: 'cb' }}
          highlight={['R1', 'R2']}
          dim={['R3']}
          showFlow={false}
        />
      );
      line = 'Mira DESDE los terminales del C. Una R colgando (sin salida) no cuenta.';
      break;
    case 'ERROR_TAU':
    case 'ERROR_UNIDADES': {
      const a = firstOrder(getCircuit('c-charge'));
      const b = { ...a, tau: a.tau * 2.5 };
      body = <ResponseGraph fo={b} ghost={a} showTauMarks={false} tSpan={6} height={170} />;
      line = error === 'ERROR_UNIDADES' ? 'Ω·F = s   y   H/Ω = s.  τ siempre en segundos.' : 'RC: τ = R·C (más R → lento).  RL: τ = L/R (más R → rápido).';
      break;
    }
    case 'ERROR_SIGNO':
      body = (
        <svg viewBox="0 0 300 90" className="remed-svg">
          <line x1={20} y1={45} x2={280} y2={45} className="wire" />
          <path d="M80 25 L220 25 M220 25 l-10 -6 M220 25 l-10 6" className="sym-line arrow-ref" />
          <text x={150} y={16} textAnchor="middle" className="clabel">tu flecha i</text>
          <path d="M220 65 L80 65 M80 65 l10 -6 M80 65 l10 6" className="sym-line arrow-real" />
          <text x={150} y={86} textAnchor="middle" className="clabel">corriente real → i &lt; 0</text>
        </svg>
      );
      line = 'Corriente real contra tu flecha → valor NEGATIVO.';
      break;
    case 'ERROR_FORMULA_EXPONENCIAL': {
      const fo = firstOrder(getCircuit('tm-rc-charge'));
      body = <ResponseGraph fo={fo} emphasize="end" height={170} />;
      line = 'Empieza en x(0⁺), TERMINA en x(∞): final + (inicio − final)·e^(−t/τ).';
      break;
    }
    default:
      body = <CircuitView circuit={getCircuit('w-ohm')} showFlow={false} />;
      line = 'V = I·R.  Paralelo: (R1·R2)/(R1+R2).  LCK: lo que entra = lo que sale.';
  }
  return (
    <div className="remediation pop-in">
      <div className="remed-tag">{ERRORS[error]?.title ?? 'Revisa'}</div>
      <div className="remed-body">{body}</div>
      <p className="remed-line">{line}</p>
      <button className="btn primary" onClick={onRetry} autoFocus>
        Intentar de nuevo
      </button>
    </div>
  );
}
