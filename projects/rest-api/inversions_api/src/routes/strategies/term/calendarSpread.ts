/**
 * calendarSpread.ts — T168 (endpoint REST)
 * Proposito: Ruta POST /api/v1/strategies/term/calendar.
 * Orquesta: TermStrategyContract (validacion) -> CalendarSpreadEngine (analisis)
 *           -> TermSimulationEngine (Monte Carlo + deterministico)
 *           -> TermReportEngine (reporte estructurado).
 * Llamado por: src/index.ts (registra el router en /api/v1/strategies/term linea 63)
 * Dependencias: termStrategyContract, calendarSpreadEngine, termSimulationEngine, termReportEngine
 */
import { Router } from "express";
import { TermStrategyContract } from "../../../modules/strategies/term/termStrategyContract";
import { CalendarSpreadEngine } from "../../../modules/strategies/term/calendarSpreadEngine";
import { TermSimulationEngine } from "../../../modules/strategies/term/termSimulationEngine";
import { TermReportEngine } from "../../../modules/strategies/term/termReportEngine";

/** Request body para POST /calendar */
export interface CalendarRequest {
  legs: Array<{
    strike: number;
    expiration: string;
    premium: number;
    contracts: number;
    optionStyle: "call" | "put";
  }>;
  underlying?: string;
  riskFreeRate?: number;
  ivCurve?: Array<{ dte: number; iv: number }>;
  monteCarlo?: { iterations: number; distribution: "normal" | "lognormal" };
}

export const calendarSpreadRouter = Router();

/**
 * @openapi
 * /calendar:
 *   post:
 *     tags: [Calendar Spread]
 *     summary: Calcula metricas y escenarios de un Calendar Spread
 *     description: >
 *       Evalua un Calendar Spread (call/put) recibiendo las dos patas del spread
 *       con el mismo strike y expiraciones diferentes. Retorna metricas de theta decay,
 *       escenarios de precio, simulacion Monte Carlo/determinista y reporte completo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [legs]
 *             properties:
 *               legs:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   properties:
 *                     strike:       { type: number, example: 100 }
 *                     expiration:   { type: string, format: date, example: "2026-06-19" }
 *                     premium:      { type: number, example: 2.50 }
 *                     contracts:    { type: integer, example: 1 }
 *                     optionStyle:  { type: string, enum: [call, put], example: "call" }
 *               riskFreeRate: { type: number, example: 0.05 }
 *               ivCurve:      { type: array, items: { type: object, properties: { dte: { type: integer }, iv: { type: number } } } }
 *               monteCarlo:   { type: object, properties: { iterations: { type: integer }, distribution: { type: string, enum: [normal, lognormal] } } }
 *     responses:
 *       200:
 *         description: Calendar Spread calculado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 strategy:  { type: string, example: "calendar" }
 *                 analysis:  { type: object, properties: { shortDte: { type: integer }, longDte: { type: integer }, netTheta: { type: number } } }
 *                 scenarios: { type: array, items: { type: object } }
 *                 simulation: { type: object, properties: { deterministic: { type: array }, monteCarlo: { type: object } } }
 *                 report:    { type: object }
 *       400:
 *         description: Error de validacion
 *       500:
 *         description: Error interno del servidor
 */
/** POST /calendar: valida contrato, analiza con CalendarSpreadEngine, simula, genera reporte estructurado. Llamado desde src/index.ts linea 63 */
calendarSpreadRouter.post("/calendar", (req, res) => {
  try {
    const body = req.body as CalendarRequest;

    if (!body.legs || body.legs.length < 2) {
      res.status(400).json({ error: "At least 2 legs are required" });
      return;
    }

    const contract = new TermStrategyContract({
      legs: body.legs.map(l => ({
        ...l,
        expiration: new Date(l.expiration),
      })),
      underlying: body.underlying,
    });

    const validation = contract.validate();
    if (!validation.isValid) {
      res.status(400).json({ error: "Validation failed", details: validation.errors });
      return;
    }

    const engine = new CalendarSpreadEngine(
      contract, body.riskFreeRate ?? 0.05, body.ivCurve ?? []
    );
    const result = engine.analyze();

    const simulation = new TermSimulationEngine(contract, engine, null, body.riskFreeRate ?? 0.05, body.ivCurve ?? []);
    const mcConfig = body.monteCarlo ?? { iterations: 1000, distribution: "normal" as const };
    const simResult = simulation.simulate(undefined, mcConfig);

    const report = new TermReportEngine(result, null, simResult, null);

    res.status(200).json({
      strategy: "calendar",
      analysis: {
        shortDte: result.shortDte,
        longDte: result.longDte,
        shortTheta: result.shortTheta,
        longTheta: result.longTheta,
        netTheta: result.netTheta,
      },
      scenarios: result.scenarios,
      simulation: {
        deterministic: simResult.deterministic,
        monteCarlo: simResult.monteCarlo,
      },
      report: report.generateReport(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
