import { Router } from "express";
import { TermStrategyContract } from "../../../modules/strategies/term/termStrategyContract";
import { CalendarSpreadEngine } from "../../../modules/strategies/term/calendarSpreadEngine";
import { DiagonalSpreadEngine } from "../../../modules/strategies/term/diagonalSpreadEngine";

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

export interface CompareResponse {
  recommendation: "calendar" | "diagonal";
  justification: string;
  calendarMetrics: Record<string, number>;
  diagonalMetrics: Record<string, number>;
}

export const termComparatorRouter = Router();

/**
 * @openapi
 * /compare:
 *   post:
 *     tags: [Comparator]
 *     summary: Compara Calendar Spread vs Diagonal Spread y recomienda estrategia
 *     description: >
 *       Evalua el contexto de mercado (volatilidad, horizonte, direccion, tolerancia)
 *       y las metricas de ambas estrategias para recomendar la mas adecuada.
 *       Incluye justificacion textual y metricas comparativas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [marketVolatility, timeHorizon, direction, riskTolerance, calendarLegs, diagonalLegs]
 *             properties:
 *               marketVolatility: { type: string, enum: [low, medium, high], example: "medium" }
 *               timeHorizon:      { type: string, enum: [short, medium, long], example: "long" }
 *               direction:        { type: string, enum: [bullish, bearish, neutral], example: "neutral" }
 *               riskTolerance:    { type: string, enum: [conservative, moderate, aggressive], example: "conservative" }
 *               calendarLegs:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   properties:
 *                     strike:      { type: number, example: 100 }
 *                     expiration:  { type: string, format: date, example: "2026-06-19" }
 *                     premium:     { type: number, example: 2.50 }
 *                     contracts:   { type: integer, example: 1 }
 *                     optionStyle: { type: string, enum: [call, put], example: "call" }
 *               diagonalLegs:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   properties:
 *                     strike:      { type: number, example: 95 }
 *                     expiration:  { type: string, format: date, example: "2026-06-19" }
 *                     premium:     { type: number, example: 3.50 }
 *                     contracts:   { type: integer, example: 1 }
 *                     optionStyle: { type: string, enum: [call, put], example: "call" }
 *     responses:
 *       200:
 *         description: Comparacion completada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendation:  { type: string, enum: [calendar, diagonal] }
 *                 justification:  { type: string }
 *                 calendarMetrics: { type: object }
 *                 diagonalMetrics: { type: object }
 *       400:
 *         description: Error de validacion
 *       500:
 *         description: Error interno del servidor
 */
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

    const volatilityScore = body.marketVolatility === "high" ? 1 : body.marketVolatility === "medium" ? 0.5 : 0;
    const timeScore = body.timeHorizon === "long" ? 1 : body.timeHorizon === "medium" ? 0.5 : 0;
    const directionScore = body.direction === "neutral" ? 1 : body.direction === "bullish" ? 0.5 : 0;
    const riskScore = body.riskTolerance === "conservative" ? 1 : body.riskTolerance === "moderate" ? 0.5 : 0;

    const calendarScore = (volatilityScore * 0.3 + timeScore * 0.1 + directionScore * 0.3 + riskScore * 0.3);
    const diagonalScore = ((1 - volatilityScore) * 0.2 + timeScore * 0.2 + (1 - directionScore) * 0.3 + (1 - riskScore) * 0.3);

    const recommendation = calendarScore >= diagonalScore ? "calendar" : "diagonal";

    const justification = recommendation === "calendar"
      ? `Calendar spread recommended for ${body.marketVolatility} volatility, ${body.timeHorizon} horizon, ${body.direction} outlook. Calendar spreads benefit from stable markets and time decay.`
      : `Diagonal spread recommended for ${body.marketVolatility} volatility, ${body.timeHorizon} horizon, ${body.direction} outlook. Diagonal spreads benefit from directional moves and volatility expansion.`;

    res.status(200).json({
      recommendation,
      justification,
      calendarMetrics: calResult
        ? { netTheta: calResult.netTheta, shortDte: calResult.shortDte, longDte: calResult.longDte }
        : {},
      diagonalMetrics: diagResult
        ? { netDelta: diagResult.greeks.delta, netTheta: diagResult.greeks.theta, shortDte: diagResult.shortDte }
        : {},
    } as CompareResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
