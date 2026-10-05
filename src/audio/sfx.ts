// Soft synthesized feedback sounds (no assets). Respects the global mute flag.
import { useGame } from '../store/game';

let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = 'sine', delay = 0, vol = 0.06) {
  if (useGame.getState().muted) return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* audio not available */
  }
}

export const sfx = {
  correct: () => {
    tone(660, 0.12, 'triangle');
    tone(990, 0.18, 'triangle', 0.08);
  },
  wrong: () => tone(196, 0.22, 'sine', 0, 0.05),
  click: () => tone(1200, 0.04, 'square', 0, 0.02),
  flip: () => {
    tone(320, 0.05, 'square', 0, 0.03);
    tone(480, 0.06, 'square', 0.04, 0.025);
  },
  energy: () => tone(220, 0.5, 'sawtooth', 0, 0.015),
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', i * 0.1, 0.05)),
};
