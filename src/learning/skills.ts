export const SKILLS = {
  ohmsLaw: 'Ley de Ohm',
  seriesParallel: 'Serie / paralelo',
  nodes: 'Nodos (LCK)',
  meshes: 'Mallas (LVK)',
  superposition: 'Superposición',
  capacitorDc: 'Capacitor en DC',
  capacitorContinuity: 'Continuidad de vC',
  inductorDc: 'Inductor en DC',
  inductorContinuity: 'Continuidad de iL',
  initialCondition: 'Condición inicial',
  finalCondition: 'Condición final',
  sourceDeactivation: 'Apagar fuentes',
  theveninResistance: 'Req vista por C/L',
  timeConstantRC: 'τ en RC',
  timeConstantRL: 'τ en RL',
  naturalResponse: 'Respuesta natural',
  stepResponse: 'Respuesta al escalón',
  generalizedResponse: 'Respuesta completa',
  signConvention: 'Signos y sentidos',
} as const;

export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/** Skills the student says they already roughly know: start a bit higher. */
export const PRIOR_KNOWN: SkillId[] = ['ohmsLaw', 'seriesParallel', 'nodes', 'meshes', 'superposition'];

export const SKILL_GROUPS: { title: string; skills: SkillId[] }[] = [
  { title: 'Lo que ya sabes', skills: ['ohmsLaw', 'seriesParallel', 'nodes', 'meshes', 'superposition'] },
  { title: 'Elementos', skills: ['capacitorDc', 'capacitorContinuity', 'inductorDc', 'inductorContinuity'] },
  { title: 'Método', skills: ['initialCondition', 'finalCondition', 'sourceDeactivation', 'theveninResistance', 'timeConstantRC', 'timeConstantRL'] },
  { title: 'Respuesta', skills: ['naturalResponse', 'stepResponse', 'generalizedResponse', 'signConvention'] },
];
