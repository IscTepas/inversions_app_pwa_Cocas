import { Router } from "express";
import { TermStrategyContract } from "../../../modules/strategies/term/termStrategyContract";
import { DiagonalSpreadEngine } from "../../../modules/strategies/term/diagonalSpreadEngine";
import { TermSimulationEngine } from "../../../modules/strategies/term/termSimulationEngine";
import { TermReportEngine } from "../../../modules/strategies/term/termReportEngine";

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
    const simResult = body.monteCarlo
      ? simulation.simulate(undefined, body.monteCarlo)
      : simulation.simulate();

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
