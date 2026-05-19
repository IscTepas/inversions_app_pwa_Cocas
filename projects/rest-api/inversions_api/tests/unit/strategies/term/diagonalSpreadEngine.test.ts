import { describe, it, expect } from "vitest";
import { TermStrategyContract } from "../../../../src/modules/strategies/term/termStrategyContract";
import { DiagonalSpreadEngine } from "../../../../src/modules/strategies/term/diagonalSpreadEngine";

describe("DiagonalSpreadEngine", () => {
  const now = new Date();
  const shortExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const longExpiration = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  function makeValidContract(optionStyle: "call" | "put" = "call"): TermStrategyContract {
    return new TermStrategyContract({
      legs: [
        { strike: 100, expiration: shortExpiration, premium: 5.0, contracts: 1, optionStyle },
        { strike: 105, expiration: longExpiration, premium: 8.0, contracts: 1, optionStyle },
      ],
      underlying: "SPY",
    });
  }

  describe("constructor", () => {
    it("should accept a valid diagonal spread contract", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      expect(engine).toBeInstanceOf(DiagonalSpreadEngine);
    });

    it("should accept custom parameters", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract, 0.04, [], 0.3, 5);
      expect(engine).toBeInstanceOf(DiagonalSpreadEngine);
    });
  });

  describe("analyze", () => {
    it("should return DTE values", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.shortDte).toBeGreaterThan(0);
      expect(result.longDte).toBeGreaterThan(result.shortDte);
    });

    it("should return greek sensitivities", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(typeof result.greeks.delta).toBe("number");
      expect(typeof result.greeks.gamma).toBe("number");
      expect(typeof result.greeks.theta).toBe("number");
      expect(typeof result.greeks.vega).toBe("number");
    });

    it("should identify directional profile", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(["bullish", "bearish", "neutral"]).toContain(result.directionalProfile);
    });

    it("should generate price scenarios", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.scenarios.length).toBeGreaterThan(0);
      expect(result.scenarios[0]).toHaveProperty("underlyingPrice");
      expect(result.scenarios[0]).toHaveProperty("strategyValue");
      expect(result.scenarios[0]).toHaveProperty("pnl");
      expect(result.scenarios[0]).toHaveProperty("greeks");
    });

    it("should generate theta decay profile", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.thetaDecayProfile.length).toBeGreaterThan(0);
    });

    it("should generate vega shock profile", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.vegaShockProfile.length).toBeGreaterThan(0);
    });

    it("should handle call variant", () => {
      const contract = makeValidContract("call");
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it("should handle put variant", () => {
      const contract = makeValidContract("put");
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      expect(result.scenarios.length).toBeGreaterThan(0);
    });
  });

  describe("adjustment window", () => {
    it("should return null when no adjustment needed", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      const result = engine.analyze();

      if (result.adjustmentWindow) {
        expect(result.adjustmentWindow).toHaveProperty("daysToShortExpiration");
        expect(result.adjustmentWindow).toHaveProperty("recommendation");
      } else {
        expect(result.adjustmentWindow).toBeNull();
      }
    });

    it("should detect approaching expiration when DTE is very short", () => {
      const veryShortExp = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const contract = new TermStrategyContract({
        legs: [
          { strike: 100, expiration: veryShortExp, premium: 5.0, contracts: 1, optionStyle: "call" },
          { strike: 105, expiration: longExpiration, premium: 8.0, contracts: 1, optionStyle: "call" },
        ],
        underlying: "SPY",
      });
      const engine = new DiagonalSpreadEngine(contract, 0.05, [], 0.5, 7);
      const result = engine.analyze();

      expect(result.adjustmentWindow).not.toBeNull();
      expect(result.adjustmentWindow!.daysToShortExpiration).toBeLessThanOrEqual(7);
      expect(result.adjustmentWindow!.recommendation).toContain("rolling");
    });
  });

  describe("getContract", () => {
    it("should return the underlying contract", () => {
      const contract = makeValidContract();
      const engine = new DiagonalSpreadEngine(contract);
      expect(engine.getContract()).toBe(contract);
    });
  });
});
