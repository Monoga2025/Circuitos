// In-session spaced repetition: a failed idea comes back 2–5 minutes later
// in a DIFFERENT representation (never the same question three times in a row).
import { QUESTIONS } from '../data/questions';
import type { QuestionDef } from '../data/model';
import type { SkillId } from './skills';

export interface ReviewItem {
  id: string;
  skill: SkillId;
  questionId: string;
  dueAt: number;
}

export function pickReviewQuestion(skill: SkillId, avoidRep: string, avoidId: string): QuestionDef | undefined {
  const pool = QUESTIONS.filter((q) => q.skills[0] === skill || q.skills.includes(skill));
  const different = pool.filter((q) => q.representation !== avoidRep && q.id !== avoidId);
  const list = different.length ? different : pool.filter((q) => q.id !== avoidId);
  if (!list.length) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

export function makeReview(skill: SkillId, avoidRep: string, avoidId: string, now = Date.now()): ReviewItem | undefined {
  const q = pickReviewQuestion(skill, avoidRep, avoidId);
  if (!q) return undefined;
  const delay = (2 + Math.random() * 3) * 60_000;
  return { id: `${q.id}-${now}`, skill, questionId: q.id, dueAt: now + delay };
}
