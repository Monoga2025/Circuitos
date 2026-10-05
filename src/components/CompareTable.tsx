/** Permanent visual comparison C vs L. */
export function CompareTable() {
  return (
    <div className="compare-table pop-in">
      <div className="ct-h">CAPACITOR ⊣⊢</div>
      <div className="ct-h l">INDUCTOR ∿</div>
      <div>protege VOLTAJE</div>
      <div>protege CORRIENTE</div>
      <div>DC estable = ABIERTO</div>
      <div>DC estable = CABLE</div>
      <div>τ = Req·C</div>
      <div>τ = L / Req</div>
    </div>
  );
}
