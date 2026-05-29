// FIC: Simulation control panel — Revolut tokens applied, logic unchanged.
// FIC: Panel de control de simulación — tokens Revolut aplicados, lógica sin cambios.

import React, { useState } from "react";
import {
  runSimulation,
  ALL_CORES,
  ALL_SUBCORES,
  type CoreId,
  type SubCoreIndicador,
  type SimulationRequestPayload,
  type SimulationResponse
} from "../../../services/signals/confluenceTableApi";
import { StrategySelector } from "./StrategySelector";
import { RiskToleranceToggle } from "./RiskToleranceToggle";
import { ExecuteSimulationButton } from "./ExecuteSimulationButton";

interface Props {
  ticket: string;
  onResult: (result: SimulationResponse) => void;
  onStrategyChange?: (strategy: string) => void;
}

type Preset = "2A" | "1A" | "6M" | "3M" | "1M";
const PRESETS: Preset[] = ["2A", "1A", "6M", "3M", "1M"];
const TIMEFRAMES: Array<"1m" | "5m" | "15m" | "1h" | "4h" | "1d"> = ["1m", "5m", "15m", "1h", "4h", "1d"];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function isTermStrategy(strategy: string) {
  return strategy === "CALENDAR_SPREAD" || strategy === "DIAGONAL_SPREAD";
}

interface TermApiParams {
  optionStyle: "call" | "put";
  strike: string;
  strikeShort: string;
  strikeLong: string;
  expirationShort: string;
  expirationLong: string;
  premiumShort: string;
  premiumLong: string;
  contracts: string;
  riskFreeRate: string;
}

function termEndpointFor(strategy: string, optionStyle: "call" | "put") {
  if (strategy === "CALENDAR_SPREAD") {
    return `/api/v1/strategies/term/calendar/${optionStyle}`;
  }
  if (strategy === "DIAGONAL_SPREAD") {
    return `/api/v1/strategies/term/diagonal/${optionStyle}`;
  }
  return "/api/simulation/run";
}

