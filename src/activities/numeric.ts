// Generates numeric multiple-choice questions for any first-order circuit,
// with distractors that encode SPECIFIC misconceptions (error types).
import { fmt, quantityAt, theveninResistance } from '../engine/analysis';
import { solve } from '../engine/mna';
import type { CircuitDefinition, FirstOrderResult } from '../engine/types';
import type { OptionDef, QuestionDef } from '../data/model';
import type { ErrorType } from '../learning/errors';

type Cand = [number, ErrorType];

export function numOptions(correct: number, cands: Cand[], unit: string, digits = 3): OptionDef[] {
  const out: OptionDef[] = [{ id: 'ok', label: `${fmt(correct, digits)} ${unit}`, correct: true }];
  const seen = [correct];
  const push = (v: number, e: ErrorType) => {
    if (!isFinite(v)) return;
    if (seen.some((s) => Math.abs(s - v) < 1e-3 * Math.max(1, Math.abs(v)))) return;
    seen.push(v);
    out.push({ id: `d${out.length}`, label: `${fmt(v, digits)} ${unit}`, error: e });
  };
  for (const [v, e] of cands) if (out.length < 4) push(v, e);
  // pad with generic slips so there are always >= 3 options
  const pads: Cand[] = [
    [correct * 2, 'ERROR_BASICO'],
    [correct / 2, 'ERROR_BASICO'],
    [-correct, 'ERROR_SIGNO'],
    [correct + 5, 'ERROR_BASICO'],
  ];
  for (const [v, e] of pads) if (out.length < 3) push(v, e);
  return out;
}

const sumR = (c: CircuitDefinition) => c.components.filter((k) => k.kind === 'R').reduce((a, k) => a + k.value, 0);
const parR = (c: CircuitDefinition) => 1 / c.components.filter((k) => k.kind === 'R').reduce((a, k) => a + 1 / k.value, 0);
const maxSource = (c: CircuitDefinition) => Math.max(0, ...c.components.filter((k) => k.kind === 'V' || k.kind === 'I').map((k) => k.value));

export type PhaseKey = 'x0m' | 'x0p' | 'xinf' | 'req' | 'tau' | 'formula';

export function phaseQuestion(c: CircuitDefinition, fo: FirstOrderResult, key: PhaseKey): QuestionDef {
  const isC = fo.type === 'RC';
  const x = isC ? 'vC' : 'iL';
  const u = fo.unit;
  const s = c.components.find((k) => k.id === c.storage)!;
  const dcSkill = isC ? 'capacitorDc' : 'inductorDc';
  const contSkill = isC ? 'capacitorContinuity' : 'inductorContinuity';
  const confusion: ErrorType = isC ? 'CONFUSION_DC_CAPACITOR' : 'CONFUSION_DC_INDUCTOR';
  const base = { representation: 'numeric', difficulty: 2 as const };
  switch (key) {
    case 'x0m': {
      // wrong DC model of the element in the OLD circuit
      const wrong = solve(c, { phase: 'before', storage: { mode: isC ? 'short' : 'open' } });
      const wv = isC ? wrong.compV[s.id] : wrong.compI[s.id];
      return {
        ...base,
        id: `${c.id}-x0m`,
        prompt: `t = 0⁻ (circuito viejo, mucho tiempo): ¿${x}(0⁻)?`,
        skills: ['initialCondition', dcSkill],
        options: numOptions(fo.x0minus, [[wv, confusion], [fo.xinf, 'ERROR_CONDICION_INICIAL'], [maxSource(c), 'ERROR_BASICO']], u),
        success: `${isC ? 'C abierto' : 'L = cable'} en el circuito viejo → ${x}(0⁻) = ${fmt(fo.x0minus)} ${u}`,
      };
    }
    case 'x0p':
      return {
        ...base,
        id: `${c.id}-x0p`,
        prompt: `El switch cambió. Justo después: ¿${x}(0⁺)?`,
        skills: [contSkill, 'initialCondition'],
        options: numOptions(fo.x0plus, [[fo.x0plus === 0 ? fo.xinf : 0, 'ERROR_CONTINUIDAD'], [fo.xinf, 'ERROR_CONTINUIDAD'], [-fo.x0plus, 'ERROR_SIGNO']], u),
        success: `${x} no puede saltar: ${x}(0⁺) = ${x}(0⁻) = ${fmt(fo.x0plus)} ${u}`,
      };
    case 'xinf': {
      const wrong = solve(c, { phase: 'after', storage: { mode: isC ? 'short' : 'open' } });
      const wv = isC ? wrong.compV[s.id] : wrong.compI[s.id];
      return {
        ...base,
        id: `${c.id}-xinf`,
        prompt: `Circuito nuevo, mucho tiempo después: ¿${x}(∞)?`,
        skills: ['finalCondition', dcSkill],
        options: numOptions(fo.xinf, [[fo.x0plus, 'ERROR_CONDICION_FINAL'], [wv, confusion], [maxSource(c), 'ERROR_BASICO']], u),
        success: `${isC ? 'C abierto' : 'L = cable'} en el circuito NUEVO → ${x}(∞) = ${fmt(fo.xinf)} ${u}`,
      };
    }
    case 'req': {
      const before = theveninResistance(c, s.a, s.b, 'before');
      return {
        ...base,
        difficulty: 3,
        id: `${c.id}-req`,
        prompt: `Fuentes apagadas, ${isC ? 'C' : 'L'} retirado. ¿Req vista desde sus terminales?`,
        skills: ['theveninResistance', 'sourceDeactivation', 'seriesParallel'],
        options: numOptions(fo.Req, [[sumR(c), 'ERROR_REQ'], [before, 'ERROR_REQ'], [parR(c), 'ERROR_REQ']], 'Ω'),
        success: `Req = ${fmt(fo.Req)} Ω`,
      };
    }
    case 'tau': {
      const L = s.value;
      const cands: Cand[] = isC
        ? [[fo.Req / L, 'ERROR_TAU'], [L / fo.Req, 'ERROR_TAU'], [1 / fo.tau, 'ERROR_TAU']]
        : [[L * fo.Req, 'ERROR_TAU'], [fo.Req / L, 'ERROR_TAU'], [1 / fo.tau, 'ERROR_TAU']];
      return {
        ...base,
        id: `${c.id}-tau`,
        prompt: isC ? `τ = Req·C = ${fmt(fo.Req)} · ${fmt(L)} = ?` : `τ = L / Req = ${fmt(L)} / ${fmt(fo.Req)} = ?`,
        skills: [isC ? 'timeConstantRC' : 'timeConstantRL'],
        options: numOptions(fo.tau, cands, 's'),
        success: `τ = ${fmt(fo.tau)} s  →  1/τ = ${fmt(1 / fo.tau)} s⁻¹`,
      };
    }
    case 'formula': {
      const ok = responseString(fo.xinf, fo.x0plus, fo.tau, x, u);
      return {
        ...base,
        difficulty: 3,
        id: `${c.id}-formula`,
        prompt: `Arma la respuesta: ${x}(t) para t > 0`,
        skills: ['generalizedResponse', fo.xinf === 0 ? 'naturalResponse' : 'stepResponse'],
        options: dedupeLabels([
          { id: 'ok', label: ok, correct: true },
          { id: 'sw', label: responseString(fo.x0plus, fo.xinf, fo.tau, x, u), error: 'ERROR_FORMULA_EXPONENCIAL' },
          { id: 'tau', label: responseString(fo.xinf, fo.x0plus, 1 / fo.tau, x, u), error: 'ERROR_TAU' },
          { id: 'pos', label: responseString(fo.xinf, fo.x0plus, -fo.tau, x, u), error: 'ERROR_FORMULA_EXPONENCIAL' },
        ]),
        success: `Final + (inicio − final)·e^(−t/τ)`,
      };
    }
  }
}

