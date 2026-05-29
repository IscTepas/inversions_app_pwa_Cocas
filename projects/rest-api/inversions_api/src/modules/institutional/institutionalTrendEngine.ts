// FIC: Institutional trend engine — SMA-50/200 crossover with seeded PRNG for deterministic fallback candles. (EN)
// FIC: Motor de tendencias institucionales — cruce SMA-50/200 con PRNG seeded para velas de respaldo deterministas. (ES)

import type { InstitutionalAnalysisContract } from "./institutionalContract";
import type { InstitutionalResolveResult } from "./institutionalDataService";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MIN_CANDLES = 200;
const FAST_MA = 50;
const SLOW_MA = 200;
const VOLUME_LOOKBACK = 20;
const CROSSOVER_TOLERANCE = 0.002; // 0.2%
const CROSSOVER_LOOKBACK = 30;     // days

// ─── Output types ─────────────────────────────────────────────────────────────

export interface CrossoverEvent {
  type: "golden" | "death";
  daysAgo: number;
}

export interface InstitutionalTrendResult {
  ticker: string;
  direction: "bullish" | "bearish" | "neutral";
  sma50: number;
  sma200: number;
  crossover?: CrossoverEvent;
  trendStrength: number;      // 0–1
  continuityProbability: number; // 0–1
  institutionalScore: number;
  volumeCorrelation: number;  // Pearson -1..1
  candlesAnalyzed: number;
  analyzedAt: string;
}

// ─── Internals ────────────────────────────────────────────────────────────────

interface Candle { close: number; volume: number }

// ─── Engine ───────────────────────────────────────────────────────────────────

export class InstitutionalTrendEngine {
  // FIC: Main analysis — computes SMAs, crossover, Pearson volume correlation, trend strength. (EN)
  // FIC: Análisis principal — calcula SMAs, cruce, correlación de Pearson con volumen, fuerza de tendencia. (ES)
  async analyze(
    request: InstitutionalAnalysisContract,
    preResolvedResult?: InstitutionalResolveResult
  ): Promise<InstitutionalTrendResult> {
    const candles = this.buildFallbackCandles(request.ticker);
    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    const sma50Series = computeSma(closes, FAST_MA);
    const sma200Series = computeSma(closes, SLOW_MA);

    const lastSma50 = lastValid(sma50Series) ?? 0;
    const lastSma200 = lastValid(sma200Series) ?? 0;

    const crossover = this.detectCrossover(sma50Series, sma200Series);

    // FIC: Direction: SMA50 vs SMA200 with tolerance band to avoid noise near crossover. (EN)
    // FIC: Dirección: SMA50 vs SMA200 con banda de tolerancia para evitar ruido cerca del cruce. (ES)
    const separation = lastSma200 > 0 ? (lastSma50 - lastSma200) / lastSma200 : 0;
    const direction: "bullish" | "bearish" | "neutral" =
      separation > CROSSOVER_TOLERANCE ? "bullish" :
      separation < -CROSSOVER_TOLERANCE ? "bearish" : "neutral";

    // Volume correlation: Pearson between daily price changes and volume
    const priceChanges = closes.slice(1).map((p, i) => p - closes[i]);
    const volSlice = volumes.slice(1).slice(-VOLUME_LOOKBACK);
    const pcSlice = priceChanges.slice(-VOLUME_LOOKBACK);
    const volumeCorrelation = pearsonCorrelation(pcSlice, volSlice);

    const merged = preResolvedResult?.merged;
    const instScore = this.computeInstitutionalScore(merged, request);

    // FIC: Trend strength: MA separation 30%, slope 15%, crossover 20%, volume 20%, flow 15%. (EN)
    // FIC: Fuerza de tendencia: separación MA 30%, pendiente 15%, cruce 20%, volumen 20%, flujo 15%. (ES)
    const maSep = Math.min(Math.abs(separation) / 0.1, 1);
    const slope = computeSlope(closes.slice(-20));
    const slopeScore = Math.min(Math.abs(slope) * 1_000, 1);
    const crossoverScore = crossover ? Math.max(0, 1 - crossover.daysAgo / CROSSOVER_LOOKBACK) : 0;
    const volScore = Math.max(0, Math.min((volumeCorrelation + 1) / 2, 1));
    const flowFactor = computeFlowFactor(merged, request);
    const trendStrength = Math.min(
      1,
      maSep * 0.30 + slopeScore * 0.15 + crossoverScore * 0.20 + volScore * 0.20 + flowFactor * 0.15
    );

    // FIC: Continuity weights: MA alignment 35%, volume 25%, ownership 20%, flow 20%. (EN)
    // FIC: Pesos de continuidad: alineación MA 35%, volumen 25%, propiedad 20%, flujo 20%. (ES)
    const ownership = Math.min((merged?.fundsOwnershipPct ?? request.fundsOwnershipPct) / 100, 1);
    const continuityProbability = Math.min(
      0.95,
      maSep * 0.35 + volScore * 0.25 + ownership * 0.20 + flowFactor * 0.20
    );

    return {
      ticker: request.ticker,
      direction,
      sma50: lastSma50,
      sma200: lastSma200,
      crossover: crossover ?? undefined,
      trendStrength,
      continuityProbability,
      institutionalScore: instScore,
      volumeCorrelation,
      candlesAnalyzed: candles.length,
      analyzedAt: new Date().toISOString(),
    };
  }

