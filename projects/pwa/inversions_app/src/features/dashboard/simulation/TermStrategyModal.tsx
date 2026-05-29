import React from "react";

export interface TermStrategyParams {
  optionStyle: "CALL" | "PUT";
  strikeShort: number;
  strikeLong: number;
  expirationShort: string;
  expirationLong: string;
  premiumShort: number;
  premiumLong: number;
  contracts: number;
  riskFreeRate: number;
}

interface Props {
  open: boolean;
  estrategia: string;
  params: TermStrategyParams;
  onChange: (params: TermStrategyParams) => void;
  onClose: () => void;
}

export function TermStrategyModal({ open, estrategia, params, onChange, onClose }: Props) {
  if (!open) return null;

  const set = (field: keyof TermStrategyParams, value: string | number) =>
    onChange({ ...params, [field]: value });

  const fieldLabel: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)"
  };
  const labelText: React.CSSProperties = {
    color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase"
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", zIndex: 45, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-lg)", width: "min(540px, 94vw)", maxHeight: "90vh", overflow: "auto", border: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
            Parámetros — {estrategia.replace(/_/g, " ")}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.2rem", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label style={fieldLabel}>
            <span style={labelText}>Tipo de Opción</span>
            <select value={params.optionStyle} onChange={(e) => set("optionStyle", e.target.value as "CALL" | "PUT")}>
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
          <label style={fieldLabel}>
            <span style={labelText}>Contratos</span>
            <input type="number" min={1} value={params.contracts} onChange={(e) => set("contracts", Number(e.target.value))} />
          </label>
          <label style={fieldLabel}>
            <span style={labelText}>Tasa Libre de Riesgo (%)</span>
            <input
              type="number" step={0.01} min={0}
              value={(params.riskFreeRate * 100).toFixed(2)}
              onChange={(e) => set("riskFreeRate", Number(e.target.value) / 100)}
            />
          </label>
        </div>

        <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm) var(--space-md)", marginTop: "var(--space-md)" }}>
          <legend style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ala Corta (Short Leg)
          </legend>
          <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: "var(--space-xs)" }}>
            <label style={fieldLabel}>
              <span style={labelText}>Strike</span>
              <input type="number" step={0.5} min={0} value={params.strikeShort} onChange={(e) => set("strikeShort", Number(e.target.value))} />
            </label>
            <label style={fieldLabel}>
              <span style={labelText}>Vencimiento</span>
              <input type="date" value={params.expirationShort} onChange={(e) => set("expirationShort", e.target.value)} />
            </label>
            <label style={fieldLabel}>
              <span style={labelText}>Premium</span>
              <input type="number" step={0.01} min={0} value={params.premiumShort} onChange={(e) => set("premiumShort", Number(e.target.value))} />
            </label>
          </div>
        </fieldset>

        <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm) var(--space-md)", marginTop: "var(--space-sm)" }}>
          <legend style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ala Larga (Long Leg)
          </legend>
          <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: "var(--space-xs)" }}>
            <label style={fieldLabel}>
              <span style={labelText}>Strike</span>
              <input type="number" step={0.5} min={0} value={params.strikeLong} onChange={(e) => set("strikeLong", Number(e.target.value))} />
            </label>
            <label style={fieldLabel}>
              <span style={labelText}>Vencimiento</span>
              <input type="date" value={params.expirationLong} onChange={(e) => set("expirationLong", e.target.value)} />
            </label>
            <label style={fieldLabel}>
              <span style={labelText}>Premium</span>
              <input type="number" step={0.01} min={0} value={params.premiumLong} onChange={(e) => set("premiumLong", Number(e.target.value))} />
            </label>
          </div>
        </fieldset>

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

export default TermStrategyModal;
