import { describe, it, expect } from "vitest";
import { TermReportEngine } from "../../../../src/modules/strategies/term/termReportEngine";
import type { CalendarSpreadResult } from "../../../../src/modules/strategies/term/calendarSpreadEngine";
import type { RiskProfile } from "../../../../src/modules/strategies/term/diagonalSpreadEngine";
import type { SimulationResult } from "../../../../src/modules/strategies/term/termSimulationEngine";
import type { RiskAnalysis } from "../../../../src/modules/strategies/term/termRiskEngine";

const mockCalendarResult: CalendarSpreadResult = {
  shortDte: 30,
  longDte: 90,
  shortTheta: -5,
  longTheta: -3,
  netTheta: -2,
  scenarios: [
    { underlyingPrice: 80, strategyValue: 2, pnl: -1, theta: -2, impliedVolatility: 0.2 },
    { underlyingPrice: 90, strategyValue: 2.5, pnl: -0.5, theta: -2.5, impliedVolatility: 0.2 },
    { underlyingPrice: 100, strategyValue: 3, pnl: 0, theta: -3, impliedVolatility: 0.2 },
    { underlyingPrice: 110, strategyValue: 2.5, pnl: -0.5, theta: -2.5, impliedVolatility: 0.2 },
    { underlyingPrice: 120, strategyValue: 2, pnl: -1, theta: -2, impliedVolatility: 0.2 },
  ],
};

const mockDiagonalResult: RiskProfile = {
  shortDte: 30,
  longDte: 90,
  greeks: { delta: 0.15, gamma: -0.02, theta: -3.5, vega: 8.2 },
  directionalProfile: "bullish",
  adjustmentWindow: null,
  scenarios: [
    { underlyingPrice: 90, strategyValue: 1, pnl: -2, greeks: { delta: 0.1, gamma: -0.01, theta: -2, vega: 5 } },
    { underlyingPrice: 100, strategyValue: 3, pnl: 0, greeks: { delta: 0.15, gamma: -0.02, theta: -3.5, vega: 8 } },
    { underlyingPrice: 110, strategyValue: 5, pnl: 2, greeks: { delta: 0.2, gamma: -0.03, theta: -4, vega: 10 } },
  ],
  thetaDecayProfile: [],
  vegaShockProfile: [],
};

const mockSimResult: SimulationResult = {
  deterministic: [
    { label: "Price-10%_IV-10%", price: 90, ivShock: -0.1, dteRemaining: 30, strategyValue: 1, pnl: -2 },
    { label: "Price+0%_IV+0%", price: 100, ivShock: 0, dteRemaining: 30, strategyValue: 3, pnl: 0 },
  ],
  monteCarlo: null,
  backtest: { sharpeRatio: 1.5, sortinoRatio: 1.2, maxDrawdown: 0.15, totalReturn: 0.25 },
};

const mockRiskAnalysis: RiskAnalysis = {
  limitsViolation: true,
  violations: ["Theta limit exceeded"],
  earlyAssignmentRisk: null,
  stopLossTriggered: false,
  stopLossRules: [
    { currentDrawdown: 0.12, threshold: 0.15, triggered: false },
  ],
  alerts: [],
};