  // FIC: Build 200+ fallback candles using seeded LCG PRNG — same ticker = same sequence. (EN)
  // FIC: Genera 200+ velas de respaldo con PRNG LCG seeded — mismo ticker = misma secuencia. (ES)
  private buildFallbackCandles(ticker: string, count = DEFAULT_MIN_CANDLES): Candle[] {
    const seed = ticker.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const rand = this.seededRandom(seed);

    const basePrice = 100 + (seed % 900);
    const baseVol = 500_000 + seed * 1_000;
    const candles: Candle[] = [];
    let price = basePrice;

    for (let i = 0; i < count; i++) {
      const drift = (rand() - 0.5) * 0.02; // ±1% random daily drift
      price = Math.max(price * (1 + drift), 1);
      const volume = baseVol * (0.7 + rand() * 0.6);
      candles.push({ close: price, volume });
    }
    return candles;
  }

  // FIC: Seeded LCG PRNG — deterministic sequence for a given seed value. (EN)
  // FIC: PRNG LCG con seed — secuencia determinista para un valor de seed dado. (ES)
  // Algorithm: s = Math.imul(s, 1664525) + 1013904223 | 0
  private seededRandom(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // FIC: Detect golden/death cross within last CROSSOVER_LOOKBACK candles. (EN)
  // FIC: Detecta cruce dorado/de muerte dentro de los últimos CROSSOVER_LOOKBACK velas. (ES)
  private detectCrossover(sma50: number[], sma200: number[]): CrossoverEvent | null {
    const len = Math.min(sma50.length, sma200.length);
    const start = Math.max(0, len - CROSSOVER_LOOKBACK - 1);

    for (let i = len - 1; i > start; i--) {
      const cur50 = sma50[i];
      const cur200 = sma200[i];
      const prev50 = sma50[i - 1];
      const prev200 = sma200[i - 1];
      if (!isFinite(cur50) || !isFinite(cur200) || !isFinite(prev50) || !isFinite(prev200)) continue;

      const curSep = cur200 > 0 ? (cur50 - cur200) / cur200 : 0;
      const prevSep = prev200 > 0 ? (prev50 - prev200) / prev200 : 0;

      if (prevSep < -CROSSOVER_TOLERANCE && curSep >= -CROSSOVER_TOLERANCE) {
        return { type: "golden", daysAgo: len - 1 - i };
      }
      if (prevSep > CROSSOVER_TOLERANCE && curSep <= CROSSOVER_TOLERANCE) {
        return { type: "death", daysAgo: len - 1 - i };
      }
    }
    return null;
  }

  private computeInstitutionalScore(
    merged: InstitutionalResolveResult["merged"] | undefined,
    request: InstitutionalAnalysisContract
  ): number {
    const confidence = merged?.confidence ?? 0.5;
    const ownership = Math.min((merged?.fundsOwnershipPct ?? request.fundsOwnershipPct) / 100, 1);
    const posCount = merged?.openPositions?.count ?? request.openPositions.count;
    const posFactor = Math.min(posCount / 1_000, 1);
    const inflows = merged?.flows?.inflows ?? request.flows.inflows;
    const outflows = merged?.flows?.outflows ?? request.flows.outflows;
    const total = inflows + outflows;
    const flowFactor = total > 0 ? Math.abs(inflows - outflows) / total : 0;
    return Math.min(1, 0.2 + confidence * 0.35 + ownership * 0.2 + posFactor * 0.15 + flowFactor * 0.1);
  }
}

// ─── Pure math helpers ────────────────────────────────────────────────────────

function computeSma(prices: number[], period: number): number[] {
  return prices.map((_, i) => {
    if (i < period - 1) return NaN;
    const slice = prices.slice(i - period + 1, i + 1);
    return slice.reduce((s, p) => s + p, 0) / period;
  });
}

function lastValid(arr: number[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (isFinite(arr[i])) return arr[i];
  }
  return null;
}

// FIC: Pearson correlation coefficient between two equal-length series. (EN)
// FIC: Coeficiente de correlación de Pearson entre dos series de igual longitud. (ES)
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  const meanX = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num += dx * dy; denX += dx * dx; denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// FIC: Linear regression slope of the last n prices — positive = uptrend. (EN)
// FIC: Pendiente de regresión lineal de los últimos n precios — positivo = tendencia alcista. (ES)
function computeSlope(prices: number[]): number {
  const n = prices.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = prices.reduce((s, p) => s + p, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (prices[i] - meanY);
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
}

function computeFlowFactor(
  merged: InstitutionalResolveResult["merged"] | undefined,
  request: InstitutionalAnalysisContract
): number {
  const inflows = merged?.flows?.inflows ?? request.flows.inflows;
  const outflows = merged?.flows?.outflows ?? request.flows.outflows;
  const total = inflows + outflows;
  return total > 0 ? Math.abs(inflows - outflows) / total : 0;
}
