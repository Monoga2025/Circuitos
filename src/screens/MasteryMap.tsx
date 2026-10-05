import { useState } from 'react';
import { ERRORS, type ErrorType } from '../learning/errors';
import { displayMastery, isMastered } from '../learning/mastery';
import { SKILL_GROUPS, SKILLS } from '../learning/skills';
import { useGame } from '../store/game';
import { fmtTime } from './LabPlayer';
import { MuteButton } from './Home';

const blocks = (v: number) => '█'.repeat(Math.round(v * 10)).padEnd(10, '░');

export function MasteryMap() {
  const [confirmReset, setConfirmReset] = useState(false);
  const skills = useGame((s) => s.skills);
  const errorCounts = useGame((s) => s.errorCounts);
  const exams = useGame((s) => s.exams);
  const reviews = useGame((s) => s.reviews);
  const topErrors = (Object.entries(errorCounts) as [ErrorType, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="mastery">
      <header className="world-header">
        <button className="btn ghost" onClick={() => useGame.getState().go({ name: 'home' })}>
          ← Inicio
        </button>
        <div className="world-title">Mapa de dominio</div>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => useGame.getState().go({ name: 'map' })}>
            🗺 Mapa
          </button>
          <MuteButton />
        </div>
      </header>
      <div className="mastery-grid">
        {SKILL_GROUPS.map((g) => (
          <section key={g.title} className="m-group">
            <h3>{g.title}</h3>
            {g.skills.map((k) => {
              const s = skills[k];
              const v = displayMastery(s);
              return (
                <div key={k} className={`m-skill ${isMastered(s) ? 'mastered' : ''}`}>
                  <span className="ms-name">{SKILLS[k]}</span>
                  <span className="ms-blocks" aria-hidden>
                    {blocks(v)}
                  </span>
                  <span className="ms-pct">{Math.round(v * 100)}%</span>
                  <span className="ms-flags">
                    {isMastered(s) && <span title="Dominada">✓</span>}
                    {s.suspectLuck && <span title="Acertaste y luego fallaste algo equivalente: posible suerte">🎲</span>}
                    {s.attempts === 0 && <span className="muted" title="Sin datos aún">·</span>}
                  </span>
                </div>
              );
            })}
          </section>
        ))}
        <section className="m-group">
          <h3>Errores frecuentes</h3>
          {topErrors.length ? (
            topErrors.map(([e, n]) => (
              <div key={e} className="m-skill">
                <span className="ms-name">{ERRORS[e].title}</span>
                <span className="ms-pct">×{n}</span>
              </div>
            ))
          ) : (
            <p className="muted">Aún nada. ¡Juega un lab!</p>
          )}
          <h3>Repasos pendientes</h3>
          <p className="muted">{reviews.length ? `${reviews.length} idea(s) volverán en otra forma.` : 'Ninguno.'}</p>
          <h3>Simulacros</h3>
          {exams.length ? (
            exams.slice(-5).map((x) => (
              <div key={x.at} className="m-skill">
                <span className="ms-name">{new Date(x.at).toLocaleTimeString()}</span>
                <span className="ms-pct">
                  {Math.round((x.score / (x.max || 1)) * 100)}% · {fmtTime(x.seconds)}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">Aún no has hecho el simulacro.</p>
          )}
        </section>
      </div>
      <p className="mastery-note">
        Una habilidad solo se marca ✓ con ≥ 3 aciertos al primer intento, en ≥ 2 representaciones distintas, sin sospecha de suerte. Hasta entonces la barra se queda en 80 % máx.
      </p>
      {confirmReset ? (
        <div className="row reset-row">
          <span className="muted">¿Borrar todo el progreso?</span>
          <button className="btn ghost small" onClick={() => setConfirmReset(false)}>
            Cancelar
          </button>
          <button
            className="btn small danger"
            onClick={() => {
              useGame.getState().reset();
              setConfirmReset(false);
            }}
          >
            Sí, borrar
          </button>
        </div>
      ) : (
        <button className="btn ghost small danger" onClick={() => setConfirmReset(true)}>
          Reiniciar progreso
        </button>
      )}
    </div>
  );
}
