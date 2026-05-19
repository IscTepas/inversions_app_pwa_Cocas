import { Router } from "express";
import { TermStrategyContract } from "../../../modules/strategies/term/termStrategyContract";
import { CalendarSpreadEngine } from "../../../modules/strategies/term/calendarSpreadEngine";
import { TermSimulationEngine } from "../../../modules/strategies/term/termSimulationEngine";
import { TermReportEngine } from "../../../modules/strategies/term/termReportEngine";

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
    const simResult = body.monteCarlo
      ? simulation.simulate(undefined, body.monteCarlo)
      : simulation.simulate();

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
