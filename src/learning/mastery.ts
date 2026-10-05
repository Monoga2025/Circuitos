// Local, heuristic Bayesian Knowledge Tracing.
//
//   P(L | correct) = P(L)(1-s) / [P(L)(1-s) + (1-P(L)) g]
//   P(L | wrong)   = P(L) s     / [P(L) s     + (1-P(L)) (1-g)]
//   P(L)'          = P(L|obs) + (1 - P(L|obs)) * T * quality
//
// g (guess) grows with fewer options, "estoy adivinando", hints and suspiciously fast answers.
// s (slip) shrinks when the student was "seguro" and still failed (misconception evidence).
// Only the FIRST attempt is real evidence. A correct answer after errors counts as a
// wrong observation followed by a small learning credit.
import type { SkillId } from './skills';
import { PRIOR_KNOWN, SKILL_IDS } from './skills';

export type Confidence = 'guess' | 'medium' | 'sure';

export interface SkillState {
  p: number; // P(learned)
  attempts: number;
  firstTryCorrect: number;
  streak: number; // consecutive first-try correct
  reps: string[]; // representations answered correctly on first try
  suspectLuck: boolean;
  lastCorrectRep?: string;
  lastCorrectAt?: number;
  lastSeen?: number;
}

export interface Evidence {
  skill: SkillId;
  correctFirstTry: boolean;
  attempts: number; // number of tries until correct (1 = first try)
  hints: number; // MUÉSTRAME presses (3+ = full solution)
  options: number; // number of options shown (2..6), 0 = non multiple-choice
  timeMs: number;
  confidence?: Confidence;
  representation: string;
  difficulty: 1 | 2 | 3;
  /** weight in [0,1]: how central the skill is to this question */
  weight?: number;
}

const T_LEARN = 0.12;
const SLIP = 0.1;

export function initialSkill(id: SkillId): SkillState {
  return {
    p: PRIOR_KNOWN.includes(id) ? 0.45 : 0.1,
    attempts: 0,
    firstTryCorrect: 0,
    streak: 0,
    reps: [],
    suspectLuck: false,
  };
}

export function initialSkills(): Record<SkillId, SkillState> {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, initialSkill(id)])) as Record<SkillId, SkillState>;
}

export function update(s: SkillState, e: Evidence, now = Date.now()): SkillState {
  const w = e.weight ?? 1;
  let g = e.options > 0 ? 1 / e.options : 0.08;
  let slip = SLIP;
  if (e.confidence === 'guess') g = Math.max(g, 0.6);
  if (e.confidence === 'medium') g = Math.min(0.7, g + 0.1);
  if (e.hints > 0) g = Math.min(0.9, g + (1 - g) * 0.3 * e.hints);
  if (e.timeMs > 0 && e.timeMs < 2000 && e.difficulty >= 2) g = Math.min(0.8, g + 0.15); // too fast to have thought
  if (e.confidence === 'sure' && !e.correctFirstTry) slip = 0.04;

  const P = s.p;
  let post: number;
  if (e.correctFirstTry) post = (P * (1 - slip)) / (P * (1 - slip) + (1 - P) * g);
  else post = (P * slip) / (P * slip + (1 - P) * (1 - g));

  // learning transition, weighted by the quality of the episode
  let quality = 1 / (1 + e.hints);
  if (!e.correctFirstTry) quality *= 0.35; // got there eventually: learned a little
  if (e.confidence === 'guess') quality *= 0.5;
  quality *= e.difficulty === 3 ? 1.2 : e.difficulty === 1 ? 0.8 : 1;
  post = post + (1 - post) * T_LEARN * quality;

  // blend by weight so secondary skills move less
  let p = P + (post - P) * w;

  const reps = e.correctFirstTry && !s.reps.includes(e.representation) ? [...s.reps, e.representation] : s.reps;
  let suspectLuck = s.suspectLuck;
  // Luck detection: correct in one representation, then immediately wrong in another one.
  if (
    !e.correctFirstTry &&
    s.lastCorrectRep &&
    s.lastCorrectRep !== e.representation &&
    s.lastCorrectAt &&
    now - s.lastCorrectAt < 6 * 60_000
  ) {
    suspectLuck = true;
    p = Math.min(p, 0.4);
  }
  // Luck suspicion is cleared by a clean streak across representations
  const streak = e.correctFirstTry && e.hints === 0 ? s.streak + 1 : 0;
  if (suspectLuck && streak >= 2 && reps.length >= 2) suspectLuck = false;

  return {
    p: Math.max(0.01, Math.min(0.99, p)),
    attempts: s.attempts + 1,
    firstTryCorrect: s.firstTryCorrect + (e.correctFirstTry ? 1 : 0),
    streak,
    reps,
    suspectLuck,
    lastCorrectRep: e.correctFirstTry ? e.representation : s.lastCorrectRep,
    lastCorrectAt: e.correctFirstTry ? now : s.lastCorrectAt,
    lastSeen: now,
  };
}

/** Never mastered from a single success: needs >=3 clean answers in >=2 representations. */
export function isMastered(s: SkillState): boolean {
  return s.p >= 0.85 && s.firstTryCorrect >= 3 && s.reps.length >= 2 && !s.suspectLuck;
}

/** Value displayed in bars: capped at 80% until true mastery criteria are met. */
export function displayMastery(s: SkillState): number {
  return isMastered(s) ? s.p : Math.min(s.p, 0.8);
}
