// FIC: Coverage simulate route — Monte Carlo for protective_put with real option chain data. (EN)
// FIC: Ruta de simulación de cobertura — Monte Carlo para protective_put con datos reales de la cadena. (ES)

import { Router, type Request, type Response } from "express";
import { authContextMiddleware } from "../../middleware/authContext";
import { adaptContractToEngine } from "../../modules/strategies/coverage/coverageStrategyAdapter";
import { CoverageSimulationEngine } from "../../modules/strategies/coverage/coverageSimulationEngine";
import { resolveOptionContext } from "../../modules/market/optionChainService";

export const coverageSimulateRouter = Router();

const ALLOWED_ROLES = new Set(["analyst", "risk_manager", "trader", "admin"]);

// FIC: POST /api/coverage/simulate — simulate a protective_put with real option chain params. (EN)
// FIC: POST /api/coverage/simulate — simula una protective_put con parámetros reales de la cadena. (ES)
// When iv / currentPrice are missing, auto-fetches real data from CBOE → Tradier → Yahoo.
coverageSimulateRouter.post(
  "/simulate",
  authContextMiddleware,
  async (req: Request, res: Response) => {
    const role = req.authContext?.role ?? "";
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ code: "FORBIDDEN_ROLE" });
    }

    const body = req.body as Record<string, unknown>;
    const ticker = String(body.ticker ?? "SPY").toUpperCase().trim();

    let currentPrice = body.currentPrice != null ? Number(body.currentPrice) : 0;
    let iv  = body.iv  != null ? Number(body.iv)  : 0;
    let dte = body.dte != null ? Number(body.dte) : 0;

    const needsChainData = currentPrice <= 0 || iv <= 0;

    if (needsChainData) {
      const putStrikeGuess  = body.putStrikePrice != null ? Number(body.putStrikePrice) : currentPrice * 0.95 || 1;
      const callStrikeGuess = putStrikeGuess * 1.05;
      const ctx = await resolveOptionContext(ticker, putStrikeGuess, callStrikeGuess, dte > 0 ? dte : 45);
      if (ctx) {
        if (currentPrice <= 0) currentPrice = ctx.underlyingPrice;
        if (iv  <= 0) iv  = ctx.iv;
        if (dte <= 0) dte = ctx.dte;
      }
    }

    if (currentPrice <= 0) {
      return res.status(422).json({ code: "PRICE_UNAVAILABLE", message: "No se pudo obtener el precio del instrumento." });
    }
    if (iv  <= 0) iv  = 0.25;
    if (dte <= 0) dte = 45;

    const shares          = body.shares         != null ? Number(body.shares)         : 100;
    const capital         = body.capital        != null ? Number(body.capital)        : currentPrice * shares;
    const riskTolerancePct = body.riskTolerancePct != null ? Number(body.riskTolerancePct) : 0.05;
    const putStrikePrice  = body.putStrikePrice != null ? Number(body.putStrikePrice) : currentPrice * 0.95;
    const monteCarloIterations = body.monteCarloIterations != null ? Number(body.monteCarloIterations) : 256;

    const contract = adaptContractToEngine({
      kind: "protective_put",
      ticker,
      underlyingPrice: currentPrice,
      shares,
      capital,
      riskTolerancePct,
      putStrikePrice,
      iv,
      dte,
    });

    const engine = new CoverageSimulationEngine(monteCarloIterations);
    const result = await engine.analyze(contract);

    return res.status(200).json(result);
  }
);
