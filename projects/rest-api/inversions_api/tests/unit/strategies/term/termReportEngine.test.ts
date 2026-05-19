import { describe, it, expect } from "vitest";
import { TermReportEngine } from "../../../../src/modules/strategies/term/termReportEngine";
import type { CalendarSpreadResult } from "../../../../src/modules/strategies/term/calendarSpreadEngine";

describe("TermReportEngine", () => {
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

  describe("constructor", () => {
    it("should accept calendar result", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
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

    it("should return empty array when no results", () => {
      const engine = new TermReportEngine(null, null, null, null);
      const curve = engine.generatePayoffCurve();
      expect(curve).toEqual([]);
    });
  });

  describe("generateSurface", () => {
    it("should generate time-price-IV surface", () => {
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

    it("should return zeros when no results", () => {
      const engine = new TermReportEngine(null, null, null, null);
      const metrics = engine.calculateRiskMetrics();
      expect(metrics.netDelta).toBe(0);
      expect(metrics.netTheta).toBe(0);
    });
  });

  describe("generateReport", () => {
    it("should generate full structured report", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const report = engine.generateReport();
      expect(report.strategy).toBe("calendar");
      expect(report.payoffCurve.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeTruthy();
    });

    it("should return JSON string from toJson", () => {
      const engine = new TermReportEngine(mockCalendarResult, null, null, null);
      const json = engine.toJson();
      const parsed = JSON.parse(json);
      expect(parsed.strategy).toBe("calendar");
    });
  });
});
