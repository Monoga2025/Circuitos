import { createContext, useContext } from 'react';
import type { Hint, Lab, Step } from '../data/model';
import type { ErrorType } from '../learning/errors';
import type { Confidence, Evidence } from '../learning/mastery';
import type { SkillId } from '../learning/skills';
import { useGame } from '../store/game';

export interface AnswerEvent {
  questionId: string;
  skills: SkillId[];
  correctFirstTry: boolean;
  attempts: number;
  hints: number;
  options: number;
  timeMs: number;
  confidence?: Confidence;
  representation: string;
  difficulty: 1 | 2 | 3;
  error?: ErrorType;
}

export interface StepProps<S extends Step = Step> {
  step: S;
  lab: Lab;
  onDone: (stars?: number) => void;
}

/** Shared per-step UI context provided by the LabPlayer. */
export interface PlayerCtx {
  exam: boolean;
  hintLevel: number; // 0..3 (MUÉSTRAME presses)
  solution: boolean; // VER SOLUCIÓN COMPLETA
  setHints: (h: Hint[]) => void;
  setContext: (text: string) => void;
  resetHints: () => void;
  stepSkills: (skills: SkillId[]) => void;
  onBossResult: (r: BossResult) => void;
}

export interface BossResult {
  name: string;
  score: number;
  max: number;
  errors: ErrorType[];
  procedure: string[];
}

export const PlayerContext = createContext<PlayerCtx>({
  exam: false,
  hintLevel: 0,
  solution: false,
  setHints: () => {},
  setContext: () => {},
  resetHints: () => {},
  stepSkills: () => {},
  onBossResult: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export function toEvidence(e: AnswerEvent): Evidence[] {
  return e.skills.map((skill, k) => ({
    skill,
    correctFirstTry: e.correctFirstTry,
    attempts: e.attempts,
    hints: e.hints,
    options: e.options,
    timeMs: e.timeMs,
    confidence: e.confidence,
    representation: e.representation,
    difficulty: e.difficulty,
    weight: k === 0 ? 1 : 0.6,
  }));
}

export function report(e: AnswerEvent) {
  useGame.getState().record(toEvidence(e), { questionId: e.questionId, error: e.error });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
