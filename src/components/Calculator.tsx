// Button calculator with a parallel operator (∥). No typing needed.
import { useState } from 'react';

export function evaluate(expr: string): number {
  const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  const num = (): number => {
    const m = /^\d*\.?\d+(e[-+]?\d+)?/i.exec(s.slice(i));
    if (!m) throw new Error('num');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const factor = (): number => {
    if (peek() === '-') {
      i++;
      return -factor();
    }
    if (peek() === '(') {
      i++;
      const v = expr2();
      if (peek() !== ')') throw new Error(')');
      i++;
      return v;
    }
    return num();
  };
  const term = (): number => {
    let v = factor();
    while (peek() === '*' || peek() === '/' || peek() === '∥') {
      const op = s[i++];
      const w = factor();
      v = op === '*' ? v * w : op === '/' ? v / w : (v * w) / (v + w);
    }
    return v;
  };
  const expr2 = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const w = term();
      v = op === '+' ? v + w : v - w;
    }
    return v;
  };
  const v = expr2();
  if (i !== s.length) throw new Error('trailing');
  return v;
}

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '∥', '+', '(', ')', 'C', '='];

export function Calculator({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState('');
  const [out, setOut] = useState('');
  const press = (k: string) => {
    if (k === 'C') {
      setExpr('');
      setOut('');
      return;
    }
    if (k === '=') {
      try {
        const v = evaluate(expr.replace(/−/g, '-'));
        setOut(isFinite(v) ? String(Math.round(v * 1e4) / 1e4).replace('.', ',') : 'error');
      } catch {
        setOut('error');
      }
      return;
    }
    setExpr((e) => e + k);
  };
  return (
    <div className="calc pop-in">
      <div className="calc-head">
        <span>Calculadora</span>
        <button className="x" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className="calc-screen">
        <div className="calc-expr">{expr || '0'}</div>
        <div className="calc-out">{out && `= ${out}`}</div>
      </div>
      <div className="calc-keys">
        {KEYS.map((k) => (
          <button key={k} className={`ck ${'÷×−+∥='.includes(k) ? 'op' : ''}`} onClick={() => press(k)} title={k === '∥' ? 'paralelo: a·b/(a+b)' : undefined}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
