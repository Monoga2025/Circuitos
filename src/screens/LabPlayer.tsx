import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BossStep } from '../activities/BossStep';
import { ClassifyStep } from '../activities/ClassifyStep';
import { CurveBuilderStep } from '../activities/CurveBuilderStep';
import { ExploreStep } from '../activities/ExploreStep';
import { FormulaStep } from '../activities/FormulaStep';
import { GuidedStep } from '../activities/GuidedStep';
import { QuestionStep } from '../activities/QuestionStep';
import { ReqHuntStep } from '../activities/ReqHuntStep';
import { RevealStep } from '../activities/RevealStep';
import { SlotStep } from '../activities/SlotStep';
import { SurviveStep } from '../activities/SurviveStep';
import { TauLabStep } from '../activities/TauLabStep';
import { TimeMachineStep } from '../activities/TimeMachineStep';
import { PlayerContext, type BossResult, type PlayerCtx } from '../activities/common';
import { sfx } from '../audio/sfx';
import { Reduction } from '../components/Reduction';
import { LAB_BY_ID, LABS } from '../data/labs';
import type { Hint, Lab, Step } from '../data/model';
import { QUESTION_BY_ID } from '../data/questions';
import { ERRORS, type ErrorType } from '../learning/errors';
import { displayMastery } from '../learning/mastery';
import { SKILLS, type SkillId } from '../learning/skills';
import type { ReviewItem } from '../learning/spaced';
import { useGame } from '../store/game';
import { MuteButton } from './Home';

