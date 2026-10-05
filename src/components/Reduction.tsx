// "NO ENTIENDO NADA": no more theory. Shrink the problem to ONE element + ONE source,
// ask ONE question, then rebuild the circuit step by step.
import { useMemo, useState } from 'react';
import { report } from '../activities/common';
import { sfx } from '../audio/sfx';
import { getCircuit } from '../data/circuits';
import type { SkillId } from '../learning/skills';
import { CircuitView, type RenderMode } from './CircuitView';
import { useLoopTime } from './Remediation';
import { buildSim } from './sim';

interface Red {
  circuit: string;
  question: string;
  options: [string, boolean][];
  aha: string;
  modes?: Record<string, RenderMode>;
  freeze?: boolean;
}

const RED: Partial<Record<SkillId, Red>> & { default: Red } = {
  capacitorDc: {
    circuit: 'mini-c',
    question: 'Después de muchísimo tiempo conectado a DC, ¿sigue entrando corriente al capacitor?',
    options: [['Sí', false], ['No', true]],
    aha: 'Se llena y la corriente para. Por eso en ∞: C = abierto.',
  },
  capacitorContinuity: {
    circuit: 'mini-c',
    question: 'El capacitor estaba vacío (0 V). Un instante después de conectar, ¿ya tiene 10 V?',
    options: [['Sí, de golpe', false], ['No, todavía 0 V', true]],
    aha: 'Llenarlo toma tiempo: vC no salta. vC(0⁺) = vC(0⁻).',
  },
  inductorDc: {
    circuit: 'mini-l',
    question: 'Después de muchísimo tiempo, ¿el inductor frena la corriente?',
    options: [['Sí, la bloquea', false], ['No: deja pasar todo, es un cable', true]],
    aha: 'Corriente constante → vL = 0 → cable.',
  },
  inductorContinuity: {
    circuit: 'mini-l',
    question: 'La corriente era 0 antes de cerrar. ¿Justo después ya es 5 A?',
    options: [['Sí', false], ['No, arranca en 0', true]],
    aha: 'iL no salta: iL(0⁺) = iL(0⁻).',
  },
  sourceDeactivation: {
    circuit: 'w-vsrc',
    question: 'Una fuente de voltaje que vale 0 V es igual a…',
    options: [['un cable', true], ['un hueco', false]],
    aha: 'V = 0 → cable. I = 0 → hueco.',
    modes: { V: 'short' },
    freeze: true,
  },
  timeConstantRC: {
    circuit: 'mini-c',
    question: 'Si la carga es MUY lenta, τ es…',
    options: [['grande', true], ['pequeña', false]],
    aha: 'τ = tiempo característico. Grande = lento.',
  },
  generalizedResponse: {
    circuit: 'mini-c',
    question: 'La curva empieza en v(0⁺). ¿Dónde termina?',
    options: [['en v(∞)', true], ['en 0 siempre', false]],
    aha: 'Inicio, final y velocidad: con eso dibujas todo.',
  },
  signConvention: {
    circuit: 'w-ohm',
    question: 'Si la corriente real va CONTRA tu flecha, el número es…',
    options: [['negativo', true], ['positivo', false]],
    aha: 'El signo solo dice si coincide con tu flecha.',
    freeze: true,
  },
  default: {
    circuit: 'mini-c',
    question: 'Después de muchísimo tiempo conectado a DC, ¿sigue entrando corriente al capacitor?',
    options: [['Sí', false], ['No', true]],
    aha: 'Empieza siempre por aquí: en DC estable, C = abierto, L = cable.',
  },
};
const ALIAS: Partial<Record<SkillId, SkillId>> = {
  finalCondition: 'capacitorDc',
  initialCondition: 'capacitorContinuity',
  theveninResistance: 'sourceDeactivation',
  timeConstantRL: 'timeConstantRC',
  stepResponse: 'generalizedResponse',
  naturalResponse: 'generalizedResponse',
  superposition: 'sourceDeactivation',
};

export function Reduction({ skills, onClose }: { skills: SkillId[]; onClose: () => void }) {
  const key = (skills.map((s) => (RED[s] ? s : ALIAS[s])).find((s) => s && RED[s]) ?? 'default') as SkillId | 'default';
  const red = RED[key as SkillId] ?? RED.default;
  const c = getCircuit(red.circuit);
  const sim = useMemo(() => buildSim(c), [c]);
  const loop = useLoopTime(sim.fo?.tau ?? 1, 4);
  const time = red.freeze ? ({ kind: 'after', t: 0 } as const) : loop;
  const [stage, setStage] = useState<'ask' | 'aha' | 'rebuild'>('ask');
  const [wrong, setWrong] = useState(false);
  const [rb, setRb] = useState(0);

  const pick = (ok: boolean) => {
    if (ok) {
      sfx.correct();
      report({ questionId: `reduce-${key}`, skills: [key === 'default' ? 'capacitorDc' : (key as SkillId)], correctFirstTry: !wrong, attempts: wrong ? 2 : 1, hints: 1, options: 2, timeMs: 0, representation: 'reduced', difficulty: 1 });
      setStage('aha');
    } else {
      sfx.wrong();
      setWrong(true);
    }
  };

  const REBUILD = ['Solo el elemento + una fuente', '+ las resistencias', '+ el interruptor (t = 0)', 'Circuito completo: misma idea'];

  return (
    <div className="overlay">
      <div className="reduction pop-in">
        <div className="remed-tag">Vamos más simple</div>
        {stage !== 'rebuild' && (
          <>
            <div className="red-circuit">
              <CircuitView circuit={c} solution={sim.at(time)} time={time} imax={sim.imax} vmax={sim.vmax} modes={red.modes} hideDisplay={false} />
            </div>
            <p className="red-q">{red.question}</p>
          </>
        )}
        {stage === 'ask' && (
          <div className="conf-row">
            {red.options.map(([t, ok]) => (
              <button key={t} className={`btn big ${wrong && !ok ? 'shake' : ''}`} onClick={() => pick(ok)}>
                {t}
              </button>
            ))}
          </div>
        )}
        {wrong && stage === 'ask' && <p className="remed-line">Mira la animación otra vez: ¿qué hace la corriente al final?</p>}
        {stage === 'aha' && (
          <>
            <p className="remed-line strong">{red.aha}</p>
            <button className="btn primary" onClick={() => setStage('rebuild')}>
              Reconstruir el circuito →
            </button>
          </>
        )}
        {stage === 'rebuild' && (
          <>
            <div className="rebuild">
              {REBUILD.map((t, k) => (
                <div key={t} className={`rb ${k <= rb ? 'on' : ''}`}>
                  {k <= rb ? '✓' : '○'} {t}
                </div>
              ))}
            </div>
            {rb < REBUILD.length - 1 ? (
              <button className="btn primary" onClick={() => setRb(rb + 1)}>
                Añadir →
              </button>
            ) : (
              <button className="btn primary" onClick={onClose}>
                Volver al problema
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
