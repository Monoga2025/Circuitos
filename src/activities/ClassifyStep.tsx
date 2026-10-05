// Rapid classification minigame: drag each property to CAPACITOR or INDUCTOR.
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CompareTable } from '../components/CompareTable';
import { useDragDrop } from '../components/useDragDrop';
import type { Step } from '../data/model';
import type { ErrorType } from '../learning/errors';
import type { SkillId } from '../learning/skills';
import { useGame } from '../store/game';
import { StepLayout, StepTitle } from './Layout';
import { report, shuffle, usePlayer, type StepProps } from './common';

interface Card {
  id: string;
  text: string;
  bin: 'C' | 'L';
  skill: SkillId;
  error: ErrorType;
}

const CARDS: Card[] = [
  { id: 'v', text: 'Su VOLTAJE no salta', bin: 'C', skill: 'capacitorContinuity', error: 'ERROR_CONTINUIDAD' },
  { id: 'i', text: 'Su CORRIENTE no salta', bin: 'L', skill: 'inductorContinuity', error: 'ERROR_CONTINUIDAD' },
  { id: 'open', text: 'DC estable = ABIERTO', bin: 'C', skill: 'capacitorDc', error: 'CONFUSION_DC_CAPACITOR' },
  { id: 'short', text: 'DC estable = CABLE', bin: 'L', skill: 'inductorDc', error: 'CONFUSION_DC_INDUCTOR' },
  { id: 'ef', text: 'Campo ELÉCTRICO', bin: 'C', skill: 'capacitorDc', error: 'CONFUSION_DC_CAPACITOR' },
  { id: 'mf', text: 'Campo MAGNÉTICO', bin: 'L', skill: 'inductorDc', error: 'CONFUSION_DC_INDUCTOR' },
  { id: 'wc', text: 'w = ½·C·v²', bin: 'C', skill: 'capacitorDc', error: 'CONFUSION_DC_CAPACITOR' },
  { id: 'wl', text: 'w = ½·L·i²', bin: 'L', skill: 'inductorDc', error: 'CONFUSION_DC_INDUCTOR' },
  { id: 'ic', text: 'i = C·dv/dt', bin: 'C', skill: 'capacitorDc', error: 'CONFUSION_DC_CAPACITOR' },
  { id: 'vl', text: 'v = L·di/dt', bin: 'L', skill: 'inductorDc', error: 'CONFUSION_DC_INDUCTOR' },
  { id: 'tc', text: 'τ = Req·C', bin: 'C', skill: 'timeConstantRC', error: 'ERROR_TAU' },
  { id: 'tl', text: 'τ = L / Req', bin: 'L', skill: 'timeConstantRL', error: 'ERROR_TAU' },
];

export function ClassifyStep({ step, onDone }: StepProps<Extract<Step, { type: 'classify' }>>) {
  const { setHints, setContext, stepSkills } = usePlayer();
  const deck = useMemo(() => shuffle(CARDS), []);
  const [placed, setPlaced] = useState<Record<string, 'C' | 'L'>>({});
  const [missed, setMissed] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [t0] = useState(() => performance.now());
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const lastT = useRef(performance.now());

  useEffect(() => {
    setHints([
      { text: 'C protege VOLTAJE. L protege CORRIENTE.' },
      { text: 'C en DC = abierto. L en DC = cable.' },
      { text: 'C → campo eléctrico, L → campo magnético.' },
    ]);
    stepSkills(['capacitorDc', 'inductorDc', 'capacitorContinuity', 'inductorContinuity']);
    setContext('¡Rápido! Arrastra cada tarjeta a su dueño (o tócala y luego toca el bin).');
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const drop = (cardId: string, bin: string) => {
    const card = CARDS.find((c) => c.id === cardId)!;
    if (placed[cardId]) return;
    const firstTry = !missed.includes(cardId);
    const now = performance.now();
    if (card.bin === bin) {
      sfx.correct();
      const next = { ...placed, [cardId]: card.bin };
      setPlaced(next);
      report({
        questionId: `classify-${cardId}`,
        skills: [card.skill],
        correctFirstTry: firstTry,
        attempts: firstTry ? 1 : 2,
        hints: 0,
        options: 2,
        timeMs: now - lastT.current,
        representation: 'classify',
        difficulty: 1,
      });
      if (Object.keys(next).length === CARDS.length) setDoneAt(now);
    } else {
      sfx.wrong();
      setShake(cardId);
      setTimeout(() => setShake(null), 500);
      if (firstTry) {
        setMissed((m) => [...m, cardId]);
        useGame.getState().logError(card.error);
      }
    }
    lastT.current = now;
    setSel(null);
  };

  const { start, ghost, over } = useDragDrop<string>(drop, (id) => setSel(id));
  const remaining = deck.filter((c) => !placed[c.id]);
  const finished = remaining.length === 0;
  const secs = ((doneAt ?? performance.now()) - t0) / 1000;
  const stars = missed.length === 0 ? 3 : missed.length <= 2 ? 2 : 1;

  const bin = (b: 'C' | 'L') => (
    <div
      className={`bin bin-${b} ${over === b ? 'over' : ''} ${sel ? 'armed' : ''}`}
      data-drop={b}
      onClick={() => sel && drop(sel, b)}
    >
      <div className="bin-title">{b === 'C' ? 'CAPACITOR ⊣⊢' : 'INDUCTOR ∿'}</div>
      <div className="bin-cards">
        {CARDS.filter((c) => placed[c.id] === b).map((c) => (
          <span key={c.id} className="mini-card">
            {c.text}
          </span>
        ))}
      </div>
    </div>
  );

  const stage = (
    <div className="classify-stage">
      <StepTitle kicker="Minijuego" title="¿De quién es?" />
      <div className="bins">
        {bin('C')}
        <div className="deck">
          {remaining.slice(0, 3).map((c, k) => (
            <button
              key={c.id}
              className={`card-drag ${shake === c.id ? 'shake' : ''} ${sel === c.id ? 'selected' : ''} ${k > 0 ? 'queued' : ''}`}
              onPointerDown={(e) => k === 0 && start(e, c.id, <span className="card-drag ghosted">{c.text}</span>)}
              disabled={k > 0}
              data-bin={import.meta.env.DEV ? c.bin : undefined}
            >
              {c.text}
            </button>
          ))}
          {finished && <div className="deck-done pop-in">¡Completo! {secs.toFixed(0)} s · {'★'.repeat(stars)}</div>}
        </div>
        {bin('L')}
      </div>
      {ghost}
    </div>
  );

  const panel = (
    <div className="explore-panel">
      <div className="score-row">
        <span>Quedan {remaining.length}</span>
        <span>Fallos {missed.length}</span>
      </div>
      {finished && <CompareTable />}
      <button className="btn primary wide" disabled={!finished} onClick={() => onDone(stars)}>
        {finished ? 'Continuar →' : 'Clasifica todas'}
      </button>
    </div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
