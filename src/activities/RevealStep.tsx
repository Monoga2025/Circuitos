// Formulas appear ONLY after the student discovered the behaviour. Tap to reveal.
import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { QuestionCard } from '../components/QuestionCard';
import type { Step } from '../data/model';
import { StepLayout, StepTitle } from './Layout';
import { usePlayer, type StepProps } from './common';

export function RevealStep({ step, onDone }: StepProps<Extract<Step, { type: 'reveal' }>>) {
  const { setHints, setContext, stepSkills } = usePlayer();
  const [shown, setShown] = useState(1);
  useEffect(() => {
    setHints([{ text: 'Toca cada tarjeta para revelar la siguiente.' }]);
    setContext('Lo que viste, en una línea.');
    stepSkills(step.check?.skills ?? []);
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = shown >= step.cards.length;

  const stage = (
    <div className="reveal-stage">
      <StepTitle kicker="Descubriste" title={step.title} />
      <div className="reveal-grid">
        {step.cards.map((c, k) => (
          <button
            key={c.title}
            className={`reveal-card tone-${c.tone ?? 'n'} ${k < shown ? 'on' : 'off'}`}
            onClick={() => {
              if (k === shown - 1 && !all) {
                sfx.click();
                setShown(shown + 1);
              }
            }}
            disabled={k >= shown}
          >
            <span className="rc-title">{c.title}</span>
            {k < shown ? (
              <>
                {c.formula && <span className="rc-formula">{c.formula}</span>}
                <span className="rc-meaning">{c.meaning}</span>
                {k === shown - 1 && !all && <span className="rc-next">toca → siguiente</span>}
              </>
            ) : (
              <span className="rc-lock">?</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const panel = all ? (
    step.check ? (
      <QuestionCard q={step.check} onSolved={() => onDone()} />
    ) : (
      <button className="btn primary wide" onClick={() => onDone()} autoFocus>
        Entendido →
      </button>
    )
  ) : (
    <div className="muted-note">Revela las {step.cards.length} tarjetas.</div>
  );
  return <StepLayout stage={stage} panel={panel} />;
}
