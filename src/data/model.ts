// Shared content model: questions, hints, exercises, labs, steps.
import type { TimeState } from '../engine/types';
import type { ErrorType } from '../learning/errors';
import type { SkillId } from '../learning/skills';

export type IconName = 'short' | 'open' | 'resistor' | 'keep' | 'capacitor' | 'inductor';

export type OptionVisual =
  | { kind: 'icon'; icon: IconName }
  /** mini graph: value for t<0, start value at 0+, final value, tau factor */
  | { kind: 'curve'; before: number; start: number; end: number; tau?: number; max?: number }
  | { kind: 'formula'; tex: string };

export interface OptionDef {
  id: string;
  label: string;
  visual?: OptionVisual;
  correct?: boolean;
  error?: ErrorType;
}

export interface Hint {
  text: string;
  highlight?: string[];
  time?: TimeState;
}

export interface QuestionVisual {
  circuit: string;
  time?: TimeState;
  highlight?: string[];
  /** Animate time from 0+ forward in a loop */
  play?: boolean;
  hideFlow?: boolean;
  hideValues?: boolean;
}

export interface QuestionDef {
  id: string;
  prompt: string;
  skills: SkillId[];
  representation: string;
  difficulty: 1 | 2 | 3;
  options: OptionDef[];
  visual?: QuestionVisual;
  hints?: Hint[];
  /** One-line discovery shown after the correct answer */
  success?: string;
  /** Ask "¿qué tan seguro estás?" first */
  confidence?: boolean;
}

export type Guidance = 'guided' | 'partial' | 'free' | 'transfer';

export type Step =
  | {
      type: 'explore';
      id: string;
      circuit: string;
      title: string;
      prompt: string;
      goal: 'flip' | 'flipAndWait';
      /** Context lines indexed by elapsed tau */
      narration?: { until: number; text: string }[];
      skills: SkillId[];
      hints?: Hint[];
      energyFlow?: boolean;
    }
  | { type: 'question'; id: string; q: QuestionDef; guidance: Guidance }
  | { type: 'reveal'; id: string; title: string; cards: RevealCard[]; check?: QuestionDef }
  | { type: 'slot'; id: string; skills: SkillId[] }
  | { type: 'classify'; id: string }
  | { type: 'survive'; id: string }
  | { type: 'timeMachine'; id: string; circuit: string; guidance: Guidance }
  | { type: 'tauLab'; id: string }
  | { type: 'reqHunt'; id: string; circuit: string; guidance: Guidance }
  | { type: 'curveBuilder'; id: string; circuit: string }
  | { type: 'formula'; id: string; circuit: string }
  | { type: 'guided'; id: string; circuit: string; guidance: Guidance; target?: { comp: string; kind: 'v' | 'i'; name: string; sign: number } }
  | { type: 'boss'; id: string; circuit: string; name: string };

export interface RevealCard {
  title: string;
  formula?: string;
  meaning: string;
  tone?: 'c' | 'l' | 'n';
}

export interface Lab {
  id: string;
  num: number;
  title: string;
  subtitle: string;
  icon: string;
  /** What should the student discover here? */
  discover: string;
  steps: Step[];
  exam?: boolean;
  map: { x: number; y: number };
  color: string;
}
