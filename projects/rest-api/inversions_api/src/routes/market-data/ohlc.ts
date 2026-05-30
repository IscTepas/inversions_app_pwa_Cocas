// FIC: OHLC route — triple fallback: Tradier history → Yahoo v8 chart → deterministic mock. (EN)
// FIC: Ruta OHLC — triple fallback: historial Tradier → chart Yahoo v8 → mock determinista. (ES)

import { Router } from "express";
import { isTradierConfigured, tradierGet } from "../../modules/market/tradierClient";
import { fetchYahooOhlc, type OhlcCandle } from "../../modules/institutional/yahooChartParser";

export const marketDataOhlcRouter = Router();

// FIC: Tradier history day shape. (EN)
interface TradierHistoryDay {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradierHistoryResponse {
  history: {
    day: TradierHistoryDay | TradierHistoryDay[];
  } | null;
}

// FIC: Map timeframe to Tradier interval param and lookback start date. (EN)
// FIC: Mapea timeframe al parámetro interval de Tradier y fecha de inicio. (ES)
function timeframeToTradierParams(timeframe: string, startDateIso?: string): { interval: string; start: string } {
  const now = new Date();
  const ago = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  // If caller provides a startDate, use it directly (clamped to Tradier max per interval)
  if (startDateIso) {
    const start = startDateIso.slice(0, 10);
    switch (timeframe) {
      case "1w": return { interval: "weekly",  start };
      case "1M": return { interval: "monthly", start };
      default:   return { interval: "daily",   start };
    }
  }
  switch (timeframe) {
    case "1w":  return { interval: "weekly",  start: ago(365 * 10) };
    case "1M":  return { interval: "monthly", start: ago(365 * 20) };
    default:    return { interval: "daily",   start: ago(365 * 5) }; // 5 years for daily
  }
}

// FIC: Generate deterministic mock candles — existing behaviour, always succeeds. (EN)
// FIC: Genera velas mock deterministas — comportamiento existente, siempre funciona. (ES)
function mockCandles(symbol: string, timeframe: string): OhlcCandle[] {
  const intervalMs: Record<string, number> = {
    "1m": 60_000, "5m": 300_000, "15m": 900_000,
    "1h": 3_600_000, "4h": 14_400_000,
    "1w": 604_800_000, "1M": 2_592_000_000,
  };
  const step = intervalMs[timeframe] ?? 86_400_000;
  const now = Date.now();
  return Array.from({ length: 300 }).map((_, index) => {
    const t = now - (300 - index) * step;
    const base = 100 + Math.sin(index / 12) * 8 + (symbol.charCodeAt(0) % 7);
    const open  = Number((base + Math.sin(index / 3)).toFixed(2));
    const close = Number((base + Math.cos(index / 4)).toFixed(2));
    const high  = Number((Math.max(open, close) + 0.8).toFixed(2));
    const low   = Number((Math.min(open, close) - 0.8).toFixed(2));
    return { time: Math.floor(t / 1000), open, high, low, close, volume: Math.round(1000 + Math.abs(Math.sin(index)) * 3000) };
  });
}

// FIC: Fetch real OHLC from Tradier history endpoint — returns null on any failure. (EN)
// FIC: Obtiene OHLC real del endpoint de historial Tradier — retorna null en cualquier fallo. (ES)
async function fetchFromTradier(symbol: string, timeframe: string, startDateIso?: string): Promise<OhlcCandle[] | null> {
  try {
    const { interval, start } = timeframeToTradierParams(timeframe, startDateIso);
    const data = await tradierGet<TradierHistoryResponse>("/markets/history", {
      symbol,
      interval,
      start,
    });

    const raw = data?.history?.day;
    if (!raw) return null;

    const days: TradierHistoryDay[] = Array.isArray(raw) ? raw : [raw];
    const candles: OhlcCandle[] = days
      .filter((d) => d.open != null && d.close != null)
      .map((d) => ({
        time: Math.floor(new Date(d.date).getTime() / 1000),
        open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
      }));

    return candles.length >= 2 ? candles : null;
  } catch {
    return null;
  }
}

marketDataOhlcRouter.get("/ohlc", async (req, res) => {
  const symbol      = String(req.query.symbol    ?? "SPY").toUpperCase();
  const timeframe   = String(req.query.timeframe ?? "1d");
  const startDate   = req.query.startDate ? String(req.query.startDate) : undefined;

  let candles: OhlcCandle[] | null = null;
  let source: "tradier" | "yahoo" | "mock" = "mock";

  // FIC: Source 1 — Tradier history (only when TRADIER_API_KEY is configured). (EN)
  // FIC: Fuente 1 — historial Tradier (solo si TRADIER_API_KEY está configurado). (ES)
  if (isTradierConfigured()) {
    candles = await fetchFromTradier(symbol, timeframe, startDate);
    if (candles) source = "tradier";
  }

  // FIC: Source 2 — Yahoo Finance v8 chart (no auth required, real data). (EN)
  // FIC: Fuente 2 — chart Yahoo Finance v8 (sin auth, datos reales). (ES)
  if (!candles) {
    candles = await fetchYahooOhlc(symbol, timeframe, globalThis.fetch, startDate).catch(() => null);
    if (candles) source = "yahoo";
  }

  // FIC: Source 3 — deterministic mock (always succeeds, never breaks SuperChart). (EN)
  // FIC: Fuente 3 — mock determinista (siempre funciona, nunca rompe SuperChart). (ES)
  if (!candles) {
    candles = mockCandles(symbol, timeframe);
    source = "mock";
  }

  res.status(200).json({ symbol, timeframe, candles, source });
});
