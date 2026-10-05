import type { IconName } from '../data/model';

export function OptionIcon({ icon }: { icon: IconName }) {
  return (
    <svg viewBox="0 0 100 40" className="opt-icon">
      {icon === 'short' && <line x1={4} y1={20} x2={96} y2={20} className="sym-line" />}
      {icon === 'open' && (
        <>
          <line x1={4} y1={20} x2={38} y2={20} className="sym-line" />
          <line x1={62} y1={20} x2={96} y2={20} className="sym-line" />
          <circle cx={38} cy={20} r={4} className="open-end" />
          <circle cx={62} cy={20} r={4} className="open-end" />
        </>
      )}
      {icon === 'resistor' && <polyline points="4,20 30,20 35,10 43,30 51,10 59,30 67,10 70,20 96,20" className="sym-line" />}
      {icon === 'capacitor' && (
        <>
          <line x1={4} y1={20} x2={45} y2={20} className="sym-line" />
          <line x1={55} y1={20} x2={96} y2={20} className="sym-line" />
          <line x1={45} y1={6} x2={45} y2={34} className="plate" />
          <line x1={55} y1={6} x2={55} y2={34} className="plate" />
        </>
      )}
      {icon === 'inductor' && (
        <path d="M4 20 L26 20 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 L96 20" className="sym-line coil" />
      )}
      {icon === 'keep' && (
        <>
          <line x1={4} y1={20} x2={32} y2={20} className="sym-line" />
          <line x1={68} y1={20} x2={96} y2={20} className="sym-line" />
          <path d="M32 20 L50 4 L68 20 L50 36 Z" className="sym src-dep" />
        </>
      )}
    </svg>
  );
}
