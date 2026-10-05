import { LABS } from '../data/labs';
import { displayMastery } from '../learning/mastery';
import { SKILL_IDS } from '../learning/skills';
import { useGame } from '../store/game';

export function MuteButton() {
  const muted = useGame((s) => s.muted);
  return (
    <button className="btn ghost icon" onClick={() => useGame.getState().toggleMute()} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

export function nextLabId(): string {
  const { labs, freeMode } = useGame.getState();
  const first = LABS.find((l) => !labs[l.id]?.completed && (freeMode || isUnlocked(l.id)));
  return first?.id ?? LABS[LABS.length - 1].id;
}

export function isUnlocked(labId: string): boolean {
  const { labs, freeMode } = useGame.getState();
  if (freeMode) return true;
  const i = LABS.findIndex((l) => l.id === labId);
  if (i <= 1) return true; // Lab 0 and Lab 1 always open
  return !!labs[LABS[i - 1].id]?.completed;
}

export function Home() {
  const { go } = useGame.getState();
  const labs = useGame((s) => s.labs);
  const skills = useGame((s) => s.skills);
  const lastLab = useGame((s) => s.lastLab);
  const done = LABS.filter((l) => labs[l.id]?.completed).length;
  const avg = SKILL_IDS.reduce((a, k) => a + displayMastery(skills[k]), 0) / SKILL_IDS.length;
  const cont = lastLab && !labs[lastLab]?.completed ? lastLab : nextLabId();
  const contLab = LABS.find((l) => l.id === cont)!;

  return (
    <div className="home">
      <div className="home-bg" aria-hidden>
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
          <path d="M0 300 L160 300 L180 280 L200 320 L220 280 L240 320 L260 300 L420 300 M420 270 L420 330 M440 270 L440 330 M440 300 L800 300" className="bg-circuit" />
          <path d="M0 120 C200 120 220 40 400 40 S600 120 800 120" className="bg-curve" />
        </svg>
      </div>
      <div className="home-top">
        <MuteButton />
      </div>
      <div className="hero">
        <div className="logo">
          <span className="logo-icon">⊣⊢</span>
        </div>
        <h1>
          Circuit Quest <span>Primer Orden</span>
        </h1>
        <p className="tag">Antes · 0⁺ · ∞ · Req · τ — aprende a mirar un circuito RC/RL en 60 minutos, jugando.</p>
      </div>
      <div className="home-menu">
        <button className="menu-btn primary" autoFocus onClick={() => go({ name: 'lab', labId: cont })}>
          <span className="mb-icon">▶</span>
          <span className="mb-text">
            <b>CONTINUAR</b>
            <small>
              Lab {contLab.num} · {contLab.title}
            </small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => go({ name: 'map' })}>
          <span className="mb-icon">🗺</span>
          <span className="mb-text">
            <b>ENTRENAMIENTO</b>
            <small>Mapa de laboratorios · WASD / flechas</small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => go({ name: 'lab', labId: 'lab8' })}>
          <span className="mb-icon">🎓</span>
          <span className="mb-text">
            <b>MODO EXAMEN</b>
            <small>Sin ayudas · cronómetro · puntos por procedimiento</small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => go({ name: 'mastery' })}>
          <span className="mb-icon">📊</span>
          <span className="mb-text">
            <b>MAPA DE DOMINIO</b>
            <small>
              {done}/{LABS.length} labs · dominio medio {Math.round(avg * 100)}%
            </small>
          </span>
        </button>
      </div>
      <p className="home-foot">Progreso guardado en este navegador. Sin cuentas, sin internet.</p>
    </div>
  );
}
