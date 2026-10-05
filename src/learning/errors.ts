import type { SkillId } from './skills';

export const ERRORS = {
  CONFUSION_DC_CAPACITOR: { title: 'Capacitor en DC', skill: 'capacitorDc' },
  CONFUSION_DC_INDUCTOR: { title: 'Inductor en DC', skill: 'inductorDc' },
  ERROR_CONTINUIDAD: { title: 'Continuidad en t = 0', skill: 'capacitorContinuity' },
  ERROR_CONDICION_INICIAL: { title: 'Condición inicial', skill: 'initialCondition' },
  ERROR_CONDICION_FINAL: { title: 'Condición final', skill: 'finalCondition' },
  ERROR_APAGAR_FUENTES: { title: 'Apagar fuentes', skill: 'sourceDeactivation' },
  ERROR_REQ: { title: 'Resistencia equivalente', skill: 'theveninResistance' },
  ERROR_TAU: { title: 'Constante de tiempo', skill: 'timeConstantRC' },
  ERROR_SIGNO: { title: 'Signo / sentido', skill: 'signConvention' },
  ERROR_FORMULA_EXPONENCIAL: { title: 'Fórmula exponencial', skill: 'generalizedResponse' },
  ERROR_UNIDADES: { title: 'Unidades', skill: 'timeConstantRC' },
  ERROR_BASICO: { title: 'Análisis DC básico', skill: 'ohmsLaw' },
} as const satisfies Record<string, { title: string; skill: SkillId }>;

export type ErrorType = keyof typeof ERRORS;