export function SimulationControlPanel({ ticket, onResult, onStrategyChange }: Props) {
  const [preset, setPreset] = useState<Preset>("3M");
  const [estrategiaFrom, setEstrategiaFrom] = useState(isoToday());
  const [estrategiaTo, setEstrategiaTo] = useState(isoPlusDays(30));
  const [temporalidad, setTemporalidad] = useState<"1m" | "5m" | "15m" | "1h" | "4h" | "1d">("1h");
  const [estrategia, setEstrategia] = useState("CALENDAR_SPREAD");
  const [paramsOpen, setParamsOpen] = useState(false);
  const [termParams, setTermParams] = useState<TermApiParams>({
    optionStyle: "call",
    strike: "100",
    strikeShort: "95",
    strikeLong: "105",
    expirationShort: isoPlusDays(23),
    expirationLong: isoPlusDays(113),
    premiumShort: "2.50",
    premiumLong: "5.00",
    contracts: "1",
    riskFreeRate: "0.05"
  });
  const [tolerancia, setTolerancia] = useState<"BAJO" | "MEDIO" | "ALTO">("MEDIO");
  const [coresOn, setCoresOn] = useState<Record<CoreId, boolean>>(
    ALL_CORES.reduce((acc, c) => ({ ...acc, [c]: true }), {} as Record<CoreId, boolean>)
  );
  const [indicadoresOn, setIndicadoresOn] = useState<Record<SubCoreIndicador, boolean>>(
    ALL_SUBCORES.reduce((acc, s) => ({ ...acc, [s]: true }), {} as Record<SubCoreIndicador, boolean>)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCore = (c: CoreId) => setCoresOn((prev) => ({ ...prev, [c]: !prev[c] }));
  const toggleSub = (s: SubCoreIndicador) => setIndicadoresOn((prev) => ({ ...prev, [s]: !prev[s] }));
  const handleStrategyChange = (next: string) => {
    setEstrategia(next);
    onStrategyChange?.(next);
    if (isTermStrategy(next)) setParamsOpen(true);
  };
  const updateTermParam = (key: keyof TermApiParams, value: string) => {
    setTermParams((prev) => ({ ...prev, [key]: value }));
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: SimulationRequestPayload = {
        ticket,
        rangoHistorico: preset,
        rangoEstrategia: { from: estrategiaFrom, to: estrategiaTo },
        temporalidad,
        runtimeMode: "OFFLINE",
        coresHabilitados: ALL_CORES.filter((c) => coresOn[c]),
        indicadoresHabilitados: ALL_SUBCORES.filter((s) => indicadoresOn[s]),
        estrategia,
        toleranciaRiesgo: tolerancia
      };
      const result = await runSimulation(payload);
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "simulation_failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldsetStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--space-sm) var(--space-md)"
  };

  const legendStyle: React.CSSProperties = {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    fontWeight: "var(--font-weight-emphasis)",
    letterSpacing: "0.06em"
  };

  return (
    <section className="card" style={{ display: "grid", gap: "var(--space-md)" }}>
      <h2 style={{ margin: 0 }}>Panel de Control · Simulacion</h2>

      <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
          <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Rango Historico</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            {PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
          <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Estrategia Desde</span>
          <input type="date" value={estrategiaFrom} onChange={(e) => setEstrategiaFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
          <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Estrategia Hasta</span>
          <input type="date" value={estrategiaTo} onChange={(e) => setEstrategiaTo(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
          <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Temporalidad</span>
          <select value={temporalidad} onChange={(e) => setTemporalidad(e.target.value as typeof temporalidad)}>
            {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <StrategySelector value={estrategia} onChange={handleStrategyChange} />
        <RiskToleranceToggle value={tolerancia} onChange={setTolerancia} />
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--space-sm)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--color-surface-raised)"
      }}>
        <div>
          <strong style={{ fontSize: "var(--font-size-sm)" }}>Estrategia activa: {estrategia.replace(/_/g, " ")}</strong>
          <p style={{ margin: "0.15rem 0 0", fontSize: "var(--font-size-xs)" }}>
            {isTermStrategy(estrategia)
              ? "TEAM-09: validar parametros Calendar/Diagonal antes de ejecutar."
              : "Estrategia canonica general de simulacion."}
          </p>
        </div>
        <button className="btn-ghost" type="button" onClick={() => setParamsOpen(true)}>
          ☰ Parametros API
        </button>
      </div>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Cores (SI/NO)</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
          {ALL_CORES.map((c) => (
            <label key={c} style={{ display: "flex", gap: "0.3rem", alignItems: "center", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
              <input type="checkbox" checked={coresOn[c]} onChange={() => toggleCore(c)} style={{ accentColor: "var(--color-accent)" }} />
              <span style={{ color: coresOn[c] ? "var(--color-text)" : "var(--color-text-muted)" }}>{c}:</span>
              <strong style={{ color: coresOn[c] ? "var(--color-buy)" : "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                {coresOn[c] ? "SI" : "NO"}
              </strong>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Indicadores (SI/NO)</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
          {ALL_SUBCORES.map((s) => (
            <label key={s} style={{ display: "flex", gap: "0.3rem", alignItems: "center", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
              <input type="checkbox" checked={indicadoresOn[s]} onChange={() => toggleSub(s)} style={{ accentColor: "var(--color-accent)" }} />
              <span style={{ color: indicadoresOn[s] ? "var(--color-text)" : "var(--color-text-muted)" }}>{s}:</span>
              <strong style={{ color: indicadoresOn[s] ? "var(--color-buy)" : "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                {indicadoresOn[s] ? "SI" : "NO"}
              </strong>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <div style={{ color: "var(--color-sell)", fontSize: "var(--font-size-sm)" }}>Error: {error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ExecuteSimulationButton loading={loading} onClick={run} />
      </div>

      {paramsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.56)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-md)"
          }}
          onClick={() => setParamsOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "88vh",
              overflowY: "auto"
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <div>
                <h2 style={{ margin: 0 }}>Parametros API TEAM-09</h2>
                <p style={{ marginTop: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                  {estrategia.replace(/_/g, " ")} · {termParams.optionStyle.toUpperCase()}
                </p>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setParamsOpen(false)}>Cerrar</button>
            </div>

            {isTermStrategy(estrategia) ? (
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                <div style={{ border: "1px solid var(--color-accent)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm)", background: "var(--color-accent-subtle)" }}>
                  <strong>Endpoint usado por TEAM-09</strong>
                  <p style={{ marginTop: "0.35rem", fontSize: "var(--font-size-sm)" }}>
                    <code>{termEndpointFor(estrategia, termParams.optionStyle)}</code>
                  </p>
                </div>

                <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Tipo</span>
                    <select value={termParams.optionStyle} onChange={(e) => updateTermParam("optionStyle", e.target.value as "call" | "put")}>
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                    </select>
                  </label>

                  {estrategia === "CALENDAR_SPREAD" ? (
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                      <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Strike comun</span>
                      <input value={termParams.strike} onChange={(e) => updateTermParam("strike", e.target.value)} />
                    </label>
                  ) : (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                        <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Strike corto</span>
                        <input value={termParams.strikeShort} onChange={(e) => updateTermParam("strikeShort", e.target.value)} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                        <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Strike largo</span>
                        <input value={termParams.strikeLong} onChange={(e) => updateTermParam("strikeLong", e.target.value)} />
                      </label>
                    </>
                  )}

                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Expiracion corta</span>
                    <input type="date" value={termParams.expirationShort} onChange={(e) => updateTermParam("expirationShort", e.target.value)} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Expiracion larga</span>
                    <input type="date" value={termParams.expirationLong} onChange={(e) => updateTermParam("expirationLong", e.target.value)} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Prima corta</span>
                    <input value={termParams.premiumShort} onChange={(e) => updateTermParam("premiumShort", e.target.value)} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Prima larga</span>
                    <input value={termParams.premiumLong} onChange={(e) => updateTermParam("premiumLong", e.target.value)} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Contratos</span>
                    <input value={termParams.contracts} onChange={(e) => updateTermParam("contracts", e.target.value)} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase" }}>Risk free rate</span>
                    <input value={termParams.riskFreeRate} onChange={(e) => updateTermParam("riskFreeRate", e.target.value)} />
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
                  <button className="btn-ghost" type="button" onClick={() => setParamsOpen(false)}>Cancelar</button>
                  <button className="btn-primary" type="button" onClick={() => setParamsOpen(false)}>Guardar parametros</button>
                </div>
              </div>
            ) : (
              <p>Esta estrategia usa el flujo canonico de simulacion general y no requiere parametros term adicionales.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default SimulationControlPanel;
