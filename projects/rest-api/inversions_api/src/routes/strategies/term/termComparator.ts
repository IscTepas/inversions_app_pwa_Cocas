import { Router } from "express";
import { TermStrategyContract } from "../../../modules/strategies/term/termStrategyContract";
import { CalendarSpreadEngine } from "../../../modules/strategies/term/calendarSpreadEngine";
import { DiagonalSpreadEngine } from "../../../modules/strategies/term/diagonalSpreadEngine";
import { TermSimulationEngine } from "../../../modules/strategies/term/termSimulationEngine";
import { TermReportEngine } from "../../../modules/strategies/term/termReportEngine";
import type { CalendarSpreadResult } from "../../../modules/strategies/term/calendarSpreadEngine";
import type { RiskProfile } from "../../../modules/strategies/term/diagonalSpreadEngine";
import type { RiskMetrics } from "../../../modules/strategies/term/termReportEngine";

export interface CompareRequest {
  marketVolatility: "low" | "medium" | "high";
  timeHorizon: "short" | "medium" | "long";
  direction: "bullish" | "bearish" | "neutral";
  riskTolerance: "conservative" | "moderate" | "aggressive";
  calendarLegs: Array<{
    strike: number;
    expiration: string;
    premium: number;
    contracts: number;
    optionStyle: "call" | "put";
  }>;
  diagonalLegs: Array<{
    strike: number;
    expiration: string;
    premium: number;
    contracts: number;
    optionStyle: "call" | "put";
  }>;
}

export interface StrategyMetrics {
  cost: number;
  maxLoss: number;
  maxProfit: number;
  breakEvens: number[];
  probabilityOfProfit: number;
  greeks: { delta: number; gamma: number; theta: number; vega: number };
  dte: { short: number; long: number };
  directionalProfile: string;
  riskMetrics: RiskMetrics;
}

export interface CompareResponse {
  recommendation: "calendar" | "diagonal";
  justification: string;
  scores: { calendar: number; diagonal: number };
  calendar: StrategyMetrics;
  diagonal: StrategyMetrics;
}

export const termComparatorRouter = Router();

/**
 * @openapi
 * /compare:
 *   post:
 *     tags: [Comparator]
 *     summary: Compara Calendar Spread vs Diagonal Spread con metricas side-by-side
 *     description: >
 *       Evalua el contexto de mercado (volatilidad, horizonte, direccion, tolerancia)
 *       y las metricas completas de ambas estrategias (capital, riesgo, griegas, DTE)
 *       para recomendar la mas adecuada con justificacion detallada.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [marketVolatility, timeHorizon, direction, riskTolerance, calendarLegs, diagonalLegs]
 *             properties:
 *               marketVolatility: { type: string, enum: [low, medium, high] }
 *               timeHorizon:      { type: string, enum: [short, medium, long] }
 *               direction:        { type: string, enum: [bullish, bearish, neutral] }
 *               riskTolerance:    { type: string, enum: [conservative, moderate, aggressive] }
 *               calendarLegs:     { type: array, items: { type: object } }
 *               diagonalLegs:     { type: array, items: { type: object } }
 *     responses:
 *       200:
 *         description: Comparacion con metricas side-by-side
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendation: { type: string }
 *                 justification:  { type: string }
 *                 scores:         { type: object }
 *                 calendar:       { type: object }
 *                 diagonal:       { type: object }
 *       400:
 *         description: Error de validacion
 *       500:
 *         description: Error interno del servidor
 */

