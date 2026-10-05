// Multiple-choice with visual options, confidence check, classified errors and
// remediation micro-animations. Only the FIRST attempt counts as evidence.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { report, shuffle, usePlayer, type AnswerEvent } from '../activities/common';
import { sfx } from '../audio/sfx';
import type { OptionDef, QuestionDef } from '../data/model';
import type { Confidence } from '../learning/mastery';
import { OptionIcon } from './Icons';
import { Remediation } from './Remediation';
import { MiniCurve } from './ResponseGraph';

let questionCounter = 0;

interface Props {
  q: QuestionDef;
  onSolved: (e: AnswerEvent) => void;
  /** Continue button text after success; if null, onSolved is the end */
  continueLabel?: string | null;
  noReport?: boolean;
  /** Extra hint level from the parent (MUÉSTRAME) */
  compact?: boolean;
}

export function QuestionCard({ q, onSolved, continueLabel = 'Continuar', noReport, compact }: Props) {
  const { exam, hintLevel, solution } = usePlayer();
  const askConf = useMemo(() => {
    if (exam) return false;
    questionCounter++;
    return !!q.confidence || questionCounter % 4 === 0;
  }, [q.id, exam]); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<'conf' | 'answer' | 'remed' | 'done'>(askConf ? 'conf' : 'answer');
  const [conf, setConf] = useState<Confidence | undefined>();
  const [order, setOrder] = useState<OptionDef[]>(() => shuffle(q.options));
  const [wrong, setWrong] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [firstError, setFirstError] = useState<OptionDef | null>(null);
  const t0 = useRef(performance.now());
  const firstTime = useRef(0);
  const event = useRef<AnswerEvent | null>(null);

  useEffect(() => {
    setPhase(askConf ? 'conf' : 'answer');
    setOrder(shuffle(q.options));
    setWrong([]);
    setPicked(null);
    setFirstError(null);
    setConf(undefined);
    t0.current = performance.now();
    firstTime.current = 0;
    event.current = null;
  }, [q.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hintsUsed = hintLevel + (solution ? 2 : 0);
  const correct = q.options.find((o) => o.correct)!;
  const eliminated = !exam && hintLevel >= 3 ? order.find((o) => !o.correct && !wrong.includes(o.id))?.id : undefined;

  const choose = (o: OptionDef) => {
    if (phase !== 'answer' || wrong.includes(o.id)) return;
    setPicked(o.id);
    if (!firstTime.current) firstTime.current = performance.now() - t0.current;
    const attempts = wrong.length + 1;
    if (exam) {
      const ev: AnswerEvent = mkEvent(q, !!o.correct, 1, 0, firstTime.current, conf, o.correct ? undefined : o.error);
      if (!noReport) report(ev);
      o.correct ? sfx.correct() : sfx.wrong();
      onSolved(ev);
      return;
    }
    if (o.correct) {
      sfx.correct();
      const ev = mkEvent(q, attempts === 1, attempts, hintsUsed, firstTime.current, conf, firstError?.error);
      event.current = ev;
      if (!noReport) report(ev);
      setPhase('done');
      if (continueLabel === null) onSolved(ev);
    } else {
      sfx.wrong();
      if (!firstError) setFirstError(o);
      setWrong((w) => [...w, o.id]);
      setPhase('remed');
    }
  };

  const retry = () => {
    setOrder((prev) => shuffle(prev));
    setPicked(null);
    setPhase('answer');
  };

  const remedError = wrong.length ? q.options.find((o) => o.id === wrong[wrong.length - 1])?.error : undefined;

  return (
    <div className={`qcard ${compact ? 'compact' : ''}`}>
      <div className="q-prompt">{q.prompt}</div>

      {phase === 'conf' && (
        <div className="conf pop-in">
          <div className="conf-title">Antes de responder: ¿qué tan seguro estás?</div>
          <div className="conf-row">
            {(
              [
                ['guess', '🎲', 'Estoy adivinando'],
                ['medium', '🤔', 'Más o menos'],
                ['sure', '🎯', 'Seguro'],
              ] as const
            ).map(([k, e, t]) => (
              <button
                key={k}
                className="btn conf-btn"
                onClick={() => {
                  setConf(k);
                  setPhase('answer');
                  t0.current = performance.now();
                }}
              >
                <span className="emoji">{e}</span>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase !== 'conf' && (
        <div className={`options ${order.some((o) => o.visual) ? 'visual' : ''}`}>
          {order.map((o) => {
            const isWrong = wrong.includes(o.id);
            const isRight = phase === 'done' && o.correct;
            const reveal = solution && !exam && o.correct && phase === 'answer';
            return (
              <button
                key={o.id}
                className={`option ${isWrong ? 'wrong' : ''} ${isRight ? 'right' : ''} ${reveal ? 'reveal' : ''} ${eliminated === o.id ? 'elim' : ''} ${picked === o.id ? 'picked' : ''}`}
                onClick={() => choose(o)}
                data-ok={import.meta.env.DEV && o.correct ? '1' : undefined}
                disabled={isWrong || phase === 'done' || eliminated === o.id}
              >
                {o.visual?.kind === 'icon' && <OptionIcon icon={o.visual.icon} />}
                {o.visual?.kind === 'curve' && <MiniCurve {...o.visual} />}
                <span className="opt-label">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {phase === 'done' && (
        <div className="success pop-in">
          <div className="success-title">✓ {conf === 'guess' ? 'Correcto… ¡pero dijiste que adivinabas! Volverá a aparecer.' : '¡Eso es!'}</div>
          {(q.success || correct.label) && <div className="success-line">{q.success ?? correct.label}</div>}
          {continueLabel && (
            <button className="btn primary" autoFocus onClick={() => onSolved(event.current!)}>
              {continueLabel} →
            </button>
          )}
        </div>
      )}

      {phase === 'remed' &&
        createPortal(
          <div className="overlay">
            <Remediation error={remedError ?? 'ERROR_BASICO'} onRetry={retry} />
          </div>,
          document.body,
        )}
    </div>
  );
}

function mkEvent(
  q: QuestionDef,
  correctFirstTry: boolean,
  attempts: number,
  hints: number,
  timeMs: number,
  confidence: Confidence | undefined,
  error: AnswerEvent['error'],
): AnswerEvent {
  return {
    questionId: q.id,
    skills: q.skills,
    correctFirstTry,
    attempts,
    hints,
    options: q.options.length,
    timeMs,
    confidence,
    representation: q.representation,
    difficulty: q.difficulty,
    error,
  };
}
