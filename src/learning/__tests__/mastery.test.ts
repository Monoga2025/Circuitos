import { describe, expect, it } from 'vitest';
import { displayMastery, initialSkill, isMastered, update, type Evidence } from '../mastery';

const ev = (o: Partial<Evidence>): Evidence => ({
  skill: 'capacitorDc', correctFirstTry: true, attempts: 1, hints: 0, options: 3, timeMs: 6000,
  representation: 'icon', difficulty: 2, ...o,
});

describe('mastery model', () => {
  it('one correct answer is never mastery', () => {
    const s = update(initialSkill('capacitorDc'), ev({}));
    expect(isMastered(s)).toBe(false);
    expect(displayMastery(s)).toBeLessThanOrEqual(0.8);
  });
  it('several clean answers in different representations reach mastery', () => {
    let s = initialSkill('capacitorDc');
    for (const r of ['icon', 'graph', 'circuit-flow', 'numeric', 'icon']) s = update(s, ev({ representation: r }));
    expect(isMastered(s)).toBe(true);
  });
  it('correct after errors moves less than first-try correct', () => {
    const a = update(initialSkill('capacitorDc'), ev({}));
    const b = update(initialSkill('capacitorDc'), ev({ correctFirstTry: false, attempts: 3 }));
    expect(a.p).toBeGreaterThan(b.p);
  });
  it('"estoy adivinando" + correct is weak evidence', () => {
    const sure = update(initialSkill('capacitorDc'), ev({ confidence: 'sure' }));
    const guess = update(initialSkill('capacitorDc'), ev({ confidence: 'guess' }));
    expect(sure.p).toBeGreaterThan(guess.p);
  });
  it('hints reduce credit', () => {
    const clean = update(initialSkill('capacitorDc'), ev({}));
    const hinted = update(initialSkill('capacitorDc'), ev({ hints: 3 }));
    expect(clean.p).toBeGreaterThan(hinted.p);
  });
  it('detects possible luck: right in one representation, wrong right after in another', () => {
    let s = initialSkill('capacitorDc');
    s = update(s, ev({ representation: 'icon' }));
    s = update(s, ev({ representation: 'icon' }));
    s = update(s, ev({ representation: 'graph', correctFirstTry: false, attempts: 2 }));
    expect(s.suspectLuck).toBe(true);
    expect(s.p).toBeLessThanOrEqual(0.4);
    expect(isMastered(s)).toBe(false);
  });
});
