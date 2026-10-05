import type { ReactNode } from 'react';

/** 70 % stage (circuit / game) + 30 % panel (controls). Stacks on mobile. */
export function StepLayout({ stage, panel, wide }: { stage: ReactNode; panel?: ReactNode; wide?: boolean }) {
  if (!panel) return <div className={`step-single ${wide ? 'wide' : ''}`}>{stage}</div>;
  return (
    <div className="step-grid">
      <section className="stage">{stage}</section>
      <aside className="panel">{panel}</aside>
    </div>
  );
}

export function StepTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <div className="step-title">
      {kicker && <span className="kicker">{kicker}</span>}
      <h2>{title}</h2>
    </div>
  );
}
