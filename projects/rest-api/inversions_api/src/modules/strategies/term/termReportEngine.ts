import type { CalendarSpreadResult } from "./calendarSpreadEngine";
import type { RiskProfile } from "./diagonalSpreadEngine";
import type { SimulationResult, DeterministicScenario } from "./termSimulationEngine";
import type { RiskAnalysis } from "./termRiskEngine";

export interface PayoffCurvePoint {
  price: number;
  payoff: number;
  pnl: number;
}

export interface TimePriceIvSurface {
  priceAxis: number[];
  dteAxis: number[];
  pnlMatrix: number[][];
  ivMatrix: number[][];
}

export interface RiskMetrics {
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  probabilityOfProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface StructuredReport {
  strategy: string;
  optionStyle: string;
  payoffCurve: PayoffCurvePoint[];
  surface: TimePriceIvSurface | null;
  riskMetrics: RiskMetrics;
  deterministic: DeterministicScenario[];
  generatedAt: string;
}

export class TermReportEngine {
  private readonly calendarResult: CalendarSpreadResult | null;
  private readonly diagonalResult: RiskProfile | null;
  private readonly simulationResult: SimulationResult | null;
  private readonly riskAnalysis: RiskAnalysis | null;

  constructor(
    calendarResult: CalendarSpreadResult | null,
    diagonalResult: RiskProfile | null,
    simulationResult: SimulationResult | null,
    riskAnalysis: RiskAnalysis | null
  ) {
    this.calendarResult = calendarResult;
    this.diagonalResult = diagonalResult;
    this.simulationResult = simulationResult;
    this.riskAnalysis = riskAnalysis;
  }

  generatePayoffCurve(): PayoffCurvePoint[] {
    if (this.calendarResult) {
      return this.calendarResult.scenarios.map(s => ({
        price: s.underlyingPrice,
        payoff: s.strategyValue,
        pnl: s.pnl,
      }));
    }

    if (this.diagonalResult) {
      return this.diagonalResult.scenarios.map(s => ({
        price: s.underlyingPrice,
        payoff: s.strategyValue,
        pnl: s.pnl,
      }));
    }

    return [];
  }

  generateSurface(): TimePriceIvSurface | null {
    if (!this.calendarResult || this.calendarResult.scenarios.length === 0) return null;

    const priceAxis: number[] = [];
    const dteAxis = [this.calendarResult.shortDte, this.calendarResult.longDte];
    const pnlMatrix: number[][] = [[], []];
    const ivMatrix: number[][] = [[], []];

    for (const scenario of this.calendarResult.scenarios) {
      if (!priceAxis.includes(scenario.underlyingPrice)) {
        priceAxis.push(scenario.underlyingPrice);
      }
    }

    for (let dteIdx = 0; dteIdx < dteAxis.length; dteIdx++) {
      for (const price of priceAxis) {
        const scenario = this.calendarResult.scenarios.find(
          s => s.underlyingPrice === price
        );
        if (scenario) {
          pnlMatrix[dteIdx].push(scenario.pnl);
          ivMatrix[dteIdx].push(scenario.impliedVolatility);
        } else {
          pnlMatrix[dteIdx].push(0);
          ivMatrix[dteIdx].push(0);
        }
      }
    }

    return { priceAxis, dteAxis, pnlMatrix, ivMatrix };
  }

  calculateRiskMetrics(): RiskMetrics {
    if (this.diagonalResult) {
      const greeks = this.diagonalResult.greeks;
      const pop = this.estimateProbabilityOfProfit(greeks.delta);

      const maxDrawdown = this.riskAnalysis
        ? Math.max(
            ...this.riskAnalysis.stopLossRules.map(r => r.currentDrawdown),
            0
          )
        : 0;

      const sharpeRatio = this.simulationResult?.backtest?.sharpeRatio ?? 0;

      return {
        netDelta: Math.round(greeks.delta * 1000) / 1000,
        netGamma: Math.round(greeks.gamma * 1000) / 1000,
        netTheta: Math.round(greeks.theta * 100) / 100,
        netVega: Math.round(greeks.vega * 100) / 100,
        probabilityOfProfit: Math.round(pop * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      };
    }

    if (this.calendarResult) {
      const delta = 0;
      const gamma = 0;
      const theta = this.calendarResult.netTheta;
      const vega = 0;
      const pop = this.estimateProbabilityOfProfit(0);

      const sharpeRatio = this.simulationResult?.backtest?.sharpeRatio ?? 0;
      const maxDrawdown = this.riskAnalysis
        ? Math.max(
            ...this.riskAnalysis.stopLossRules.map(r => r.currentDrawdown),
            0
          )
        : 0;

      return {
        netDelta: 0,
        netGamma: 0,
        netTheta: Math.round(theta * 100) / 100,
        netVega: 0,
        probabilityOfProfit: Math.round(pop * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      };
    }

    return {
      netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0,
      probabilityOfProfit: 0, maxDrawdown: 0, sharpeRatio: 0,
    };
  }

  private estimateProbabilityOfProfit(delta: number): number {
    return Math.min(0.95, Math.max(0.05, 0.5 + delta * 0.5));
  }

  generateReport(): StructuredReport {
    const strategy = this.calendarResult
      ? "calendar"
      : this.diagonalResult
        ? "diagonal"
        : "unknown";

    const optionStyle = this.calendarResult
      ? "call"
      : this.diagonalResult
        ? this.diagonalResult.greeks.delta > 0 ? "call" : "put"
        : "call";

    return {
      strategy,
      optionStyle,
      payoffCurve: this.generatePayoffCurve(),
      surface: this.generateSurface(),
      riskMetrics: this.calculateRiskMetrics(),
      deterministic: this.simulationResult?.deterministic ?? [],
      generatedAt: new Date().toISOString(),
    };
  }

  toJson(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }
}
