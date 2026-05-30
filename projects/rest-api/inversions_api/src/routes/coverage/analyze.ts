// FIC: Coverage analyze route — runs 4 coverage strategies with real option chain data. (EN)
// FIC: Ruta de análisis de cobertura — ejecuta 4 estrategias con datos reales de la cadena de opciones. (ES)

import { Router, type Request, type Response } from "express";
import { authContextMiddleware } from "../../middleware/authContext";
import { adaptContractToEngine, adaptResultToResponse, type InstitutionalContext } from "../../modules/strategies/coverage/coverageStrategyAdapter";
import { CoverageSimulationEngine } from "../../modules/strategies/coverage/coverageSimulationEngine";
import type { CoverageStrategyContract } from "../../modules/strategies/coverage/coverageStrategyContract";
import { resolveOptionContext } from "../../modules/market/optionChainService";

export const coverageAnalyzeRouter = Router();

const ALLOWED_ROLES = new Set(["analyst", "risk_manager", "trader", "admin"]);

// FIC: Build all 4 coverage strategy contracts from resolved parameters. (EN)
// FIC: Construye los 4 contratos de estrategia de cobertura desde parámetros resueltos. (ES)
function buildContracts(params: {
  ticker: string;
  currentPrice: number;
  shares: number;
  capital: number;
  riskTolerancePct: number;
  putStrikePrice: number;
  callStrikePrice: number;
  iv: number;
  dte: number;
  putPremiumOverride: number | null;
  callPremiumOverride: number | null;
}): CoverageStrategyContract[] {
  const kinds: CoverageStrategyContract["kind"][] = [
    "protective_put",
    "married_put",
    "collar_put",
    "covered_straddle",
  ];

  return kinds.map((kind) =>
    adaptContractToEngine({
      kind,
      ticker:           params.ticker,
      underlyingPrice:  params.currentPrice,
      shares:           params.shares,
      capital:          params.capital,
      riskTolerancePct: params.riskTolerancePct,
      putStrikePrice:   params.putStrikePrice,
      callStrikePrice:  params.callStrikePrice,
      iv:               params.iv,
      dte:              params.dte,
      putPremiumOverride:  params.putPremiumOverride,
      callPremiumOverride: params.callPremiumOverride,
    })
  );
}

// FIC: POST /api/coverage/analyze — run all 4 strategies with real option chain data. (EN)
// FIC: POST /api/coverage/analyze — ejecuta las 4 estrategias con datos reales de la cadena de opciones. (ES)
// When putPremium / callPremium / iv are missing from the body, the route auto-fetches real option
// context from CBOE → Tradier → Yahoo Finance before building the contracts.
coverageAnalyzeRouter.post(
  "/analyze",
  authContextMiddleware,
  async (req: Request, res: Response) => {
    const role = req.authContext?.role ?? "";
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ code: "FORBIDDEN_ROLE" });
    }

    const body = req.body as Record<string, unknown>;
    const ticker = body.ticker !== undefined ? String(body.ticker).toUpperCase().trim() : null;
    const shares = body.shares !== undefined ? Number(body.shares) : null;

    if (!ticker || ticker.length === 0) {
      return res.status(400).json({ code: "INVALID_TICKER" });
    }
    if (shares !== null && (!isFinite(shares) || shares <= 0)) {
      return res.status(400).json({ code: "INVALID_SHARES" });
    }

    // ── Resolve market params — prefer body values, auto-fetch from chain when missing ──────────
    let currentPrice = body.currentPrice != null ? Number(body.currentPrice) : 0;
    let putPremiumOverride:  number | null = body.putPremium  != null ? Number(body.putPremium)  : null;
    let callPremiumOverride: number | null = body.callPremium != null ? Number(body.callPremium) : null;
    let iv  = body.iv  != null ? Number(body.iv)  : 0;
    let dte = body.dte != null ? Number(body.dte) : 0;

    const needsChainData =
      currentPrice <= 0 || putPremiumOverride == null || callPremiumOverride == null || iv <= 0;

    if (needsChainData) {
      const putStrikeGuess  = body.putStrikePrice  != null ? Number(body.putStrikePrice)  : currentPrice * 0.95 || 1;
      const callStrikeGuess = body.callStrikePrice != null ? Number(body.callStrikePrice) : currentPrice * 1.05 || 1;
      const targetDte = dte > 0 ? dte : 45;

      const ctx = await resolveOptionContext(ticker, putStrikeGuess, callStrikeGuess, targetDte);

      if (ctx) {
        if (currentPrice <= 0) currentPrice = ctx.underlyingPrice;
        if (putPremiumOverride  == null) putPremiumOverride  = ctx.putPremium;
        if (callPremiumOverride == null) callPremiumOverride = ctx.callPremium;
        if (iv  <= 0) iv  = ctx.iv;
        if (dte <= 0) dte = ctx.dte;
      }
    }

    // Fall through to safe defaults only if chain resolution also failed
    if (currentPrice <= 0) {
      return res.status(422).json({ code: "PRICE_UNAVAILABLE", message: "No se pudo obtener el precio del instrumento. Intenta de nuevo." });
    }
    if (iv  <= 0) iv  = 0.25;
    if (dte <= 0) dte = 45;

    const resolvedShares       = shares ?? 100;
    const riskTolerancePct     = body.riskTolerancePct != null ? Number(body.riskTolerancePct) : 0.05;
    const putStrikePrice       = body.putStrikePrice   != null ? Number(body.putStrikePrice)   : currentPrice * 0.95;
    const callStrikePrice      = body.callStrikePrice  != null ? Number(body.callStrikePrice)  : currentPrice * 1.05;
    const capital              = body.capital          != null ? Number(body.capital)          : currentPrice * resolvedShares;
    const institutionalContext = body.institutionalContext as InstitutionalContext | undefined;

    const simulationEngine = new CoverageSimulationEngine();
    const contracts = buildContracts({
      ticker,
      currentPrice,
      shares: resolvedShares,
      capital,
      riskTolerancePct,
      putStrikePrice,
      callStrikePrice,
      iv,
      dte,
      putPremiumOverride,
      callPremiumOverride,
    });

    const settled = await Promise.allSettled(
      contracts.map((contract) => simulationEngine.analyze(contract))
    );

    const results = settled
      .filter((s): s is PromiseFulfilledResult<Awaited<ReturnType<typeof simulationEngine.analyze>>> => s.status === "fulfilled")
      .map((s) => adaptResultToResponse(s.value.strategyResult, institutionalContext));

    return res.status(200).json({
      results,
      generatedAt: new Date().toISOString(),
    });
  }
);
