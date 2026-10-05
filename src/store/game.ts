import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ErrorType } from '../learning/errors';
import { ERRORS } from '../learning/errors';
import type { Evidence, SkillState } from '../learning/mastery';
import { initialSkills, update } from '../learning/mastery';
import type { SkillId } from '../learning/skills';
import type { ReviewItem } from '../learning/spaced';
import { makeReview } from '../learning/spaced';

export interface LabProgress {
  step: number;
  completed: boolean;
  stars?: number;
}

export interface ExamResult {
  at: number;
  score: number;
  max: number;
  seconds: number;
  errors: Partial<Record<ErrorType, number>>;
}

export type Screen =
  | { name: 'home' }
  | { name: 'map' }
  | { name: 'lab'; labId: string }
  | { name: 'mastery' };

interface GameState {
  skills: Record<SkillId, SkillState>;
  labs: Record<string, LabProgress>;
  reviews: ReviewItem[];
  errorCounts: Partial<Record<ErrorType, number>>;
  exams: ExamResult[];
  muted: boolean;
  freeMode: boolean;
  lastLab?: string;
  avatar: { x: number; y: number };
  questionsAnswered: number;
  screen: Screen;

  go: (s: Screen) => void;
  record: (ev: Evidence[], meta: { questionId: string; error?: ErrorType }) => void;
  logError: (e: ErrorType) => void;
  setStep: (labId: string, step: number) => void;
  completeLab: (labId: string, stars?: number) => void;
  takeDueReview: () => ReviewItem | undefined;
  dropReview: (id: string) => void;
  addExam: (r: ExamResult) => void;
  toggleMute: () => void;
  toggleFree: () => void;
  setAvatar: (p: { x: number; y: number }) => void;
  reset: () => void;
}

const fresh = () => ({
  skills: initialSkills(),
  labs: {} as Record<string, LabProgress>,
  reviews: [] as ReviewItem[],
  errorCounts: {},
  exams: [] as ExamResult[],
  muted: false,
  freeMode: false,
  lastLab: undefined,
  avatar: { x: 4, y: 8 },
  questionsAnswered: 0,
  screen: { name: 'home' } as Screen,
});

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      go: (screen) => set({ screen, ...(screen.name === 'lab' ? { lastLab: screen.labId } : {}) }),
      record: (evs, meta) =>
        set((st) => {
          const skills = { ...st.skills };
          const reviews = st.reviews.slice();
          for (const e of evs) {
            skills[e.skill] = update(skills[e.skill], e);
            if ((!e.correctFirstTry || e.confidence === 'guess') && (e.weight ?? 1) >= 0.99) {
              const r = makeReview(e.skill, e.representation, meta.questionId);
              if (r && !reviews.some((x) => x.skill === e.skill)) reviews.push(r);
            }
          }
          const errorCounts = { ...st.errorCounts };
          if (meta.error) errorCounts[meta.error] = (errorCounts[meta.error] ?? 0) + 1;
          return { skills, reviews, errorCounts, questionsAnswered: st.questionsAnswered + 1 };
        }),
      logError: (e) =>
        set((st) => {
          const skill = ERRORS[e].skill;
          const errorCounts = { ...st.errorCounts, [e]: (st.errorCounts[e] ?? 0) + 1 };
          const reviews = st.reviews.slice();
          const r = makeReview(skill, 'tool', '');
          if (r && !reviews.some((x) => x.skill === skill)) reviews.push(r);
          return { errorCounts, reviews };
        }),
      setStep: (labId, step) =>
        set((st) => ({ labs: { ...st.labs, [labId]: { ...(st.labs[labId] ?? { completed: false }), step } } })),
      completeLab: (labId, stars) =>
        set((st) => ({
          labs: {
            ...st.labs,
            [labId]: { step: 0, completed: true, stars: Math.max(stars ?? 0, st.labs[labId]?.stars ?? 0) },
          },
        })),
      takeDueReview: () => {
        const now = Date.now();
        const due = get().reviews.find((r) => r.dueAt <= now);
        return due;
      },
      dropReview: (id) => set((st) => ({ reviews: st.reviews.filter((r) => r.id !== id) })),
      addExam: (r) => set((st) => ({ exams: [...st.exams, r] })),
      toggleMute: () => set((st) => ({ muted: !st.muted })),
      toggleFree: () => set((st) => ({ freeMode: !st.freeMode })),
      setAvatar: (avatar) => set({ avatar }),
      reset: () => set(fresh()),
    }),
    {
      name: 'circuit-quest-v1',
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { screen, ...rest } = s;
        return rest;
      },
    },
  ),
);
