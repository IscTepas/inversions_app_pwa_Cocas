import React from "react";

export interface CoverageModalParams {
  currentPrice: number;
  putStrikePrice?: number;
  callStrikePrice?: number;
  iv?: number;
  dte?: number;
  shares?: number;
  capital?: number;
  riskTolerancePct?: number;
}

const STRATEGY_LABELS: Record<string, string> = {
  IRON_CONDOR: "Iron Condor",
  BULL_CALL_SPREAD: "Bull Call Spread",
  BEAR_PUT_SPREAD: "Bear Put Spread",
  BUY_CALL: "Buy Call",
  BUY_PUT: "Buy Put",
  SELL_CALL: "Sell Call",
  SELL_PUT: "Sell Put",
  STRADDLE: "Straddle",
  STRANGLE: "Strangle",
  BUTTERFLY: "Butterfly",
  COVERED_CALL: "Covered Call",
};

const NEEDS_PUT_STRIKE = new Set(["BEAR_PUT_SPREAD", "BUY_PUT", "SELL_PUT", "IRON_CONDOR", "STRADDLE", "STRANGLE", "BUTTERFLY"]);
const NEEDS_CALL_STRIKE = new Set(["BULL_CALL_SPREAD", "BUY_CALL", "SELL_CALL", "IRON_CONDOR", "COVERED_CALL", "STRADDLE", "STRANGLE", "BUTTERFLY"]);
const NEEDS_SHARES = new Set(["COVERED_CALL"]);

interface Props {
  open: boolean;
  estrategia: string;
  params: CoverageModalParams;
  onChange: (params: CoverageModalParams) => void;
  onClose: () => void;
}

export function CoverageParamsModal({ open, estrategia, params, onChange, onClose }: Props) {
  if (!open) return null;

  const set = <K extends keyof CoverageModalParams>(field: K, value: CoverageModalParams[K]) =>
    onChange({ ...params, [field]: value });

  const fieldLabel: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)"
  };
  const labelText: React.CSSProperties = {
    color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase"
  };

  const label = STRATEGY_LABELS[estrategia] ?? estrategia.replace(/_/g, " ");

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", zIndex: 45, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-lg)", width: "min(520px, 94vw)", maxHeight: "90vh", overflow: "auto", border: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <div>
            <h3 style={{ margin: "0 0 2px", fontSize: "var(--font-size-base)" }}>{label}</h3>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Parámetros de cobertura (TEAM-05)</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.2rem", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <label style={fieldLabel}>
            <span style={labelText}>Precio Actual del Subyacente *</span>
            <input
              type="number" step={0.01} min={0}
              value={params.currentPrice || ""}
              placeholder="Ej. 450.00"
              onChange={(e) => set("currentPrice", Number(e.target.value))}
            />
          </label>

          <label style={fieldLabel}>
            <span style={labelText}>Volatilidad Implícita (IV %)</span>
            <input
              type="number" step={0.5} min={0} max={200}
              value={params.iv !== undefined ? (params.iv * 100).toFixed(1) : ""}
              placeholder="Ej. 25.0"
              onChange={(e) => set("iv", Number(e.target.value) / 100)}
            />
          </label>

          <label style={fieldLabel}>
            <span style={labelText}>Días al Vencimiento (DTE)</span>
            <input
              type="number" step={1} min={1}
              value={params.dte ?? ""}
              placeholder="Ej. 30"
              onChange={(e) => set("dte", Number(e.target.value))}
            />
          </label>

          {NEEDS_PUT_STRIKE.has(estrategia) && (
            <label style={fieldLabel}>
              <span style={labelText}>Strike Put</span>
              <input
                type="number" step={0.5} min={0}
                value={params.putStrikePrice ?? ""}
                placeholder="Ej. 440.00"
                onChange={(e) => set("putStrikePrice", Number(e.target.value))}
              />
            </label>
          )}

          {NEEDS_CALL_STRIKE.has(estrategia) && (
            <label style={fieldLabel}>
              <span style={labelText}>Strike Call</span>
              <input
                type="number" step={0.5} min={0}
                value={params.callStrikePrice ?? ""}
                placeholder="Ej. 460.00"
                onChange={(e) => set("callStrikePrice", Number(e.target.value))}
              />
            </label>
          )}

          <label style={fieldLabel}>
            <span style={labelText}>Tolerancia al Riesgo (%)</span>
            <input
              type="number" step={0.1} min={0} max={100}
              value={params.riskTolerancePct !== undefined ? (params.riskTolerancePct * 100).toFixed(1) : ""}
              placeholder="Ej. 5.0"
              onChange={(e) => set("riskTolerancePct", Number(e.target.value) / 100)}
            />
          </label>

          <label style={fieldLabel}>
            <span style={labelText}>Capital disponible ($)</span>
            <input
              type="number" step={100} min={0}
              value={params.capital ?? ""}
              placeholder="Ej. 10000"
              onChange={(e) => set("capital", Number(e.target.value))}
            />
          </label>

          {NEEDS_SHARES.has(estrategia) && (
            <label style={fieldLabel}>
              <span style={labelText}>Acciones en posesión</span>
              <input
                type="number" step={1} min={1}
                value={params.shares ?? ""}
                placeholder="Ej. 100"
                onChange={(e) => set("shares", Number(e.target.value))}
              />
            </label>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-md)" }}>
          <button
            onClick={onClose}
            style={{ background: "var(--color-accent)", color: "#000", border: "none", borderRadius: "var(--radius-sm)", padding: "0.5rem 1.5rem", cursor: "pointer", fontWeight: "var(--font-weight-bold)" }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoverageParamsModal;
