// ENCUENTRA Req: remove C → turn off independent sources (V→cable, I→open)
// → see the network from the terminals → pick resistors → Req.
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CircuitView, type RenderMode } from '../components/CircuitView';
import { QuestionCard } from '../components/QuestionCard';
import { getCircuit } from '../data/circuits';
import type { QuestionDef, Step } from '../data/model';
import { firstOrder, fmt } from '../engine/analysis';
import { solve } from '../engine/mna';
import { useGame } from '../store/game';
import { StepLayout, StepTitle } from './Layout';
import { report, usePlayer, type StepProps } from './common';
import { numOptions } from './numeric';

type Phase = 'remove' | 'sources' | 'select' | 'test' | 'value' | 'done';

export function ReqHuntStep({ step, onDone }: StepProps<Extract<Step, { type: 'reqHunt' }>>) {
  const { setHints, setContext, stepSkills, hintLevel } = usePlayer();
  const c = getCircuit(step.circuit);
  const fo = useMemo(() => firstOrder(c), [c]);
  const storage = c.components.find((k) => k.id === c.storage)!;
  const independents = c.components.filter((k) => k.kind === 'V' || k.kind === 'I');
  const hasDep = c.components.some((k) => k.kind === 'VCCS');
  const [phase, setPhase] = useState<Phase>('remove');
  const [off, setOff] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [showTest, setShowTest] = useState(false);
  const [msg, setMsg] = useState('');
  const [selTries, setSelTries] = useState(0);
  const [t0] = useState(performance.now());

  const test = useMemo(
    () => solve(c, { phase: 'after', storage: { mode: 'removed' }, deactivate: true, testSource: { a: storage.a, b: storage.b, value: 1 } }),
    [c, storage],
  );
  const testImax = Math.max(...Object.values(test.compI).map(Math.abs), 0.01);
  const seen = c.components.filter((k) => k.kind === 'R' && Math.abs(test.compI[k.id]) > 1e-6).map((k) => k.id);

  const guided = step.guidance === 'guided';
  const INSTR: Record<Phase, string> = {
    remove: `1 · Retira el ${storage.kind === 'C' ? 'capacitor' : 'inductor'}: tócalo.`,
    sources: hasDep ? '2 · Apaga SOLO las fuentes independientes.' : '2 · Apaga las fuentes: tócalas.',
    select: '3 · ¿Qué resistencias “ve” desde a–b? Tócalas.',
    test: '3 · Con dependiente: inyecta 1 A de prueba y mide V.',
    value: '4 · ¿Cuánto vale Req?',
    done: '¡Req encontrada!',
  };

  useEffect(() => {
    const target =
      phase === 'remove' ? [storage.id] : phase === 'sources' ? independents.filter((k) => !off.includes(k.id)).map((k) => k.id) : phase === 'select' ? seen : [];
    setHints([
      { text: 'Mira lo que brilla.', highlight: target },
      { text: phase === 'sources' ? 'V apagada = cable. I apagada = abierto.' : phase === 'select' ? 'Mostramos por dónde circula una corriente de prueba.' : 'Serie: suma. Paralelo: producto/suma.' },
      { text: phase === 'select' ? 'Una R que queda colgando (sin salida) no cuenta.' : 'Avanza paso por paso.' },
    ]);
    stepSkills(['theveninResistance', 'sourceDeactivation']);
    setContext(INSTR[phase]);
  }, [phase, off.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hintLevel >= 2 && phase === 'select') setShowTest(true);
  }, [hintLevel, phase]);

  const onClick = (id: string) => {
    const comp = c.components.find((k) => k.id === id)!;
    if (phase === 'remove') {
      if (id === storage.id) {
        sfx.click();
        setPhase('sources');
        setMsg('');
      } else setMsg(`Primero retira el ${storage.kind === 'C' ? 'capacitor' : 'inductor'}.`);
      return;
    }
    if (phase === 'sources') {
      if (comp.kind === 'VCCS') {
        sfx.wrong();
        setMsg('⚠ ¡Es DEPENDIENTE! Esa NO se apaga: depende del circuito.');
        useGame.getState().logError('ERROR_APAGAR_FUENTES');
        report({ questionId: `${c.id}-dep`, skills: ['sourceDeactivation'], correctFirstTry: false, attempts: 1, hints: 0, options: 2, timeMs: 3000, representation: 'circuit-tap', difficulty: 2, error: 'ERROR_APAGAR_FUENTES' });
        return;
      }
      if (comp.kind === 'V' || comp.kind === 'I') {
        if (off.includes(id)) return;
        sfx.flip();
        const n = [...off, id];
        setOff(n);
        setMsg(comp.kind === 'V' ? 'Fuente de voltaje → CABLE (0 V)' : 'Fuente de corriente → ABIERTO (0 A)');
        if (n.length === independents.length) {
          setTimeout(() => {
            setPhase(hasDep ? 'test' : 'select');
            setMsg('');
          }, 900);
        }
      }
      return;
    }
    if (phase === 'select' && comp.kind === 'R') {
      sfx.click();
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    }
  };

  const checkSel = () => {
    const ok = seen.length === sel.length && seen.every((x) => sel.includes(x));
    const tries = selTries + 1;
    setSelTries(tries);
    if (ok) {
      sfx.correct();
      report({ questionId: `${c.id}-sel`, skills: ['theveninResistance'], correctFirstTry: tries === 1, attempts: tries, hints: hintLevel, options: 0, timeMs: performance.now() - t0, representation: 'circuit-select', difficulty: 2 });
      setShowTest(true);
      setMsg('✓ Esa es la red que ve el elemento.');
      setTimeout(() => setPhase('value'), 700);
    } else {
      sfx.wrong();
      useGame.getState().logError('ERROR_REQ');
      setShowTest(true);
      const extra = sel.filter((x) => !seen.includes(x));
      setMsg(extra.length ? 'Mira la corriente de prueba: alguna R elegida no la recibe (queda colgando).' : 'Te falta alguna R por la que sí circula la corriente de prueba.');
    }
  };

  const modes: Record<string, RenderMode> = {};
  if (phase !== 'remove') modes[storage.id] = 'removed';
  for (const id of off) modes[id] = c.components.find((k) => k.id === id)!.kind === 'V' ? 'short' : 'open';

  const valueQ: QuestionDef = useMemo(() => {
    const sumR = c.components.filter((k) => k.kind === 'R').reduce((a, k) => a + k.value, 0);
    const selSum = seen.reduce((a, id) => a + c.components.find((k) => k.id === id)!.value, 0);
    const indepOnly = solve(
      { ...c, components: c.components.filter((k) => k.kind !== 'VCCS') },
      { phase: 'after', storage: { mode: 'removed' }, deactivate: true, testSource: { a: storage.a, b: storage.b, value: 1 } },
    );
    const noDep = indepOnly.pointV[storage.a] - indepOnly.pointV[storage.b];
    return {
      id: `${c.id}-reqval`,
      prompt: hasDep ? `Medimos V = ${fmt(fo.Req)} V con 1 A de prueba. Req = V / I = ?` : '¿Cuánto vale Req vista desde a–b?',
      skills: ['theveninResistance', 'seriesParallel'],
      representation: hasDep ? 'test-source' : 'numeric',
      difficulty: 3,
      options: numOptions(fo.Req, [[sumR, 'ERROR_REQ'], [selSum, 'ERROR_REQ'], [noDep, 'ERROR_APAGAR_FUENTES']], 'Ω'),
      success: `Req = ${fmt(fo.Req)} Ω  →  τ = ${storage.kind === 'C' ? `${fmt(fo.Req)} · ${fmt(storage.value)}` : `${fmt(storage.value)} / ${fmt(fo.Req)}`} = ${fmt(fo.tau)} s`,
    };
  }, [c, fo, seen, hasDep, storage]);

  const clickable = (k: { kind: string; id: string }) =>
    (phase === 'remove' && k.id === storage.id) ||
    (phase === 'sources' && ['V', 'I', 'VCCS'].includes(k.kind) && !off.includes(k.id)) ||
    (phase === 'select' && k.kind === 'R');

  const stage = (
    <div className="req-stage">
      <StepTitle kicker="Encuentra Req" title="¿Qué resistencia ve el capacitor?" />
      {guided && <div className="instr big">{INSTR[phase]}</div>}
      <div className="circuit-wrap">
        <CircuitView
          circuit={c}
          solution={showTest || phase === 'value' || phase === 'done' ? test : undefined}
          imax={testImax}
          modes={modes}
          terminals={phase !== 'remove' ? { a: storage.a, b: storage.b } : undefined}
          meter={phase === 'test' && showTest ? `V = ${fmt(fo.Req)} V` : phase === 'value' || phase === 'done' ? `Req = ?` : undefined}
          onComponentClick={onClick}
          clickable={clickable}
          selected={phase === 'select' ? sel : phase === 'value' ? seen : []}
          dim={phase === 'value' ? c.components.filter((k) => k.kind === 'R' && !seen.includes(k.id)).map((k) => k.id) : []}
          highlight={hintLevel >= 1 ? (phase === 'remove' ? [storage.id] : phase === 'sources' ? independents.filter((k) => !off.includes(k.id)).map((k) => k.id) : []) : []}
        />
        {phase === 'remove' && <div className="float-cta pulse-text">Toca el {storage.kind === 'C' ? 'capacitor' : 'inductor'} para retirarlo</div>}
      </div>
      {msg && <div className="toast pop-in" key={msg}>{msg}</div>}
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <ol className="req-steps">
        {(['remove', 'sources', hasDep ? 'test' : 'select', 'value'] as Phase[]).map((p) => {
          const order: Phase[] = ['remove', 'sources', hasDep ? 'test' : 'select', 'value', 'done'];
          const idx = order.indexOf(p);
          const cur = order.indexOf(phase);
          return (
            <li key={p} className={idx < cur ? 'ok' : idx === cur ? 'cur' : ''}>
              {idx < cur ? '✓ ' : ''}
              {INSTR[p]}
            </li>
          );
        })}
      </ol>
      {phase === 'select' && (
        <button className="btn primary wide" disabled={!sel.length} onClick={checkSel}>
          Comprobar selección
        </button>
      )}
      {phase === 'test' && !showTest && (
        <button
          className="btn primary wide pulse"
          onClick={() => {
            sfx.energy();
            setShowTest(true);
            setTimeout(() => setPhase('value'), 1200);
          }}
        >
          ⚡ Inyectar 1 A de prueba
        </button>
      )}
      {phase === 'value' && <QuestionCard q={valueQ} onSolved={() => onDone()} />}
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
