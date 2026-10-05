import { SCRUB } from '../engine/analysis';

interface Props {
  s: number;
  onChange: (s: number) => void;
  playing?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  disabled?: boolean;
  /** Only allow these discrete stops (time machine) */
  compact?: boolean;
}

const span = SCRUB.infStart - SCRUB.zeroPlus;
export const TICKS = [
  { s: 40, label: 't < 0' },
  { s: SCRUB.beforeEnd - 8, label: '0⁻' },
  { s: SCRUB.zeroPlus - 6, label: '0⁺' },
  ...[1, 2, 3, 4, 5].map((k) => ({ s: SCRUB.zeroPlus + (k / SCRUB.tauSpan) * span, label: `${k}τ` })),
  { s: SCRUB.max - 30, label: '∞' },
];

export function TimeScrubber({ s, onChange, playing, onPlay, onPause, disabled, compact }: Props) {
  const pct = (v: number) => `${(v / SCRUB.max) * 100}%`;
  return (
    <div className={`scrubber ${compact ? 'compact' : ''} ${disabled ? 'disabled' : ''}`}>
      {onPlay && (
        <button
          className="play"
          onClick={playing ? onPause : onPlay}
          disabled={disabled}
          aria-label={playing ? 'Pausa' : 'Reproducir'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
      )}
      <div className="track-wrap">
        <div className="zones">
          <div className="zone before" style={{ left: 0, width: pct(SCRUB.beforeEnd) }} />
          <div className="zone jump" style={{ left: pct(SCRUB.beforeEnd), width: pct(SCRUB.zeroPlus - SCRUB.beforeEnd) }} />
          <div className="zone after" style={{ left: pct(SCRUB.zeroPlus), width: pct(SCRUB.infStart - SCRUB.zeroPlus) }} />
          <div className="zone inf" style={{ left: pct(SCRUB.infStart), width: pct(SCRUB.max - SCRUB.infStart) }} />
          <div className="fill" style={{ width: pct(s) }} />
        </div>
        <input
          type="range"
          min={0}
          max={SCRUB.max}
          step={1}
          value={s}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Tiempo"
        />
        <div className="ticks">
          {TICKS.map((t) => (
            <button
              key={t.label}
              className="tick"
              style={{ left: pct(t.s) }}
              onClick={() => onChange(t.s)}
              disabled={disabled}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
