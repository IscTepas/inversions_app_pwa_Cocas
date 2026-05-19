import { describe, it, expect } from "vitest";
import { TermStrategyContract } from "../../../../src/modules/strategies/term/termStrategyContract";
import { CalendarSpreadEngine } from "../../../../src/modules/strategies/term/calendarSpreadEngine";

describe("CalendarSpreadEngine", () => {
  const now = new Date();
  const shortExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const longExpiration = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  function makeValidContract(optionStyle: "call" | "put" = "call"): TermStrategyContract {
    return new TermStrategyContract({
      legs: [
        { strike: 100, expiration: shortExpiration, premium: 5.0, contracts: 1, optionStyle },
        { strike: 100, expiration: longExpiration, premium: 8.0, contracts: 1, optionStyle },
      ],
      underlying: "SPY",
    });
  }

  describe("constructor", () => {
    it("should accept a valid contract", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      expect(engine).toBeInstanceOf(CalendarSpreadEngine);
    });

    it("should accept custom riskFreeRate and ivCurve", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract, 0.04, [
        { dte: 30, iv: 0.25 },
        { dte: 90, iv: 0.22 },
      ]);
      expect(engine).toBeInstanceOf(CalendarSpreadEngine);
    });
  });

  describe("analyze", () => {
    it("should return shortDte and longDte", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.shortDte).toBeGreaterThan(0);
      expect(result.longDte).toBeGreaterThan(result.shortDte);
    });

    it("should return theta values for short and long legs", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      expect(typeof result.shortTheta).toBe("number");
      expect(typeof result.longTheta).toBe("number");
      expect(typeof result.netTheta).toBe("number");
    });

    it("should return scenarios array", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it("should generate scenarios with correct structure", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      const scenario = result.scenarios[0];
      expect(scenario).toHaveProperty("underlyingPrice");
      expect(scenario).toHaveProperty("strategyValue");
      expect(scenario).toHaveProperty("pnl");
      expect(scenario).toHaveProperty("theta");
      expect(scenario).toHaveProperty("impliedVolatility");
    });

    it("should generate scenarios across a price range around ATM", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      const prices = result.scenarios.map(s => s.underlyingPrice);
      expect(Math.min(...prices)).toBeLessThan(100);
      expect(Math.max(...prices)).toBeGreaterThan(100);
    });

    it("should handle call variant", () => {
      const contract = makeValidContract("call");
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it("should handle put variant", () => {
      const contract = makeValidContract("put");
      const engine = new CalendarSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it("should produce different strategy values for call vs put at deep OTM", () => {
      const callContract = makeValidContract("call");
      const putContract = makeValidContract("put");

      const callEngine = new CalendarSpreadEngine(callContract);
      const putEngine = new CalendarSpreadEngine(putContract);

      const callResult = callEngine.analyze();
      const putResult = putEngine.analyze();

      const callFirst = callResult.scenarios[0];
      const putFirst = putResult.scenarios[0];
      expect(callFirst.strategyValue).not.toBe(putFirst.strategyValue);
    });

    it("should use ivCurve for differentiated IV per leg", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract, 0.05, [
        { dte: 30, iv: 0.35 },
        { dte: 90, iv: 0.20 },
      ]);
      const result = engine.analyze();

      result.scenarios.forEach(s => {
        expect(s.impliedVolatility).toBeGreaterThan(0);
      });
    });
  });

  describe("getContract", () => {
    it("should return the underlying contract", () => {
      const contract = makeValidContract();
      const engine = new CalendarSpreadEngine(contract);
      expect(engine.getContract()).toBe(contract);
    });
  });
});