function buildStrategyMetrics(
  engineResult: CalendarSpreadResult | RiskProfile | null,
  legs: Array<{ premium: number; contracts: number }>,
  isCalendar: boolean
): StrategyMetrics {
  const empty: StrategyMetrics = {
    cost: 0, maxLoss: 0, maxProfit: 0, breakEvens: [],
    probabilityOfProfit: 0,
    greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
    dte: { short: 0, long: 0 },
    directionalProfile: "neutral",
    riskMetrics: {
      netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0,
      probabilityOfProfit: 0, maxDrawdown: 0, sharpeRatio: 0,
      stressTestMaxLoss: 0, stressTestMaxGain: 0, expectedShortfall: 0,
    },
  };

  if (!engineResult) return empty;

  const cost = TermReportEngine.calculateNetCost(legs);

  const scenarios: Array<{ underlyingPrice: number; strategyValue: number; pnl: number }> =
    "shortTheta" in engineResult
      ? (engineResult as CalendarSpreadResult).scenarios
      : (engineResult as RiskProfile).scenarios;
  const payoffCurve = scenarios.map(s => ({
    price: s.underlyingPrice,
    payoff: s.strategyValue,
    pnl: s.pnl,
  }));
  const breakEvens = TermReportEngine.calculateBreakEvens(payoffCurve);

  const pnls = scenarios.map(s => s.pnl).filter(p => !isNaN(p));
  const maxLoss = pnls.length > 0 ? Math.min(...pnls) : 0;
  const maxProfit = pnls.length > 0 ? Math.max(...pnls) : 0;

  if (isCalendar) {
    const calResult = engineResult as CalendarSpreadResult;
    const g = calResult.greeks;
    return {
      cost: Math.round(cost * 100) / 100,
      maxLoss: Math.round(maxLoss * 100) / 100,
      maxProfit: Math.round(maxProfit * 100) / 100,
      breakEvens,
      probabilityOfProfit: 0, // se calcula via report engine abajo
      greeks: { delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega },
      dte: { short: calResult.shortDte, long: calResult.longDte },
      directionalProfile: "neutral",
      riskMetrics: {
        netDelta: g.delta, netGamma: g.gamma, netTheta: g.theta, netVega: g.vega,
        probabilityOfProfit: 0, maxDrawdown: 0, sharpeRatio: 0,
        stressTestMaxLoss: 0, stressTestMaxGain: 0, expectedShortfall: 0,
      },
    };
  }

  const diagResult = engineResult as RiskProfile;
  const g = diagResult.greeks;
  return {
    cost: Math.round(cost * 100) / 100,
    maxLoss: Math.round(maxLoss * 100) / 100,
    maxProfit: Math.round(maxProfit * 100) / 100,
    breakEvens,
    probabilityOfProfit: 0,
    greeks: { delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega },
    dte: { short: diagResult.shortDte, long: diagResult.longDte },
    directionalProfile: diagResult.directionalProfile,
    riskMetrics: {
      netDelta: g.delta, netGamma: g.gamma, netTheta: g.theta, netVega: g.vega,
      probabilityOfProfit: 0, maxDrawdown: 0, sharpeRatio: 0,
      stressTestMaxLoss: 0, stressTestMaxGain: 0, expectedShortfall: 0,
    },
  };
}

function enrichWithRiskMetrics(
  base: StrategyMetrics,
  reportEngine: TermReportEngine
): StrategyMetrics {
  const riskMetrics = reportEngine.calculateRiskMetrics();
  const stressTests = reportEngine.generateStressTestSummary();
  const stressPnls = stressTests.map(s => s.pnl).filter(p => !isNaN(p));
  return {
    ...base,
    probabilityOfProfit: riskMetrics.probabilityOfProfit,
    riskMetrics: {
      ...riskMetrics,
    },
  };
}

