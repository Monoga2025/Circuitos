import { describe, expect, it } from 'vitest';
import { firstOrder, quantityAt, xAt } from '../analysis';
import { getCircuit, withSlot } from '../../data/circuits';

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 3);

describe('first-order engine', () => {
  it('solves the class exercise exactly like the professor', () => {
    const c = getCircuit('clase');
    const fo = firstOrder(c);
    near(fo.x0plus, 20);
    near(fo.xinf, 10);
    near(fo.Req, 10 / 3);
    near(fo.tau, 2 / 3);
    near(xAt(fo, 1), 10 * (1 + Math.exp(-1.5)));
    // i in the 5 ohm resistor = -v/5 = -2(1+e^{-1.5t})
    near(quantityAt(c, { comp: 'R5', kind: 'i' }, { kind: 'after', t: 1 }, fo), -2 * (1 + Math.exp(-1.5)));
    near(quantityAt(c, { comp: 'R5', kind: 'i' }, { kind: 'before' }, fo), 0);
  });
  it('time machine circuits', () => {
    const d = firstOrder(getCircuit('tm-rc-discharge'));
    near(d.x0plus, 9); near(d.xinf, 0); near(d.Req, 6); near(d.tau, 1.5);
    const ch = firstOrder(getCircuit('tm-rc-charge'));
    near(ch.x0plus, 0); near(ch.xinf, 10); near(ch.Req, 5); near(ch.tau, 0.5);
  });
  it('RL circuits', () => {
    const d = firstOrder(getCircuit('tm-rl-discharge'));
    near(d.x0plus, 6); near(d.xinf, 0); near(d.Req, 6); near(d.tau, 0.5);
    const s = firstOrder(getCircuit('rl-step'));
    near(s.x0plus, 0); near(s.xinf, 2); near(s.Req, 4); near(s.tau, 0.5);
    const b = firstOrder(getCircuit('boss-rl'));
    near(b.x0plus, 2); near(b.xinf, 1.5); near(b.Req, 8); near(b.tau, 0.5);
  });
  it('bosses and Req hunts', () => {
    const b = firstOrder(getCircuit('boss-rc'));
    near(b.x0plus, 18); near(b.xinf, 12); near(b.Req, 2); near(b.tau, 1);
    near(firstOrder(getCircuit('req-1')).Req, 3);
    near(firstOrder(getCircuit('req-2')).Req, 5.6);
    near(firstOrder(getCircuit('req-dep')).Req, 2.5);
    const e = firstOrder(getCircuit('exam-rc'));
    near(e.x0plus, 8); near(e.xinf, 0); near(e.tau, 1);
  });
  it('lab 1 stages', () => {
    const ch = firstOrder(getCircuit('c-charge'));
    near(ch.x0plus, 0); near(ch.xinf, 10); near(ch.tau, 1);
    const h = firstOrder(getCircuit('c-hold'));
    near(h.x0plus, 10); expect(h.tau).toBe(Infinity);
    const dc = firstOrder(getCircuit('c-discharge'));
    near(dc.x0plus, 10); near(dc.xinf, 0); near(dc.tau, 1);
    const l = firstOrder(getCircuit('l-charge'));
    near(l.x0plus, 0); near(l.xinf, 5); near(l.tau, 1);
    const sc = firstOrder(withSlot(getCircuit('slot'), 'C'));
    near(sc.xinf, 10);
    const sl = firstOrder(withSlot(getCircuit('slot'), 'L'));
    near(sl.xinf, 5);
  });
});
