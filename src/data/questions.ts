// Question bank. Each skill has several REPRESENTATIONS (concept icon, circuit,
// graph, numeric) so spaced reviews can ask the same idea in a different form.
import type { QuestionDef } from './model';

const AFTER = (t: number) => ({ kind: 'after' as const, t });
const INF = { kind: 'inf' as const };
const BEFORE = { kind: 'before' as const };

export const QUESTIONS: QuestionDef[] = [
  // ───────── warm-up (Lab 0) ─────────
  {
    id: 'w-ohm', prompt: '¿Cuánta corriente sale de la fuente?', skills: ['ohmsLaw'], representation: 'circuit', difficulty: 1,
    visual: { circuit: 'w-ohm', hideFlow: true, hideValues: true },
    options: [
      { id: 'a', label: '3 A', correct: true },
      { id: 'b', label: '48 A', error: 'ERROR_BASICO' },
      { id: 'c', label: '0,33 A', error: 'ERROR_BASICO' },
    ],
    success: 'i = V/R = 12/4 = 3 A',
  },
  {
    id: 'w-par', prompt: 'Resistencia entre a y b', skills: ['seriesParallel'], representation: 'circuit', difficulty: 1,
    visual: { circuit: 'w-par', hideFlow: true },
    options: [
      { id: 'a', label: '9 Ω', error: 'ERROR_BASICO' },
      { id: 'b', label: '2 Ω', correct: true },
      { id: 'c', label: '4,5 Ω', error: 'ERROR_BASICO' },
    ],
    success: '6·3/(6+3) = 2 Ω. En paralelo siempre baja.',
  },
  {
    id: 'w-kcl', prompt: '¿Cuánta corriente baja por R?', skills: ['nodes'], representation: 'circuit', difficulty: 1,
    visual: { circuit: 'w-kcl', hideFlow: true, hideValues: true },
    options: [
      { id: 'a', label: '7 A', error: 'ERROR_BASICO' },
      { id: 'b', label: '3 A', correct: true },
      { id: 'c', label: '5 A', error: 'ERROR_BASICO' },
    ],
    success: 'Entra 5, salen 2 → quedan 3 A.',
  },
  {
    id: 'w-voff', prompt: 'En superposición, “apagar” esta fuente de VOLTAJE es reemplazarla por…', skills: ['superposition', 'sourceDeactivation'],
    representation: 'icon', difficulty: 1, visual: { circuit: 'w-vsrc', highlight: ['V'], hideFlow: true },
    options: [
      { id: 'a', label: 'Un cable', visual: { kind: 'icon', icon: 'short' }, correct: true },
      { id: 'b', label: 'Un hueco (abierto)', visual: { kind: 'icon', icon: 'open' }, error: 'ERROR_APAGAR_FUENTES' },
      { id: 'c', label: 'Una resistencia', visual: { kind: 'icon', icon: 'resistor' }, error: 'ERROR_APAGAR_FUENTES' },
    ],
    success: 'V = 0 → no hay diferencia de potencial → cable.',
  },
  {
    id: 'w-ioff', prompt: '“Apagar” esta fuente de CORRIENTE es reemplazarla por…', skills: ['superposition', 'sourceDeactivation'],
    representation: 'icon', difficulty: 1, visual: { circuit: 'w-isrc', highlight: ['I'], hideFlow: true },
    options: [
      { id: 'a', label: 'Un cable', visual: { kind: 'icon', icon: 'short' }, error: 'ERROR_APAGAR_FUENTES' },
      { id: 'b', label: 'Un hueco (abierto)', visual: { kind: 'icon', icon: 'open' }, correct: true },
      { id: 'c', label: 'Una resistencia', visual: { kind: 'icon', icon: 'resistor' }, error: 'ERROR_APAGAR_FUENTES' },
    ],
    success: 'I = 0 → no pasa nada → circuito abierto.',
  },

  // ───────── capacitor DC ─────────
  {
    id: 'capdc-icon', prompt: 'Capacitor después de MUCHO tiempo en DC se comporta como…', skills: ['capacitorDc'], representation: 'icon', difficulty: 1,
    options: [
      { id: 'a', label: 'Cable', visual: { kind: 'icon', icon: 'short' }, error: 'CONFUSION_DC_CAPACITOR' },
      { id: 'b', label: 'Circuito abierto', visual: { kind: 'icon', icon: 'open' }, correct: true },
      { id: 'c', label: 'Resistencia', visual: { kind: 'icon', icon: 'resistor' }, error: 'CONFUSION_DC_CAPACITOR' },
    ],
    success: 'Lleno → ya no entra corriente → abierto.',
  },
  {
    id: 'capdc-branch', prompt: 'Así está AHORA. Después de mucho tiempo, ¿circulará corriente por esta rama?', skills: ['capacitorDc'],
    representation: 'circuit-flow', difficulty: 2, visual: { circuit: 'mini-c', time: AFTER(0.15), highlight: ['C'] },
    options: [
      { id: 'a', label: 'Sí, cada vez más', error: 'CONFUSION_DC_CAPACITOR' },
      { id: 'b', label: 'Sí, siempre igual', error: 'CONFUSION_DC_CAPACITOR' },
      { id: 'c', label: 'No: llega a cero', correct: true },
    ],
    success: 'La corriente se apaga sola: el capacitor se llenó.',
  },
  {
    id: 'capdc-graph', prompt: 'Conectas la batería. ¿Cuál es la CORRIENTE del capacitor?', skills: ['capacitorDc'], representation: 'graph', difficulty: 2,
    options: [
      { id: 'a', label: 'Sube y se queda', visual: { kind: 'curve', before: 0, start: 0, end: 5 }, error: 'CONFUSION_DC_CAPACITOR' },
      { id: 'b', label: 'Salta y cae a 0', visual: { kind: 'curve', before: 0, start: 5, end: 0 }, correct: true },
      { id: 'c', label: 'Constante', visual: { kind: 'curve', before: 0, start: 5, end: 5 }, error: 'CONFUSION_DC_CAPACITOR' },
    ],
    success: 'Mucha al inicio → disminuye → cero.',
  },
  {
    id: 'capdc-num', prompt: 'Mucho después (t → ∞), ¿cuánta corriente pasa por el capacitor?', skills: ['capacitorDc', 'finalCondition'],
    representation: 'numeric', difficulty: 2, visual: { circuit: 'tm-rc-charge', time: AFTER(0.05), highlight: ['C'] },
    options: [
      { id: 'a', label: '0 A', correct: true },
      { id: 'b', label: '1 A', error: 'CONFUSION_DC_CAPACITOR' },
      { id: 'c', label: '2 A', error: 'CONFUSION_DC_CAPACITOR' },
    ],
  },

  // ───────── inductor DC ─────────
  {
    id: 'inddc-icon', prompt: 'Inductor después de MUCHO tiempo en DC se comporta como…', skills: ['inductorDc'], representation: 'icon', difficulty: 1,
    options: [
      { id: 'a', label: 'Cable (corto)', visual: { kind: 'icon', icon: 'short' }, correct: true },
      { id: 'b', label: 'Circuito abierto', visual: { kind: 'icon', icon: 'open' }, error: 'CONFUSION_DC_INDUCTOR' },
      { id: 'c', label: 'Resistencia', visual: { kind: 'icon', icon: 'resistor' }, error: 'CONFUSION_DC_INDUCTOR' },
    ],
    success: 'Corriente constante → vL = L·di/dt = 0 → cable.',
  },
  {
    id: 'inddc-num', prompt: 'Mucho después, ¿qué voltaje tiene el inductor?', skills: ['inductorDc'], representation: 'numeric', difficulty: 2,
    visual: { circuit: 'l-charge', time: AFTER(0.1), highlight: ['L'] },
    options: [
      { id: 'a', label: '10 V', error: 'CONFUSION_DC_INDUCTOR' },
      { id: 'b', label: '5 V', error: 'CONFUSION_DC_INDUCTOR' },
      { id: 'c', label: '0 V', correct: true },
    ],
    success: 'Un cable no tiene voltaje.',
  },
  {
    id: 'inddc-flow', prompt: 'Mucho después, ¿pasa corriente por el inductor?', skills: ['inductorDc'], representation: 'circuit-flow', difficulty: 2,
    visual: { circuit: 'mini-l', time: AFTER(0.2), highlight: ['L'] },
    options: [
      { id: 'a', label: 'Sí: la máxima (V/R)', correct: true },
      { id: 'b', label: 'No: se bloquea', error: 'CONFUSION_DC_INDUCTOR' },
      { id: 'c', label: 'La mitad', error: 'CONFUSION_DC_INDUCTOR' },
    ],
  },
  {
    id: 'inddc-graph', prompt: 'Cierras el switch. ¿Cuál es el VOLTAJE del inductor?', skills: ['inductorDc'], representation: 'graph', difficulty: 2,
    options: [
      { id: 'a', label: 'Salta y cae a 0', visual: { kind: 'curve', before: 0, start: 10, end: 0 }, correct: true },
      { id: 'b', label: 'Sube y se queda', visual: { kind: 'curve', before: 0, start: 0, end: 10 }, error: 'CONFUSION_DC_INDUCTOR' },
      { id: 'c', label: 'Siempre 0', visual: { kind: 'curve', before: 0, start: 0, end: 0 }, error: 'CONFUSION_DC_INDUCTOR' },
    ],
  },

  // ───────── continuity ─────────
  {
    id: 'cont-c-concept', prompt: 'En un capacitor, ¿qué NO puede saltar de golpe?', skills: ['capacitorContinuity'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: 'El voltaje vC', correct: true },
      { id: 'b', label: 'La corriente iC', error: 'ERROR_CONTINUIDAD' },
      { id: 'c', label: 'Ninguno', error: 'ERROR_CONTINUIDAD' },
    ],
    success: 'vC(0⁻) = vC(0⁺).',
  },
  {
    id: 'cont-c-graph', prompt: '¿Cuál gráfica puede ser vC(t) cuando el switch cambia en t=0?', skills: ['capacitorContinuity'], representation: 'graph', difficulty: 2,
    options: [
      { id: 'a', label: 'Salta en t=0', visual: { kind: 'curve', before: 2, start: 9, end: 10 }, error: 'ERROR_CONTINUIDAD' },
      { id: 'b', label: 'Sin salto', visual: { kind: 'curve', before: 2, start: 2, end: 10 }, correct: true },
    ],
  },
  {
    id: 'cont-c-num', prompt: 'vC(0⁻) = 7 V. El switch cambia en t=0. ¿vC(0⁺)?', skills: ['capacitorContinuity', 'initialCondition'], representation: 'numeric', difficulty: 2,
    options: [
      { id: 'a', label: '0 V', error: 'ERROR_CONTINUIDAD' },
      { id: 'b', label: '7 V', correct: true },
      { id: 'c', label: 'Depende del circuito nuevo', error: 'ERROR_CONTINUIDAD' },
    ],
  },
  {
    id: 'cont-l-concept', prompt: 'En un inductor, ¿qué NO puede saltar de golpe?', skills: ['inductorContinuity'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: 'El voltaje vL', error: 'ERROR_CONTINUIDAD' },
      { id: 'b', label: 'La corriente iL', correct: true },
      { id: 'c', label: 'Ninguno', error: 'ERROR_CONTINUIDAD' },
    ],
    success: 'iL(0⁻) = iL(0⁺).',
  },
  {
    id: 'cont-l-num', prompt: 'iL(0⁻) = 3 A. Se abre un switch en t=0. ¿iL(0⁺)?', skills: ['inductorContinuity'], representation: 'numeric', difficulty: 2,
    options: [
      { id: 'a', label: '3 A', correct: true },
      { id: 'b', label: '0 A', error: 'ERROR_CONTINUIDAD' },
      { id: 'c', label: '−3 A', error: 'ERROR_SIGNO' },
    ],
  },
  {
    id: 'cont-l-graph', prompt: '¿Cuál gráfica puede ser iL(t)?', skills: ['inductorContinuity'], representation: 'graph', difficulty: 2,
    options: [
      { id: 'a', label: 'Sin salto', visual: { kind: 'curve', before: 6, start: 6, end: 0 }, correct: true },
      { id: 'b', label: 'Salta a 0', visual: { kind: 'curve', before: 6, start: 0, end: 0 }, error: 'ERROR_CONTINUIDAD' },
    ],
  },

  // ───────── initial / final conditions ─────────
  {
    id: 'ic-concept', prompt: 'Para hallar vC(0⁻) analizo…', skills: ['initialCondition'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: 'Circuito VIEJO (antes del switch) con C abierto', correct: true },
      { id: 'b', label: 'Circuito NUEVO con C abierto', error: 'ERROR_CONDICION_INICIAL' },
      { id: 'c', label: 'Circuito VIEJO con C en corto', error: 'CONFUSION_DC_CAPACITOR' },
    ],
  },
  {
    id: 'ic-num', prompt: 'Antes de t=0 (mucho tiempo así). ¿vC(0⁻)?', skills: ['initialCondition', 'capacitorDc'], representation: 'numeric', difficulty: 2,
    visual: { circuit: 'tm-rc-discharge', time: BEFORE, hideValues: true, hideFlow: true },
    options: [
      { id: 'a', label: '12 V', error: 'ERROR_CONDICION_INICIAL' },
      { id: 'b', label: '9 V', correct: true },
      { id: 'c', label: '0 V', error: 'CONFUSION_DC_CAPACITOR' },
    ],
    success: 'C abierto → divisor: 12·6/(2+6) = 9 V',
  },
  {
    id: 'fc-concept', prompt: 'Para hallar v(∞) analizo…', skills: ['finalCondition'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: 'Circuito VIEJO con C abierto', error: 'ERROR_CONDICION_FINAL' },
      { id: 'b', label: 'Circuito NUEVO con C abierto', correct: true },
      { id: 'c', label: 'Circuito NUEVO con C en corto', error: 'CONFUSION_DC_CAPACITOR' },
    ],
  },
  {
    id: 'fc-num', prompt: 'Después del switch, mucho tiempo. ¿v(∞)?', skills: ['finalCondition', 'capacitorDc'], representation: 'numeric', difficulty: 2,
    visual: { circuit: 'tm-rc-charge', time: AFTER(0), hideValues: true, hideFlow: true },
    options: [
      { id: 'a', label: '20 V', error: 'ERROR_BASICO' },
      { id: 'b', label: '0 V', error: 'ERROR_CONDICION_FINAL' },
      { id: 'c', label: '10 V', correct: true },
    ],
    success: 'C abierto → divisor 20·10/(10+10) = 10 V',
  },
  {
    id: 'nat-concept', prompt: 'Si después de t=0 NO queda ninguna fuente conectada al capacitor, v(∞) = …', skills: ['naturalResponse', 'finalCondition'],
    representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: '0: se descarga todo', correct: true },
      { id: 'b', label: 'v(0⁺): se queda igual', error: 'ERROR_CONDICION_FINAL' },
      { id: 'c', label: 'El voltaje de la fuente', error: 'ERROR_CONDICION_FINAL' },
    ],
    success: 'Respuesta natural: la energía se gasta en las R.',
  },

  // ───────── source deactivation / Req ─────────
  {
    id: 'dep-concept', prompt: 'Para hallar Req, ¿qué haces con una fuente DEPENDIENTE?', skills: ['sourceDeactivation'], representation: 'concept', difficulty: 2,
    options: [
      { id: 'a', label: 'La dejo encendida', correct: true },
      { id: 'b', label: 'La apago como las otras', error: 'ERROR_APAGAR_FUENTES' },
    ],
    success: 'Solo se apagan las independientes.',
  },
  {
    id: 'req-concept', prompt: '“Req vista por el capacitor” significa…', skills: ['theveninResistance'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: 'Sumar todas las resistencias', error: 'ERROR_REQ' },
      { id: 'b', label: 'Quitar C, apagar fuentes y medir desde sus terminales', correct: true },
      { id: 'c', label: 'La resistencia en serie con la fuente', error: 'ERROR_REQ' },
    ],
  },
  {
    id: 'req-num', prompt: 'Req vista por C (fuentes ya apagadas: V→cable)', skills: ['theveninResistance', 'seriesParallel'], representation: 'numeric', difficulty: 3,
    visual: { circuit: 'req-2', highlight: ['R1', 'R2', 'R3'], hideFlow: true, hideValues: true },
    options: [
      { id: 'a', label: '14 Ω', error: 'ERROR_REQ' },
      { id: 'b', label: '5,6 Ω', correct: true },
      { id: 'c', label: '1,6 Ω', error: 'ERROR_REQ' },
    ],
    success: '4 + (2 ∥ 8) = 4 + 1,6 = 5,6 Ω',
  },

  // ───────── tau ─────────
  {
    id: 'tau-double', prompt: 'Si duplicas R en un RC, la carga es…', skills: ['timeConstantRC'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: 'El doble de lenta', correct: true },
      { id: 'b', label: 'El doble de rápida', error: 'ERROR_TAU' },
      { id: 'c', label: 'Igual', error: 'ERROR_TAU' },
    ],
    success: 'τ = R·C → más R, más lento.',
  },
  {
    id: 'tau-num', prompt: 'Req = 4 Ω, C = 0,5 F. ¿τ?', skills: ['timeConstantRC'], representation: 'numeric', difficulty: 1,
    options: [
      { id: 'a', label: '8 s', error: 'ERROR_TAU' },
      { id: 'b', label: '2 s', correct: true },
      { id: 'c', label: '0,125 s', error: 'ERROR_TAU' },
    ],
  },
  {
    id: 'tau-graph', prompt: '¿Cuál curva tiene τ MÁS GRANDE?', skills: ['timeConstantRC'], representation: 'graph', difficulty: 1,
    options: [
      { id: 'a', label: 'A', visual: { kind: 'curve', before: 0, start: 0, end: 10, tau: 0.4 }, error: 'ERROR_TAU' },
      { id: 'b', label: 'B', visual: { kind: 'curve', before: 0, start: 0, end: 10, tau: 1.6 }, correct: true },
    ],
    success: 'τ grande = curva lenta.',
  },
  {
    id: 'tau-units', prompt: 'Ω · F da…', skills: ['timeConstantRC'], representation: 'units', difficulty: 1,
    options: [
      { id: 'a', label: 'segundos', correct: true },
      { id: 'b', label: 'voltios', error: 'ERROR_UNIDADES' },
      { id: 'c', label: 'hertz', error: 'ERROR_UNIDADES' },
    ],
  },
  {
    id: 'tau-63', prompt: 'En t = τ, ¿cuánto del cambio total ya ocurrió?', skills: ['timeConstantRC', 'generalizedResponse'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: '50 %', error: 'ERROR_TAU' },
      { id: 'b', label: '≈ 63 %', correct: true },
      { id: 'c', label: '100 %', error: 'ERROR_TAU' },
    ],
  },
  {
    id: 'tau-5', prompt: '¿Después de cuántas τ decimos “ya terminó”?', skills: ['timeConstantRC'], representation: 'concept', difficulty: 1,
    options: [
      { id: 'a', label: '1 τ', error: 'ERROR_TAU' },
      { id: 'b', label: '≈ 5 τ', correct: true },
      { id: 'c', label: 'Nunca', error: 'ERROR_TAU' },
    ],
  },
  {
    id: 'taul-num', prompt: 'RL: L = 2 H, Req = 4 Ω. ¿τ?', skills: ['timeConstantRL'], representation: 'numeric', difficulty: 2,
    options: [
      { id: 'a', label: '8 s', error: 'ERROR_TAU' },
      { id: 'b', label: '2 s', error: 'ERROR_TAU' },
      { id: 'c', label: '0,5 s', correct: true },
    ],
    success: 'τ = L/Req = 2/4',
  },
  {
    id: 'taul-concept', prompt: 'En un RL, si AUMENTAS R, la respuesta es…', skills: ['timeConstantRL'], representation: 'concept', difficulty: 2,
    options: [
      { id: 'a', label: 'Más rápida', correct: true },
      { id: 'b', label: 'Más lenta', error: 'ERROR_TAU' },
    ],
    success: 'τ = L/R: R abajo → τ más pequeña.',
  },

  // ───────── formula ─────────
  {
    id: 'form-pick', prompt: 'v(0⁺) = 4 V, v(∞) = 10 V, τ = 2 s. ¿Cuál es v(t)?', skills: ['generalizedResponse', 'stepResponse'], representation: 'formula', difficulty: 2,
    options: [
      { id: 'a', label: '4 + (10 − 4)e^(−t/2)', error: 'ERROR_FORMULA_EXPONENCIAL' },
      { id: 'b', label: '10 + (4 − 10)e^(−t/2)', correct: true },
      { id: 'c', label: '10 + (4 − 10)e^(t/2)', error: 'ERROR_FORMULA_EXPONENCIAL' },
      { id: 'd', label: '10 + (4 − 10)e^(−2t)', error: 'ERROR_TAU' },
    ],
    success: 'Final + (inicio − final)·e^(−t/τ)',
  },
  {
    id: 'form-graph', prompt: '¿Qué curva es v(t) = 2 + 8e^(−t)?', skills: ['generalizedResponse'], representation: 'graph', difficulty: 2,
    options: [
      { id: 'a', label: 'De 10 a 2', visual: { kind: 'curve', before: 10, start: 10, end: 2, max: 10 }, correct: true },
      { id: 'b', label: 'De 2 a 10', visual: { kind: 'curve', before: 2, start: 2, end: 10, max: 10 }, error: 'ERROR_FORMULA_EXPONENCIAL' },
      { id: 'c', label: 'De 8 a 2', visual: { kind: 'curve', before: 8, start: 8, end: 2, max: 10 }, error: 'ERROR_FORMULA_EXPONENCIAL' },
    ],
    success: 'En t=0: 2+8 = 10. En ∞: 2.',
  },
  {
    id: 'sign-i', prompt: 'v = 10 V en el nodo de arriba. La flecha de i en la R de 5 Ω apunta HACIA ese nodo, desde tierra (0 V). i = ?', skills: ['signConvention'],
    representation: 'concept', difficulty: 2,
    options: [
      { id: 'a', label: '+2 A', error: 'ERROR_SIGNO' },
      { id: 'b', label: '−2 A', correct: true },
    ],
    success: 'La corriente real va de 10 V a 0 V: contra la flecha → negativa.',
  },
  {
    id: 'step-shape', prompt: 'Respuesta al escalón: C empieza descargado y conectas una fuente. v(t)…', skills: ['stepResponse'], representation: 'graph', difficulty: 1,
    options: [
      { id: 'a', label: 'Sube y se aplana', visual: { kind: 'curve', before: 0, start: 0, end: 10 }, correct: true },
      { id: 'b', label: 'Salta y se queda', visual: { kind: 'curve', before: 0, start: 10, end: 10 }, error: 'ERROR_CONTINUIDAD' },
    ],
  },
];

export const QUESTION_BY_ID: Record<string, QuestionDef> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const q = (id: string): QuestionDef => {
  const found = QUESTION_BY_ID[id];
  if (!found) throw new Error(`Unknown question ${id}`);
  return found;
};

export { AFTER, INF, BEFORE };
