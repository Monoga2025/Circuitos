// Level structure. Each lab answers ONE question: what should the student discover?
// Pattern per concept: guided example → partially guided → 2 free → transfer.
import type { Lab } from './model';
import { q } from './questions';

export const LABS: Lab[] = [
  {
    id: 'lab0', num: 0, title: 'Lo que ya sabes', subtitle: '5 preguntas rápidas', icon: '⚡', color: '#a3e635',
    discover: 'Que ya tienes las herramientas: Ohm, LCK, paralelo y apagar fuentes.',
    map: { x: 2, y: 7 },
    steps: [
      { type: 'question', id: 'l0-1', q: q('w-ohm'), guidance: 'free' },
      { type: 'question', id: 'l0-2', q: q('w-par'), guidance: 'free' },
      { type: 'question', id: 'l0-3', q: q('w-kcl'), guidance: 'free' },
      { type: 'question', id: 'l0-4', q: q('w-voff'), guidance: 'free' },
      { type: 'question', id: 'l0-5', q: q('w-ioff'), guidance: 'free' },
    ],
  },
  {
    id: 'lab1', num: 1, title: 'El capacitor', subtitle: 'Guarda voltaje', icon: '⊣⊢', color: '#22d3ee',
    discover: 'En DC estable el capacitor es un ABIERTO y su voltaje no salta.',
    map: { x: 6, y: 4 },
    steps: [
      {
        type: 'explore', id: 'l1-charge', circuit: 'c-charge', title: 'Conectar batería',
        prompt: 'Toca el interruptor. Mira qué pasa con la corriente.', goal: 'flipAndWait', skills: ['capacitorDc'],
        narration: [
          { until: 0.3, text: '¡Mucha corriente! El capacitor está vacío.' },
          { until: 2, text: 'Se llenan las placas… la corriente BAJA.' },
          { until: 4.5, text: 'Casi lleno. Casi no entra corriente.' },
          { until: 99, text: 'Lleno. vC = 10 V. Corriente ≈ 0.' },
        ],
        hints: [{ text: 'Toca el interruptor (arriba a la izquierda).', highlight: ['S'] }, { text: 'Luego mira el medidor de corriente.', highlight: ['R'] }],
      },
      {
        type: 'question', id: 'l1-q1', guidance: 'guided',
        q: {
          id: 'l1-where', prompt: 'Después de MUCHO tiempo, ¿por dónde pasa corriente?', skills: ['capacitorDc'], representation: 'circuit-flow', difficulty: 1,
          visual: { circuit: 'c-charge', time: { kind: 'after', t: 0.3 }, highlight: ['C'] },
          options: [
            { id: 'a', label: 'Por todo el circuito', error: 'CONFUSION_DC_CAPACITOR' },
            { id: 'b', label: 'Por ningún lado: i = 0', correct: true },
            { id: 'c', label: 'Solo por la resistencia', error: 'CONFUSION_DC_CAPACITOR' },
          ],
          hints: [{ text: 'Mueve el tiempo hasta el final.', highlight: ['C'] }, { text: 'Mira el capacitor a t → ∞.', time: { kind: 'inf' } }],
          success: 'CAPACITOR EN DC ESTABLE = CIRCUITO ABIERTO',
        },
      },
      {
        type: 'explore', id: 'l1-hold', circuit: 'c-hold', title: 'Desconectar batería',
        prompt: 'Está cargado. Abre el interruptor. ¿Pierde su energía?', goal: 'flipAndWait', skills: ['capacitorDc'],
        narration: [{ until: 99, text: 'Nada cambia: sin camino, la carga se queda. Energía guardada.' }],
        hints: [{ text: 'Toca el interruptor para desconectar.', highlight: ['S'] }],
      },
      {
        type: 'explore', id: 'l1-discharge', circuit: 'c-discharge', title: 'Descargar sobre R', energyFlow: true,
        prompt: 'Conecta el capacitor cargado a la resistencia.', goal: 'flipAndWait', skills: ['capacitorDc', 'naturalResponse'],
        narration: [
          { until: 0.3, text: 'La energía del capacitor sale…' },
          { until: 3, text: '…y la resistencia la convierte en calor.' },
          { until: 99, text: 'Energía guardada → resistencia. v baja a 0.' },
        ],
        hints: [{ text: 'Toca el interruptor.', highlight: ['S'] }, { text: 'Mira cómo se calienta R.', highlight: ['R'] }],
      },
      { type: 'question', id: 'l1-q2', q: { ...q('cont-c-graph'), confidence: true }, guidance: 'partial' },
      {
        type: 'reveal', id: 'l1-rev', title: 'Ahora sí, las fórmulas',
        cards: [
          { title: 'Carga', formula: 'q = C·v', meaning: 'Más voltaje → más carga en las placas.', tone: 'c' },
          { title: 'Corriente', formula: 'i = C·dv/dt', meaning: 'Si v NO cambia → i = 0 → ABIERTO.', tone: 'c' },
          { title: 'No salta', formula: 'vC(0⁻) = vC(0⁺)', meaning: 'Un salto de v necesitaría i infinita.', tone: 'c' },
          { title: 'Energía', formula: 'w = ½·C·v²', meaning: 'Guardada en el campo eléctrico.', tone: 'c' },
        ],
        check: q('capdc-graph'),
      },
      { type: 'question', id: 'l1-q3', q: q('capdc-num'), guidance: 'free' },
      { type: 'question', id: 'l1-q4', q: { ...q('cont-c-num'), confidence: true }, guidance: 'free' },
    ],
  },
  {
    id: 'lab2', num: 2, title: 'El inductor', subtitle: 'Guarda corriente', icon: '∿', color: '#f472b6',
    discover: 'En DC estable el inductor es un CABLE y su corriente no salta.',
    map: { x: 11, y: 3 },
    steps: [
      {
        type: 'explore', id: 'l2-charge', circuit: 'l-charge', title: 'La bobina',
        prompt: 'Cierra el interruptor. ¿La corriente salta de golpe?', goal: 'flipAndWait', skills: ['inductorContinuity'],
        narration: [
          { until: 0.2, text: 'En t=0⁺ iL = 0: ¡no puede saltar!' },
          { until: 2, text: 'El campo magnético crece. La corriente SUBE despacio.' },
          { until: 99, text: 'Estable: vL = 0, pasa toda la corriente. Es un CABLE.' },
        ],
        hints: [{ text: 'Toca el interruptor.', highlight: ['S'] }, { text: 'Mira iL justo en 0⁺.', highlight: ['L'] }],
      },
      { type: 'question', id: 'l2-q1', q: q('cont-l-concept'), guidance: 'guided' },
      { type: 'question', id: 'l2-q2', q: q('inddc-icon'), guidance: 'partial' },
      { type: 'slot', id: 'l2-slot', skills: ['capacitorDc', 'inductorDc'] },
      {
        type: 'reveal', id: 'l2-rev', title: 'Capacitor vs Inductor',
        cards: [
          { title: 'Capacitor protege', formula: 'VOLTAJE', meaning: 'DC estable = ABIERTO', tone: 'c' },
          { title: 'Inductor protege', formula: 'CORRIENTE', meaning: 'DC estable = CORTO (cable)', tone: 'l' },
          { title: 'Inductor', formula: 'v = L·di/dt', meaning: 'Si i no cambia → v = 0 → cable.', tone: 'l' },
          { title: 'Energía', formula: 'w = ½·L·i²', meaning: 'Guardada en el campo magnético.', tone: 'l' },
        ],
      },
      { type: 'classify', id: 'l2-classify' },
      { type: 'survive', id: 'l2-survive' },
      { type: 'question', id: 'l2-q3', q: { ...q('inddc-num'), confidence: true }, guidance: 'free' },
    ],
  },
  {
    id: 'lab3', num: 3, title: 'Máquina del tiempo', subtitle: 'Antes · 0⁺ · ∞', icon: '⏱', color: '#facc15',
    discover: 'Todo problema se parte en 3 fotos: ANTES, JUSTO DESPUÉS y MUCHO DESPUÉS.',
    map: { x: 15, y: 6 },
    steps: [
      { type: 'timeMachine', id: 'l3-tm1', circuit: 'tm-rc-discharge', guidance: 'guided' },
      { type: 'question', id: 'l3-q1', q: q('ic-concept'), guidance: 'partial' },
      { type: 'timeMachine', id: 'l3-tm2', circuit: 'tm-rc-charge', guidance: 'partial' },
      { type: 'question', id: 'l3-q2', q: { ...q('fc-concept'), confidence: true }, guidance: 'free' },
      { type: 'question', id: 'l3-q3', q: q('nat-concept'), guidance: 'free' },
    ],
  },
  {
    id: 'lab4', num: 4, title: 'Velocidad: τ y Req', subtitle: 'Qué tan rápido', icon: 'τ', color: '#fb923c',
    discover: 'τ = Req·C mide la velocidad. Req se ve DESDE el capacitor con fuentes apagadas.',
    map: { x: 19, y: 3 },
    steps: [
      { type: 'tauLab', id: 'l4-tau' },
      { type: 'question', id: 'l4-q1', q: q('tau-double'), guidance: 'partial' },
      { type: 'reqHunt', id: 'l4-req1', circuit: 'req-1', guidance: 'guided' },
      { type: 'reqHunt', id: 'l4-req2', circuit: 'req-2', guidance: 'partial' },
      { type: 'question', id: 'l4-q2', q: { ...q('tau-num'), confidence: true }, guidance: 'free' },
      { type: 'reqHunt', id: 'l4-req3', circuit: 'req-dep', guidance: 'transfer' },
    ],
  },
  {
    id: 'lab5', num: 5, title: 'La fórmula + clase', subtitle: 'Inicio · Final · Velocidad', icon: 'ƒ', color: '#a78bfa',
    discover: 'v(t) = final + (inicio − final)·e^(−t/τ). Tres números y listo.',
    map: { x: 23, y: 7 },
    steps: [
      { type: 'curveBuilder', id: 'l5-curve', circuit: 'tm-rc-discharge' },
      { type: 'formula', id: 'l5-formula', circuit: 'tm-rc-charge' },
      { type: 'question', id: 'l5-q1', q: { ...q('form-pick'), confidence: true }, guidance: 'free' },
      { type: 'guided', id: 'l5-clase', circuit: 'clase', guidance: 'guided', target: { comp: 'R5', kind: 'i', name: 'i(t) en 5 Ω', sign: -1 } },
      { type: 'question', id: 'l5-q2', q: q('form-graph'), guidance: 'transfer' },
    ],
  },
  {
    id: 'lab6', num: 6, title: 'RL: mismo truco', subtitle: 'vC → iL · RC → L/R', icon: '🧲', color: '#34d399',
    discover: 'RL es IDÉNTICO: cambia vC por iL y Req·C por L/Req.',
    map: { x: 27, y: 3 },
    steps: [
      {
        type: 'reveal', id: 'l6-map', title: 'Traducción RC → RL',
        cards: [
          { title: 'Variable protegida', formula: 'vC  →  iL', meaning: 'En RL la fórmula se hace con la CORRIENTE.', tone: 'l' },
          { title: 'En DC estable', formula: 'abierto  →  cable', meaning: 'L en ∞ se reemplaza por un cable.', tone: 'l' },
          { title: 'Velocidad', formula: 'Req·C  →  L / Req', meaning: 'En RL más R = MÁS rápido.', tone: 'l' },
          { title: 'Fórmula', formula: 'i(t) = i∞ + (i₀ − i∞)e^(−t/τ)', meaning: 'Exactamente la misma estructura.', tone: 'n' },
        ],
        check: q('taul-concept'),
      },
      { type: 'timeMachine', id: 'l6-tm', circuit: 'tm-rl-discharge', guidance: 'partial' },
      { type: 'question', id: 'l6-q1', q: q('taul-num'), guidance: 'free' },
      { type: 'guided', id: 'l6-step', circuit: 'rl-step', guidance: 'partial' },
      { type: 'question', id: 'l6-q2', q: { ...q('cont-l-graph'), confidence: true }, guidance: 'transfer' },
    ],
  },
  {
    id: 'lab7', num: 7, title: 'Boss Fight', subtitle: 'Tú decides el orden', icon: '👾', color: '#f43f5e',
    discover: 'Que puedes resolver un circuito completo SIN guía, eligiendo el procedimiento.',
    map: { x: 31, y: 6 },
    steps: [
      { type: 'boss', id: 'l7-boss1', circuit: 'boss-rc', name: 'Capacitron' },
      { type: 'boss', id: 'l7-boss2', circuit: 'boss-rl', name: 'Inductaur' },
    ],
  },
  {
    id: 'lab8', num: 8, title: 'Simulacro profesora', subtitle: 'Examen cronometrado', icon: '🎓', color: '#e2e8f0',
    discover: 'Que estás listo para el parcial: sin ayudas, con tiempo, puntos por procedimiento.',
    map: { x: 35, y: 3 },
    exam: true,
    steps: [
      { type: 'boss', id: 'l8-clase', circuit: 'clase', name: 'Ejercicio de clase' },
      { type: 'boss', id: 'l8-rl', circuit: 'tm-rl-discharge', name: 'RL natural' },
      { type: 'boss', id: 'l8-rc', circuit: 'exam-rc', name: 'RC natural' },
    ],
  },
];

export const LAB_BY_ID: Record<string, Lab> = Object.fromEntries(LABS.map((l) => [l.id, l]));