function dedupeLabels(opts: OptionDef[]): OptionDef[] {
  const seen = new Set<string>();
  return opts.filter((o) => (seen.has(o.label) ? false : (seen.add(o.label), true)));
}

/** "10 + 10e^(−1,5t) V", "9e^(−0,667t) V" … exponent written as −t/τ → −(1/τ)t */
export function responseString(xinf: number, x0: number, tau: number, name: string, unit: string): string {
  const A = x0 - xinf;
  const a = 1 / tau;
  const k = Math.abs(a);
  const expo = `e^(${a < 0 ? '+' : '−'}${Math.abs(k - 1) < 1e-9 ? '' : fmt(k)}t)`;
  const head = `${name}(t) = `;
  if (Math.abs(A) < 1e-9) return `${head}${fmt(xinf)} ${unit}`;
  if (Math.abs(xinf) < 1e-9) return `${head}${fmt(A)}${expo} ${unit}`;
  // professor's factored form: 10(1 + e^(−1,5t))
  const ratio = A / xinf;
  if (Math.abs(ratio - 1) < 1e-6) return `${head}${fmt(xinf)}(1 + ${expo}) ${unit}`;
  if (Math.abs(ratio + 1) < 1e-6) return `${head}${fmt(xinf)}(1 − ${expo}) ${unit}`;
  const sign = A < 0 ? '−' : '+';
  return `${head}${fmt(xinf)} ${sign} ${fmt(Math.abs(A))}${expo} ${unit}`;
}

/** Question about any other circuit quantity, e.g. i(t) in the 5 Ω resistor. */
export function targetQuestion(
  c: CircuitDefinition,
  fo: FirstOrderResult,
  t: { comp: string; kind: 'v' | 'i'; name: string },
): QuestionDef {
  const q0p = quantityAt(c, t, { kind: 'after', t: 0 }, fo);
  const q0m = quantityAt(c, t, { kind: 'before' }, fo);
  const qinf = quantityAt(c, t, { kind: 'inf' }, fo);
  const unit = t.kind === 'v' ? 'V' : 'A';
  const nm = t.kind === 'v' ? 'v' : 'i';
  const ok = responseString(qinf, q0p, fo.tau, nm, unit);
  const opts: OptionDef[] = [
    { id: 'ok', label: ok, correct: true },
    { id: 'sg', label: responseString(-qinf, -q0p, fo.tau, nm, unit), error: 'ERROR_SIGNO' },
    { id: 'cont', label: responseString(qinf, q0m, fo.tau, nm, unit), error: 'ERROR_CONTINUIDAD' },
    { id: 'tau', label: responseString(qinf, q0p, 1 / fo.tau, nm, unit), error: 'ERROR_TAU' },
  ];
  return {
    id: `${c.id}-target-${t.comp}`,
    prompt: `Último paso: ${t.name}. Usa Ohm/LCK con v(t). ¡Ojo con el sentido de la flecha!`,
    skills: ['signConvention', 'generalizedResponse'],
    representation: 'formula',
    difficulty: 3,
    options: dedupeLabels(opts),
    success: `${ok}   (en t=0⁻ valía ${fmt(q0m)} ${unit}: ¡solo vC/iL son continuos!)`,
  };
}