export function LabPlayer({ labId }: { labId: string }) {
  const lab = LAB_BY_ID[labId];
  const progress = useGame((s) => s.labs[labId]);
  const [idx, setIdx] = useState(() => (progress && !progress.completed ? progress.step : 0));
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [solution, setSolution] = useState(false);
  const [context, setContext] = useState('');
  const [skills, setSkills] = useState<SkillId[]>([]);
  const [reduce, setReduce] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stars, setStars] = useState<number[]>([]);
  const [bosses, setBosses] = useState<BossResult[]>([]);
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const exam = !!lab.exam;

  useEffect(() => {
    if (!exam || finished) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [exam, finished]);

  const resetHints = useCallback(() => {
    setHintLevel(0);
    setSolution(false);
  }, []);

  const ctx: PlayerCtx = useMemo(
    () => ({
      exam,
      hintLevel: exam ? 0 : hintLevel,
      solution: exam ? false : solution,
      setHints,
      setContext,
      resetHints,
      stepSkills: setSkills,
      onBossResult: (r) => setBosses((b) => [...b, r]),
    }),
    [exam, hintLevel, solution, resetHints],
  );

  const advance = (s?: number) => {
    if (s) setStars((x) => [...x, s]);
    resetHints();
    if (review) {
      useGame.getState().dropReview(review.id);
      setReview(null);
      return;
    }
    const next = idx + 1;
    if (next >= lab.steps.length) {
      sfx.level();
      setFinished(true);
      const st = stars.length ? Math.round([...stars, s ?? 3].reduce((a, b) => a + b, 0) / (stars.length + 1)) : s ?? 3;
      useGame.getState().completeLab(lab.id, st);
      if (exam) {
        const score = bosses.reduce((a, b) => a + b.score, 0);
        const max = bosses.reduce((a, b) => a + b.max, 0);
        const errors: Partial<Record<ErrorType, number>> = {};
        for (const b of bosses) for (const e of b.errors) errors[e] = (errors[e] ?? 0) + 1;
        useGame.getState().addExam({ at: Date.now(), score, max, seconds: Math.round((Date.now() - startedAt.current) / 1000), errors });
      }
      return;
    }
    useGame.getState().setStep(lab.id, next);
    // spaced review: a failed idea comes back in another representation
    if (!exam) {
      const due = useGame.getState().takeDueReview();
      if (due && QUESTION_BY_ID[due.questionId]) setReview(due);
    }
    setIdx(next);
  };

  const step = lab.steps[idx];
  const key = review ? `rev-${review.id}` : `${lab.id}-${idx}`;
  const hintText = !exam && hintLevel > 0 ? hints[Math.min(hintLevel, hints.length) - 1]?.text : '';

  return (
    <PlayerContext.Provider value={ctx}>
      <div className={`lab-player ${exam ? 'exam' : ''}`} style={{ ['--lab' as string]: lab.color }}>
        <header className="lab-header">
          <button className="btn ghost" onClick={() => useGame.getState().go({ name: 'map' })} aria-label="Volver al mapa">
            ← Mapa
          </button>
          <div className="lab-title">
            <span className="lab-num">LAB {lab.num}</span>
            <span className="lab-name">{lab.title}</span>
          </div>
          <div className="dots">
            {lab.steps.map((_, k) => (
              <span key={k} className={`dot ${k < idx || finished ? 'done' : k === idx ? 'cur' : ''}`} />
            ))}
          </div>
          <div className="header-actions">
            {exam ? (
              <span className="timer">⏱ {fmtTime(Math.round((now - startedAt.current) / 1000))}</span>
            ) : (
              !finished && (
                <>
                  <button
                    className="btn help"
                    onClick={() => {
                      sfx.click();
                      setHintLevel((h) => Math.min(3, h + 1));
                    }}
                    disabled={hintLevel >= 3}
                  >
                    👁 MUÉSTRAME {hintLevel > 0 ? `${hintLevel}/3` : ''}
                  </button>
                  <button className="btn ghost small" onClick={() => setSolution(true)} disabled={solution}>
                    Ver solución completa
                  </button>
                  <button className="btn lost" onClick={() => setReduce(true)}>
                    😵 NO ENTIENDO NADA
                  </button>
                </>
              )
            )}
            <MuteButton />
          </div>
        </header>

        <main className="lab-main">
          {finished ? (
            exam ? (
              <ExamSummary bosses={bosses} seconds={Math.round((now - startedAt.current) / 1000)} />
            ) : (
              <LabComplete lab={lab} stars={stars} />
            )
          ) : review ? (
            <QuestionStep key={key} q={QUESTION_BY_ID[review.questionId]} onDone={() => advance()} kicker="⚡ Repaso relámpago (lo fallaste hace unos minutos)" />
          ) : (
            <StepRenderer key={key} step={step} lab={lab} onDone={advance} />
          )}
        </main>

        {!finished && (
          <footer className={`context-bar ${hintText ? 'hint' : ''} ${solution ? 'solution' : ''}`}>
            {solution ? '🔓 Solución visible: este paso cuenta poco para tu dominio.' : hintText ? `👁 ${hintText}` : context || lab.discover}
          </footer>
        )}
        {reduce && <Reduction skills={skills} onClose={() => setReduce(false)} />}
      </div>
    </PlayerContext.Provider>
  );
}

function StepRenderer({ step, lab, onDone }: { step: Step; lab: Lab; onDone: (s?: number) => void }) {
  switch (step.type) {
    case 'question':
      return <QuestionStep q={step.q} guidance={step.guidance} onDone={() => onDone()} />;
    case 'explore':
      return <ExploreStep step={step} lab={lab} onDone={onDone} />;
    case 'reveal':
      return <RevealStep step={step} lab={lab} onDone={onDone} />;
    case 'slot':
      return <SlotStep step={step} lab={lab} onDone={onDone} />;
    case 'classify':
      return <ClassifyStep step={step} lab={lab} onDone={onDone} />;
    case 'survive':
      return <SurviveStep step={step} lab={lab} onDone={onDone} />;
    case 'timeMachine':
      return <TimeMachineStep step={step} lab={lab} onDone={onDone} />;
    case 'tauLab':
      return <TauLabStep step={step} lab={lab} onDone={onDone} />;
    case 'reqHunt':
      return <ReqHuntStep step={step} lab={lab} onDone={onDone} />;
    case 'curveBuilder':
      return <CurveBuilderStep step={step} lab={lab} onDone={onDone} />;
    case 'formula':
      return <FormulaStep step={step} lab={lab} onDone={onDone} />;
    case 'guided':
      return <GuidedStep step={step} lab={lab} onDone={onDone} />;
    case 'boss':
      return <BossStep step={step} lab={lab} onDone={onDone} />;
  }
}

