// FIC: Coverage strategy adapter — maps contracts to engine params and results to API responses. (EN)
// FIC: Adaptador de estrategias de cobertura — mapea contratos a parámetros de engine y resultados a respuestas API. (ES)

import type { CoverageStrategyContract, CoverageStrategyResult } from "./coverageStrategyContract";
import { estimateOptionPremium } from "./coverageTypes";

export type ConfidenceLevel = "ALTA" | "MEDIA" | "BAJA";

export interface AdaptedStrategyResponse {
  strategyId: string;
  kind: string;
  ticker: string;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  summary: {
    maxProfit: number | "∞";
    maxLoss: number;
    breakEvenPrice: number;
    stopLossPrice: number;
    netPremium: number;
    riskProfile: string;
  };
  alerts: CoverageStrategyResult["alerts"];
  payoffPoints: CoverageStrategyResult["payoffPoints"];
  generatedAt: string;
}

// FIC: Confidence score: 40% protection quality + 30% cost efficiency + 30% risk score. (EN)
// FIC: Score de confianza: 40% calidad de protección + 30% eficiencia de costo + 30% score de riesgo. (ES)
function computeAdapterConfidenceScore(result: CoverageStrategyResult): number {
  const rm = result.riskMetrics;
  const positionValue = result.underlyingPrice * result.shares;

  const protectionScore = positionValue > 0
    ? Math.min(rm.maxProtection / positionValue, 1)
    : 0;

  const costEfficiencyScore = rm.netPremium !== 0 && result.maxLoss > 0
    ? Math.min(1, result.maxLoss / Math.abs(rm.netPremium) / 10)
    : 0.5;

  const riskScore = 1 - Math.min(rm.exerciseRiskScore, 1);

  return parseFloat((0.40 * protectionScore + 0.30 * costEfficiencyScore + 0.30 * riskScore).toFixed(3));
}

// FIC: Map numeric score to human-readable confidence level. (EN)
// FIC: Mapea score numérico a nivel de confianza legible por humanos. (ES)
function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 0.70) return "ALTA";
  if (score >= 0.40) return "MEDIA";
  return "BAJA";
}

// FIC: Build a CoverageStrategyContract from common parameters — used by the analyze route. (EN)
// FIC: Construye un CoverageStrategyContract desde parámetros comunes — usado por la ruta de análisis. (ES)
export function adaptContractToEngine(params: {
  kind: CoverageStrategyContract["kind"];
  ticker: string;
  underlyingPrice: number;
  shares: number;
  putStrikePrice?: number;
  callStrikePrice?: number;
  capital?: number;
  riskTolerancePct?: number;
  iv?: number;
  dte?: number;
}): CoverageStrategyContract {
  const {
    kind, ticker, underlyingPrice, shares,
    putStrikePrice = underlyingPrice * 0.95,
    callStrikePrice = underlyingPrice * 1.05,
    capital = underlyingPrice * shares,
    riskTolerancePct = 0.05,
    iv = 0.25,
    dte = 90,
  } = params;

  const putPremium = estimateOptionPremium("put", putStrikePrice, iv, dte, underlyingPrice);
  const callPremium = estimateOptionPremium("call", callStrikePrice, iv, dte, underlyingPrice);
  const expiry = new Date(Date.now() + dte * 86_400_000).toISOString().slice(0, 10);

  const legs: CoverageStrategyContract["legs"] = [];

  if (kind === "protective_put" || kind === "married_put") {
    legs.push({ type: "put", position: "long", strike: putStrikePrice, premium: putPremium, expiry });
  } else if (kind === "collar_put") {
    legs.push({ type: "put", position: "long", strike: putStrikePrice, premium: putPremium, expiry });
    legs.push({ type: "call", position: "short", strike: callStrikePrice, premium: callPremium, expiry });
  } else if (kind === "covered_straddle") {
    legs.push({ type: "put", position: "short", strike: putStrikePrice, premium: putPremium, expiry });
    legs.push({ type: "call", position: "short", strike: callStrikePrice, premium: callPremium, expiry });
  }

  return {
    strategyId: `${kind}-${ticker}-${Date.now()}`,
    kind,
    ticker,
    shares,
    underlyingPrice,
    legs,
    capital,
    riskTolerancePct,
    requestedAt: new Date().toISOString(),
  };
}

// FIC: Map a CoverageStrategyResult to the API response shape with confidence level. (EN)
// FIC: Mapea un CoverageStrategyResult a la forma de respuesta API con nivel de confianza. (ES)
export function adaptResultToResponse(result: CoverageStrategyResult): AdaptedStrategyResponse {
  const confidenceScore = computeAdapterConfidenceScore(result);
  const rm = result.riskMetrics;

  return {
    strategyId: result.strategyId,
    kind: result.kind,
    ticker: result.ticker,
    confidenceScore,
    confidenceLevel: scoreToLevel(confidenceScore),
    summary: {
      maxProfit: result.maxProfit === Infinity ? "∞" : result.maxProfit,
      maxLoss: result.maxLoss,
      breakEvenPrice: rm.breakEvenPrice,
      stopLossPrice: rm.stopLossPrice,
      netPremium: rm.netPremium,
      riskProfile: rm.riskProfile,
    },
    alerts: result.alerts,
    payoffPoints: result.payoffPoints,
    generatedAt: result.generatedAt,
  };
}