describe("TermReportEngine", () => {
  describe("constructor", () => {
    it("should accept calendar result", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      expect(engine).toBeInstanceOf(TermReportEngine);
    });

    it("should accept diagonal result", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      expect(engine).toBeInstanceOf(TermReportEngine);
    });

    it("should accept null results", () => {
      const engine = new TermReportEngine(null, null, null, null);
      expect(engine).toBeInstanceOf(TermReportEngine);
    });
  });

  describe("generatePayoffCurve", () => {
    it("should generate payoff curve from calendar result", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const curve = engine.generatePayoffCurve();
      expect(curve.length).toBe(5);
      expect(curve[0]).toHaveProperty("price");
      expect(curve[0]).toHaveProperty("payoff");
      expect(curve[0]).toHaveProperty("pnl");
    });

    it("should generate payoff curve from diagonal result", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      const curve = engine.generatePayoffCurve();
      expect(curve.length).toBe(3);
      expect(curve[0].price).toBe(90);
    });

    it("should prefer calendar over diagonal when both present", () => {
      const engine = new TermReportEngine(mockCalendarResult, mockDiagonalResult, null, null);
      const curve = engine.generatePayoffCurve();
      expect(curve.length).toBe(5);
    });

    it("should return empty array when no results", () => {
      const engine = new TermReportEngine(null, null, null, null);
      const curve = engine.generatePayoffCurve();
      expect(curve).toEqual([]);
    });
  });

  describe("generateSurface", () => {
    it("should generate time-price-IV surface from calendar result", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const surface = engine.generateSurface();
      expect(surface).not.toBeNull();
      expect(surface!.priceAxis.length).toBeGreaterThan(0);
      expect(surface!.dteAxis).toEqual([30, 90]);
      expect(surface!.pnlMatrix.length).toBe(2);
      expect(surface!.ivMatrix.length).toBe(2);
    });

    it("should return null when no calendar result", () => {
      const engine = new TermReportEngine(null, null, null, null);
      expect(engine.generateSurface()).toBeNull();
    });

    it("should return null when calendar has empty scenarios", () => {
      const emptyCal: CalendarSpreadResult = {
        shortDte: 30, longDte: 90, shortTheta: 0, longTheta: 0, netTheta: 0, scenarios: [],
      };
      const engine = new TermReportEngine(emptyCal, null, null, null);
      expect(engine.generateSurface()).toBeNull();
    });

    it("should handle duplicate prices in price axis", () => {
      const dupCal: CalendarSpreadResult = {
        shortDte: 30,
        longDte: 90,
        shortTheta: -5,
        longTheta: -3,
        netTheta: -2,
        scenarios: [
          { underlyingPrice: 100, strategyValue: 3, pnl: 0, theta: -3, impliedVolatility: 0.2 },
          { underlyingPrice: 100, strategyValue: 3, pnl: 0, theta: -3, impliedVolatility: 0.2 },
          { underlyingPrice: 110, strategyValue: 2, pnl: -1, theta: -2, impliedVolatility: 0.25 },
        ],
      };
      const engine = new TermReportEngine(dupCal, null, null, null);
      const surface = engine.generateSurface();
      expect(surface!.priceAxis.length).toBe(2);
    });
  });

  describe("calculateRiskMetrics", () => {
    it("should return risk metrics from calendar result", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics).toHaveProperty("netDelta");
      expect(metrics).toHaveProperty("netGamma");
      expect(metrics).toHaveProperty("netTheta");
      expect(metrics).toHaveProperty("netVega");
      expect(metrics).toHaveProperty("probabilityOfProfit");
      expect(metrics).toHaveProperty("maxDrawdown");
      expect(metrics).toHaveProperty("sharpeRatio");
    });

    it("should return risk metrics from diagonal result", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.netDelta).toBe(0.15);
      expect(metrics.netGamma).toBe(-0.02);
      expect(metrics.netTheta).toBe(-3.5);
      expect(metrics.netVega).toBe(8.2);
    });

    it("should use backtest sharpeRatio when available", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, mockSimResult, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.sharpeRatio).toBe(1.5);
    });

    it("should use riskAnalysis maxDrawdown when available", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, mockRiskAnalysis);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.maxDrawdown).toBe(0.12);
    });

    it("should return zero maxDrawdown when no riskAnalysis", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.maxDrawdown).toBe(0);
    });

    it("should return zero sharpeRatio when no simulation backtest", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.sharpeRatio).toBe(0);
    });

    it("should handle riskAnalysis with multiple stopLossRules", () => {
      const multiRuleRisk: RiskAnalysis = {
        limitsViolation: true,
        violations: [],
        earlyAssignmentRisk: null,
        stopLossTriggered: false,
        stopLossRules: [
          { currentDrawdown: 0.05, threshold: 0.1, triggered: false },
          { currentDrawdown: 0.2, threshold: 0.15, triggered: true },
        ],
        alerts: [],
      };
      const engine = new TermReportEngine(mockCalendarResult, null, null, multiRuleRisk);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.maxDrawdown).toBe(0.2);
    });

    it("should use calendar probabilityOfProfit based on delta=0", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.probabilityOfProfit).toBe(0.5);
    });

    it("should use diagonal probabilityOfProfit based on delta", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.probabilityOfProfit).toBeGreaterThan(0.5);
      expect(metrics.probabilityOfProfit).toBeLessThan(0.95);
    });

    it("should return zeros when no results", () => {
      const engine = new TermReportEngine(null, null, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.netDelta).toBe(0);
      expect(metrics.netTheta).toBe(0);
    });
  });

  describe("generateReport", () => {
    it("should generate full structured report for calendar", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const report = engine.generateReport();
      expect(report.strategy).toBe("calendar");
      expect(report.payoffCurve.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeTruthy();
    });

    it("should generate full structured report for diagonal", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      const report = engine.generateReport();
      expect(report.strategy).toBe("diagonal");
      expect(report.optionStyle).toBe("call");
    });

    it("should generate report with unknown strategy when no results", () => {
      const engine = new TermReportEngine(null, null, null, null);
      const report = engine.generateReport();
      expect(report.strategy).toBe("unknown");
      expect(report.payoffCurve).toEqual([]);
    });

    it("should include deterministic scenarios in report", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, mockSimResult, null);
      const report = engine.generateReport();
      expect(report.deterministic.length).toBe(2);
    });

    it("should return empty deterministic when no simulation", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const report = engine.generateReport();
      expect(report.deterministic).toEqual([]);
    });

    it("should set optionStyle to put for diagonal with negative delta", () => {
      const bearishDiagonal: RiskProfile = {
        ...mockDiagonalResult,
        greeks: { delta: -0.3, gamma: 0.01, theta: -2, vega: 5 },
      };
      const engine = new TermReportEngine(null, bearishDiagonal, null, null);
      const report = engine.generateReport();
      expect(report.optionStyle).toBe("put");
    });

    it("should return surface null for diagonal results", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      const report = engine.generateReport();
      expect(report.surface).toBeNull();
    });
  });

  describe("toJson", () => {
    it("should return valid JSON string from calendar result", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const json = engine.toJson();
      const parsed = JSON.parse(json);
      expect(parsed.strategy).toBe("calendar");
    });

    it("should return valid JSON string from diagonal result", () => {
      const engine = new TermReportEngine(null, mockDiagonalResult, null, null);
      const json = engine.toJson();
      const parsed = JSON.parse(json);
      expect(parsed.strategy).toBe("diagonal");
    });
  });
});