function labSkills(lab: Lab): SkillId[] {
  const set = new Set<SkillId>();
  for (const s of lab.steps) {
    if (s.type === 'question') s.q.skills.forEach((k) => set.add(k));
    if (s.type === 'explore' || s.type === 'slot') s.skills.forEach((k) => set.add(k));
    if (s.type === 'timeMachine') ['initialCondition', 'finalCondition'].forEach((k) => set.add(k as SkillId));
    if (s.type === 'reqHunt') ['theveninResistance', 'sourceDeactivation'].forEach((k) => set.add(k as SkillId));
    if (s.type === 'tauLab') set.add('timeConstantRC');
    if (s.type === 'formula' || s.type === 'curveBuilder' || s.type === 'guided' || s.type === 'boss') set.add('generalizedResponse');
  }
  return [...set];
}

function LabComplete({ lab, stars }: { lab: Lab; stars: number[] }) {
  const skills = useGame((s) => s.skills);
  const st = stars.length ? Math.round(stars.reduce((a, b) => a + b, 0) / stars.length) : 3;
  const next = LABS.find((l) => l.num === lab.num + 1);
  return (
    <div className="complete pop-in">
      <div className="big-emoji">{lab.icon}</div>
      <h2>¡Lab {lab.num} completado!</h2>
      <div className="stars">{'★'.repeat(st)}{'☆'.repeat(3 - st)}</div>
      <p className="discover">{lab.discover}</p>
      <div className="mini-mastery">
        {labSkills(lab).map((k) => (
          <div key={k} className="mm-row">
            <span>{SKILLS[k]}</span>
            <div className="m-bar">
              <div style={{ width: `${displayMastery(skills[k]) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn" onClick={() => useGame.getState().go({ name: 'map' })}>
          Mapa
        </button>
        {next && (
          <button className="btn primary" autoFocus onClick={() => useGame.getState().go({ name: 'lab', labId: next.id })}>
            Siguiente: Lab {next.num} — {next.title} →
          </button>
        )}
      </div>
    </div>
  );
}

function ExamSummary({ bosses, seconds }: { bosses: BossResult[]; seconds: number }) {
  const score = bosses.reduce((a, b) => a + b.score, 0);
  const max = bosses.reduce((a, b) => a + b.max, 0) || 1;
  const errors: Partial<Record<ErrorType, number>> = {};
  for (const b of bosses) for (const e of b.errors) errors[e] = (errors[e] ?? 0) + 1;
  const pct = Math.round((score / max) * 100);
  return (
    <div className="complete pop-in">
      <div className="big-emoji">🎓</div>
      <h2>Simulacro: {pct}%</h2>
      <p className="discover">
        {score}/{max} puntos · {fmtTime(seconds)}
      </p>
      <div className="exam-table">
        {bosses.map((b) => (
          <div key={b.name} className="et-row">
            <span>{b.name}</span>
            <b>
              {b.score}/{b.max}
            </b>
            <span className="et-proc">{b.procedure.length ? `⚠ ${b.procedure.length} fallo(s) de procedimiento` : '✓ procedimiento'}</span>
          </div>
        ))}
      </div>
      {Object.keys(errors).length > 0 && (
        <div className="err-list">
          <b>Repasa:</b>
          {Object.entries(errors).map(([e, n]) => (
            <span key={e} className="chip on">
              {ERRORS[e as ErrorType].title} ×{n}
            </span>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn" onClick={() => useGame.getState().go({ name: 'mastery' })}>
          Mapa de dominio
        </button>
        <button className="btn primary" onClick={() => useGame.getState().go({ name: 'map' })}>
          Volver al mapa
        </button>
      </div>
    </div>
  );
}

export function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
