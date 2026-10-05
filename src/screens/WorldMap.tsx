// 2D lab campus. Walk with WASD/arrows, ENTER/E near a station to enter.
// Clicking a station walks there automatically: the map never wastes time.
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { LABS } from '../data/labs';
import { useGame } from '../store/game';
import { isUnlocked, MuteButton, nextLabId } from './Home';

const TW = 38;
const TH = 10;
const SPEED = 7; // tiles per second

export function WorldMap() {
  const labs = useGame((s) => s.labs);
  const freeMode = useGame((s) => s.freeMode);
  const [pos, setPos] = useState(() => useGame.getState().avatar);
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState('');
  const keys = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number; lab: string } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const recommended = nextLabId();

  const near = LABS.find((l) => Math.hypot(l.map.x - pos.x, l.map.y + 1 - pos.y) < 1.4);

  const enter = (labId: string) => {
    if (!isUnlocked(labId)) {
      sfx.wrong();
      const i = LABS.findIndex((l) => l.id === labId);
      setMsg(`🔒 Completa primero el Lab ${LABS[i - 1].num} (o activa modo libre).`);
      return;
    }
    sfx.level();
    useGame.getState().setAvatar(posRef.current);
    useGame.getState().go({ name: 'lab', labId });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
        target.current = null;
      }
      if ((k === 'enter' || k === 'e' || k === ' ') && nearRef.current) enter(nearRef.current);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      let dx = 0;
      let dy = 0;
      const K = keys.current;
      if (K.has('a') || K.has('arrowleft')) dx -= 1;
      if (K.has('d') || K.has('arrowright')) dx += 1;
      if (K.has('w') || K.has('arrowup')) dy -= 1;
      if (K.has('s') || K.has('arrowdown')) dy += 1;
      const t = target.current;
      if (!dx && !dy && t) {
        const ddx = t.x - posRef.current.x;
        const ddy = t.y - posRef.current.y;
        const d = Math.hypot(ddx, ddy);
        if (d < 0.15) {
          target.current = null;
          enter(t.lab);
        } else {
          dx = ddx / d;
          dy = ddy / d;
        }
      }
      if (dx || dy) {
        const n = Math.hypot(dx, dy);
        const sp = t ? SPEED * 2.2 : SPEED;
        const nx = Math.max(0.5, Math.min(TW - 0.5, posRef.current.x + (dx / n) * sp * dt));
        const ny = Math.max(1, Math.min(TH - 0.5, posRef.current.y + (dy / n) * sp * dt));
        setPos({ x: nx, y: ny });
        if (dx) setFacing(dx > 0 ? 1 : -1);
        setMoving(true);
      } else setMoving(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(raf);
      useGame.getState().setAvatar(posRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nearRef = useRef<string | null>(null);
  nearRef.current = near?.id ?? null;

  const S = 40;
  const pathD = LABS.map((l, i) => `${i ? 'L' : 'M'}${l.map.x * S} ${(l.map.y + 1) * S}`).join(' ');

  return (
    <div className="world">
      <header className="world-header">
        <button className="btn ghost" onClick={() => useGame.getState().go({ name: 'home' })}>
          ← Inicio
        </button>
        <div className="world-title">Campus de Circuitos</div>
        <div className="header-actions">
          <label className="free-toggle">
            <input type="checkbox" checked={freeMode} onChange={() => useGame.getState().toggleFree()} /> modo libre
          </label>
          <button className="btn ghost" onClick={() => useGame.getState().go({ name: 'mastery' })}>
            📊 Dominio
          </button>
          <MuteButton />
        </div>
      </header>
      <div className="map-scroll">
        <svg className="map" viewBox={`0 0 ${TW * S} ${(TH + 0.6) * S}`}>
          <defs>
            <pattern id="grid" width={S} height={S} patternUnits="userSpaceOnUse">
              <path d={`M${S} 0 L0 0 0 ${S}`} className="grid-line" />
            </pattern>
          </defs>
          <rect width={TW * S} height={(TH + 0.6) * S} fill="url(#grid)" />
          <path d={pathD} className="map-path" />
          <path d={pathD} className="map-path-flow" />
          {LABS.map((l) => {
            const done = labs[l.id]?.completed;
            const locked = !isUnlocked(l.id);
            const rec = l.id === recommended;
            const x = l.map.x * S;
            const y = l.map.y * S;
            return (
              <g
                key={l.id}
                className={`station ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${rec ? 'rec' : ''} ${near?.id === l.id ? 'near' : ''}`}
                onClick={() => (target.current = { x: l.map.x, y: l.map.y + 1, lab: l.id })}
                style={{ ['--c' as string]: l.color }}
              >
                {rec && <circle cx={x} cy={y} r={S * 1.25} className="rec-ring" />}
                <rect x={x - S * 0.9} y={y - S * 0.9} width={S * 1.8} height={S * 1.5} rx={12} className="building" />
                <text x={x} y={y - S * 0.05} textAnchor="middle" className="st-icon">
                  {locked ? '🔒' : l.icon}
                </text>
                <text x={x} y={y + S * 0.95} textAnchor="middle" className="st-num">
                  LAB {l.num} {done ? '✓' : ''}
                </text>
                <text x={x} y={y + S * 1.35} textAnchor="middle" className="st-name">
                  {l.title}
                </text>
                {done && labs[l.id]?.stars ? (
                  <text x={x} y={y - S * 1.05} textAnchor="middle" className="st-stars">
                    {'★'.repeat(labs[l.id]!.stars!)}
                  </text>
                ) : null}
              </g>
            );
          })}
          <g transform={`translate(${pos.x * S} ${pos.y * S})`} className={`avatar ${moving ? 'moving' : ''}`}>
            <ellipse cx={0} cy={4} rx={13} ry={4} className="av-shadow" />
            <g transform={`scale(${facing} 1)`} className="av-body">
              <rect x={-9} y={-26} width={18} height={22} rx={7} className="av-suit" />
              <circle cx={0} cy={-32} r={10} className="av-head" />
              <rect x={-2} y={-37} width={11} height={6} rx={3} className="av-visor" />
              <path d="M-2 -18 l4 -5 l-1 4 l3 0 l-5 6 l1 -4 z" className="av-bolt" />
            </g>
          </g>
        </svg>
      </div>
      <div className="world-foot">
        {near ? (
          <div className="near-card pop-in" key={near.id}>
            <span className="nc-icon">{near.icon}</span>
            <span>
              <b>
                LAB {near.num} · {near.title}
              </b>
              <small>{near.discover}</small>
            </span>
            <button className="btn primary" onClick={() => enter(near.id)}>
              Entrar (Enter)
            </button>
          </div>
        ) : (
          <div className="hint-line">{msg || 'Muévete con WASD / flechas, o haz clic en un laboratorio. El brillo marca el recomendado.'}</div>
        )}
      </div>
    </div>
  );
}
