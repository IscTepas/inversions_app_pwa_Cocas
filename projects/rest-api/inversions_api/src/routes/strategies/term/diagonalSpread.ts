/**
 * diagonalSpread.ts — T168 (endpoint REST)
 * Proposito: Ruta POST /api/v1/strategies/term/diagonal.
 * Orquesta: TermStrategyContract (validacion) -> DiagonalSpreadEngine (analisis con griegas)
 *           -> TermSimulationEngine (Monte Carlo + deterministico)
 *           -> TermReportEngine (reporte estructurado).
 * Llamado por: src/index.ts (registra el router en /api/v1/strategies/term linea 64)
 * Dependencias: termStrategyContract, diagonalSpreadEngine, termSimulationEngine, termReportEngine
 */
import { Router } from "express";
import { TermStrategyContract } from "../../../modules/strategies/term/termStrategyContract";
import { DiagonalSpreadEngine } from "../../../modules/strategies/term/diagonalSpreadEngine";
import { TermSimulationEngine } from "../../../modules/strategies/term/termSimulationEngine";
import { TermReportEngine } from "../../../modules/strategies/term/termReportEngine";

/** Request body para POST /diagonal */
export interface DiagonalRequest {
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

export const diagonalSpreadRouter = Router();

/**
 * @openapi
 * /diagonal:
 *   post:
 *     tags: [Diagonal Spread]
 *     summary: Calcula metricas y escenarios de un Diagonal Spread
 *     description: >
 *       Evalua un Diagonal Spread (call/put) recibiendo las dos patas con strikes
 *       y expiraciones diferentes. Retorna griegas (delta, gamma, theta, vega),
 *       perfiles de riesgo, escenarios, simulacion y reporte completo.
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
 *                     strike:       { type: number, example: 95 }
 *                     expiration:   { type: string, format: date, example: "2026-06-19" }
 *                     premium:      { type: number, example: 3.50 }
 *                     contracts:    { type: integer, example: 1 }
 *                     optionStyle:  { type: string, enum: [call, put], example: "call" }
 *               riskFreeRate: { type: number, example: 0.05 }
 *               ivCurve:      { type: array, items: { type: object, properties: { dte: { type: integer }, iv: { type: number } } } }
 *               monteCarlo:   { type: object, properties: { iterations: { type: integer }, distribution: { type: string, enum: [normal, lognormal] } } }
 *     responses:
 *       200:
 *         description: Diagonal Spread calculado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 strategy:        { type: string, example: "diagonal" }
 *                 analysis:        { type: object, properties: { shortDte: { type: integer }, longDte: { type: integer }, greeks: { type: object } } }
 *                 scenarios:       { type: array, items: { type: object } }
 *                 thetaDecayProfile: { type: array, items: { type: object } }
 *                 vegaShockProfile:  { type: array, items: { type: object } }
 *                 simulation:      { type: object, properties: { deterministic: { type: array }, monteCarlo: { type: object } } }
 *                 report:          { type: object }
 *       400:
 *         description: Error de validacion
 *       500:
 *         description: Error interno del servidor
 */
/** POST /diagonal: valida contrato, verifica que sea diagonal (strikes distintos), analiza, simula, genera reporte. Llamado desde src/index.ts linea 64 */
diagonalSpreadRouter.post("/diagonal", (req, res) => {
  try {
    const body = req.body as DiagonalRequest;

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

    if (contract.getType() !== "diagonal") {
      res.status(400).json({ error: "Input is not a diagonal spread. Use /calendar endpoint for same-strike spreads." });
      return;
    }

    const engine = new DiagonalSpreadEngine(
      contract, body.riskFreeRate ?? 0.05, body.ivCurve ?? []
    );
    const result = engine.analyze();

    const simulation = new TermSimulationEngine(contract, null, engine, body.riskFreeRate ?? 0.05, body.ivCurve ?? []);
    const mcConfig = body.monteCarlo ?? { iterations: 1000, distribution: "normal" as const };
    const simResult = simulation.simulate(undefined, mcConfig);

    const report = new TermReportEngine(null, result, simResult, null);

    res.status(200).json({
      strategy: "diagonal",
      analysis: {
        shortDte: result.shortDte,
        longDte: result.longDte,
        greeks: result.greeks,
        directionalProfile: result.directionalProfile,
        adjustmentWindow: result.adjustmentWindow,
      },
      scenarios: result.scenarios,
      thetaDecayProfile: result.thetaDecayProfile,
      vegaShockProfile: result.vegaShockProfile,
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