termComparatorRouter.post("/compare", (req, res) => {
  try {
    const body = req.body as CompareRequest;

    if (!body.calendarLegs || !body.diagonalLegs) {
      res.status(400).json({ error: "Both calendarLegs and diagonalLegs are required" });
      return;
    }

    const calendarContract = new TermStrategyContract({
      legs: body.calendarLegs.map(l => ({ ...l, expiration: new Date(l.expiration) })),
    });
    const diagonalContract = new TermStrategyContract({
      legs: body.diagonalLegs.map(l => ({ ...l, expiration: new Date(l.expiration) })),
    });

    const calValidation = calendarContract.validate();
    const diagValidation = diagonalContract.validate();

    const calEngine = new CalendarSpreadEngine(calendarContract);
    const diagEngine = new DiagonalSpreadEngine(diagonalContract);

    const calResult = calValidation.isValid ? calEngine.analyze() : null;
    const diagResult = diagValidation.isValid ? diagEngine.analyze() : null;

    // Build base metrics
    let calMetrics = buildStrategyMetrics(calResult, body.calendarLegs, true);
    let diagMetrics = buildStrategyMetrics(diagResult, body.diagonalLegs, false);

    // Enrich with report engine data if we have scenarios
    if (calResult) {
      const simEngine = new TermSimulationEngine(calendarContract, calEngine, null);
      const simResult = {
        strategy: "calendar" as const,
        optionStyle: "call" as const,
        backtest: null,
        monteCarlo: simEngine.runMonteCarlo({ iterations: 1000, distribution: "normal" }),
        deterministic: simEngine.runDeterministic(),
        timestamp: new Date(),
      };
      const reportEngine = new TermReportEngine(calResult, null, simResult, null);
      calMetrics = enrichWithRiskMetrics(calMetrics, reportEngine);
    }

    if (diagResult) {
      const simEngine = new TermSimulationEngine(diagonalContract, null, diagEngine);
      const simResult = {
        strategy: "diagonal" as const,
        optionStyle: diagResult.greeks.delta > 0 ? "call" as const : "put" as const,
        backtest: null,
        monteCarlo: simEngine.runMonteCarlo({ iterations: 1000, distribution: "normal" }),
        deterministic: simEngine.runDeterministic(),
        timestamp: new Date(),
      };
      const reportEngine = new TermReportEngine(null, diagResult, simResult, null);
      diagMetrics = enrichWithRiskMetrics(diagMetrics, reportEngine);
    }

    // Scoring
    const volatilityScore = body.marketVolatility === "high" ? 1 : body.marketVolatility === "medium" ? 0.5 : 0;
    const timeScore = body.timeHorizon === "long" ? 1 : body.timeHorizon === "medium" ? 0.5 : 0;
    const directionScore = body.direction === "neutral" ? 1 : body.direction === "bullish" ? 0.5 : 0;
    const riskScore = body.riskTolerance === "conservative" ? 1 : body.riskTolerance === "moderate" ? 0.5 : 0;

    const calendarScore = volatilityScore * 0.3 + timeScore * 0.1 + directionScore * 0.3 + riskScore * 0.3;
    const diagonalScore = (1 - volatilityScore) * 0.2 + timeScore * 0.2 + (1 - directionScore) * 0.3 + (1 - riskScore) * 0.3;

    const recommendation = calendarScore >= diagonalScore ? "calendar" : "diagonal";

    const justification = recommendation === "calendar"
      ? `Calendar spread recommended for ${body.marketVolatility} volatility, ${body.timeHorizon} horizon, ${body.direction} outlook. Lower cost ($${calMetrics.cost} vs $${diagMetrics.cost}), neutral delta (${calMetrics.greeks.delta}), and higher POP (${(calMetrics.probabilityOfProfit * 100).toFixed(0)}% vs ${(diagMetrics.probabilityOfProfit * 100).toFixed(0)}%).`
      : `Diagonal spread recommended for ${body.marketVolatility} volatility, ${body.timeHorizon} horizon, ${body.direction} outlook. Directional delta (${diagMetrics.greeks.delta}) aligns with bias, higher max profit ($${diagMetrics.maxProfit} vs $${calMetrics.maxProfit}).`;

    res.status(200).json({
      recommendation,
      justification,
      scores: {
        calendar: Math.round(calendarScore * 100) / 100,
        diagonal: Math.round(diagonalScore * 100) / 100,
      },
      calendar: calMetrics,
      diagonal: diagMetrics,
    } as CompareResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
