import { TermStrategyContract, type OptionStyle, type TermLeg } from "./termStrategyContract";
import {
  blackScholesPrice,
  blackScholesDelta,
  blackScholesGamma,
  blackScholesTheta,
  blackScholesVega,
  interpolateIv,
  daysToExpiration,
} from "./termUtils";

export type DirectionalProfile = "bullish" | "bearish" | "neutral";

export interface GreekSensitivities {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface DiagonalScenario {
  underlyingPrice: number;
  strategyValue: number;
  pnl: number;
  greeks: GreekSensitivities;
}

export interface RiskProfile {
  shortDte: number;
  longDte: number;
  greeks: GreekSensitivities;
  directionalProfile: DirectionalProfile;
  scenarios: DiagonalScenario[];
  thetaDecayProfile: DiagonalScenario[];
  vegaShockProfile: DiagonalScenario[];
  adjustmentWindow: AdjustmentWindow | null;
}

export interface AdjustmentWindow {
  daysToShortExpiration: number;
  thetaResidual: number;
  gammaExposure: number;
  recommendation: string;
}

export interface IvCurvePoint {
  dte: number;
  iv: number;
}

export class DiagonalSpreadEngine {
  private readonly contract: TermStrategyContract;
  private readonly riskFreeRate: number;
  private readonly ivCurve: IvCurvePoint[];
  private readonly thetaResidualThreshold: number;
  private readonly minDteForRoll: number;

  constructor(
    contract: TermStrategyContract,
    riskFreeRate: number = 0.05,
    ivCurve: IvCurvePoint[] = [],
    thetaResidualThreshold: number = 0.5,
    minDteForRoll: number = 7
  ) {
    this.contract = contract;
    this.riskFreeRate = riskFreeRate;
    this.ivCurve = ivCurve;
    this.thetaResidualThreshold = thetaResidualThreshold;
    this.minDteForRoll = minDteForRoll;
  }

  analyze(): RiskProfile {
    const legs = this.contract.getLegs();
    const now = new Date();

    const sortedByExpiration = [...legs].sort(
      (a, b) => a.expiration.getTime() - b.expiration.getTime()
    );

    const shortLeg = sortedByExpiration[0];
    const longLeg = sortedByExpiration[sortedByExpiration.length - 1];

    const shortDte = daysToExpiration(shortLeg.expiration, now);
    const longDte = daysToExpiration(longLeg.expiration, now);

    const shortT = shortDte / 365;
    const longT = longDte / 365;

    const shortIv = interpolateIv(shortDte, this.ivCurve);
    const longIv = interpolateIv(longDte, this.ivCurve);

    const optionStyle = shortLeg.optionStyle;

    const greeks = this.calculateGreeks(
      shortLeg, longLeg, shortT, longT, shortIv, longIv, optionStyle
    );

    const directionalProfile = this.identifyDirectionalProfile(greeks);

    const scenarios = this.generatePriceScenarios(
      shortLeg, longLeg, shortT, longT, shortIv, longIv, optionStyle
    );

    const thetaDecayProfile = this.generateThetaDecayProfile(
      shortLeg, longLeg, shortDte, longDte, shortIv, longIv, optionStyle
    );

    const vegaShockProfile = this.generateVegaShockProfile(
      shortLeg, longLeg, shortT, longT, shortIv, longIv, optionStyle
    );

    const adjustmentWindow = this.identifyAdjustmentWindow(
      shortDte, greeks
    );

    return {
      shortDte,
      longDte,
      greeks,
      directionalProfile,
      scenarios,
      thetaDecayProfile,
      vegaShockProfile,
      adjustmentWindow,
    };
  }

  private calculateGreeks(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortT: number,
    longT: number,
    shortIv: number,
    longIv: number,
    optionStyle: OptionStyle
  ): GreekSensitivities {
    const shortDelta = blackScholesDelta(
      shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
    );
    const longDelta = blackScholesDelta(
      longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
    );

    const shortGamma = blackScholesGamma(
      shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
    );
    const longGamma = blackScholesGamma(
      longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
    );

    const shortThetaVal = blackScholesTheta(
      shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
    );
    const longThetaVal = blackScholesTheta(
      longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
    );

    const shortVega = blackScholesVega(
      shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
    );
    const longVega = blackScholesVega(
      longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
    );

    return {
      delta: longDelta - shortDelta,
      gamma: longGamma - shortGamma,
      theta: shortThetaVal - longThetaVal,
      vega: longVega - shortVega,
    };
  }

  private identifyDirectionalProfile(greeks: GreekSensitivities): DirectionalProfile {
    if (greeks.delta > 0.3) return "bullish";
    if (greeks.delta < -0.3) return "bearish";
    return "neutral";
  }

  private generatePriceScenarios(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortT: number,
    longT: number,
    shortIv: number,
    longIv: number,
    optionStyle: OptionStyle
  ): DiagonalScenario[] {
    const scenarios: DiagonalScenario[] = [];
    const atmStrike = shortLeg.strike;
    const priceMin = atmStrike * 0.7;
    const priceMax = atmStrike * 1.3;
    const step = atmStrike * 0.02;

    for (let price = priceMin; price <= priceMax; price += step) {
      const shortPrice = blackScholesPrice(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const longPrice = blackScholesPrice(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );

      const strategyValue = longPrice - shortPrice;

      const atmShortPrice = blackScholesPrice(
        shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const atmLongPrice = blackScholesPrice(
        longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );
      const initialValue = atmLongPrice - atmShortPrice;
      const pnl = strategyValue - initialValue;

      const delta = blackScholesDelta(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      ) - blackScholesDelta(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );
      const gamma = blackScholesGamma(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      ) - blackScholesGamma(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );
      const theta = blackScholesTheta(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      ) - blackScholesTheta(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );
      const vega = blackScholesVega(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      ) - blackScholesVega(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );

      scenarios.push({
        underlyingPrice: Math.round(price * 100) / 100,
        strategyValue: Math.round(strategyValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        greeks: {
          delta: Math.round(delta * 1000) / 1000,
          gamma: Math.round(gamma * 1000) / 1000,
          theta: Math.round(theta * 100) / 100,
          vega: Math.round(vega * 100) / 100,
        },
      });
    }

    return scenarios;
  }

  private generateThetaDecayProfile(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortDte: number,
    longDte: number,
    shortIv: number,
    longIv: number,
    optionStyle: OptionStyle
  ): DiagonalScenario[] {
    const scenarios: DiagonalScenario[] = [];
    const atmStrike = shortLeg.strike;

    for (let dte = longDte; dte >= 1; dte -= 5) {
      if (dte < shortDte && dte % 5 !== 0 && dte !== longDte) continue;

      const shortT = dte / 365;
      const longT = Math.max(dte, longDte - (longDte - shortDte)) / 365;

      if (dte < shortDte) {
        const shortPrice = 0;
        const longPrice = blackScholesPrice(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const strategyValue = longPrice - shortPrice;

        const delta = -blackScholesDelta(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const gamma = -blackScholesGamma(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const theta = -blackScholesTheta(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const vega = -blackScholesVega(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );

        scenarios.push({
          underlyingPrice: atmStrike,
          strategyValue: Math.round(strategyValue * 100) / 100,
          pnl: 0,
          greeks: {
            delta: Math.round(delta * 1000) / 1000,
            gamma: Math.round(gamma * 1000) / 1000,
            theta: Math.round(theta * 100) / 100,
            vega: Math.round(vega * 100) / 100,
          },
        });
      } else {
        const localShortT = shortDte / 365;
        const localLongT = longDte / 365;

        const shortPrice = blackScholesPrice(
          atmStrike, shortLeg.strike, localShortT, this.riskFreeRate, shortIv, optionStyle
        );
        const longPrice = blackScholesPrice(
          atmStrike, longLeg.strike, localLongT, this.riskFreeRate, longIv, optionStyle
        );
        const strategyValue = longPrice - shortPrice;

        const delta = blackScholesDelta(
          atmStrike, shortLeg.strike, localShortT, this.riskFreeRate, shortIv, optionStyle
        ) - blackScholesDelta(
          atmStrike, longLeg.strike, localLongT, this.riskFreeRate, longIv, optionStyle
        );
        const gamma = blackScholesGamma(
          atmStrike, shortLeg.strike, localShortT, this.riskFreeRate, shortIv, optionStyle
        ) - blackScholesGamma(
          atmStrike, longLeg.strike, localLongT, this.riskFreeRate, longIv, optionStyle
        );
        const theta = blackScholesTheta(
          atmStrike, shortLeg.strike, localShortT, this.riskFreeRate, shortIv, optionStyle
        ) - blackScholesTheta(
          atmStrike, longLeg.strike, localLongT, this.riskFreeRate, longIv, optionStyle
        );
        const vega = blackScholesVega(
          atmStrike, shortLeg.strike, localShortT, this.riskFreeRate, shortIv, optionStyle
        ) - blackScholesVega(
          atmStrike, longLeg.strike, localLongT, this.riskFreeRate, longIv, optionStyle
        );

        scenarios.push({
          underlyingPrice: atmStrike,
          strategyValue: Math.round(strategyValue * 100) / 100,
          pnl: 0,
          greeks: {
            delta: Math.round(delta * 1000) / 1000,
            gamma: Math.round(gamma * 1000) / 1000,
            theta: Math.round(theta * 100) / 100,
            vega: Math.round(vega * 100) / 100,
          },
        });
      }
    }

    return scenarios;
  }

  private generateVegaShockProfile(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortT: number,
    longT: number,
    baseShortIv: number,
    baseLongIv: number,
    optionStyle: OptionStyle
  ): DiagonalScenario[] {
    const scenarios: DiagonalScenario[] = [];
    const ivShocks = [-0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1];
    const atmStrike = shortLeg.strike;

    for (const shock of ivShocks) {
      const shortIv = Math.max(0.05, baseShortIv + shock);
      const longIv = Math.max(0.05, baseLongIv + shock);

      const shortPrice = blackScholesPrice(
        atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const longPrice = blackScholesPrice(
        atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );

      const strategyValue = longPrice - shortPrice;

      const baseShortPrice = blackScholesPrice(
        atmStrike, shortLeg.strike, shortT, this.riskFreeRate, baseShortIv, optionStyle
      );
      const baseLongPrice = blackScholesPrice(
        atmStrike, longLeg.strike, longT, this.riskFreeRate, baseLongIv, optionStyle
      );
      const baseValue = baseLongPrice - baseShortPrice;
      const pnl = strategyValue - baseValue;

      const shortVega = blackScholesVega(
        atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const longVega = blackScholesVega(
        atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );

      scenarios.push({
        underlyingPrice: atmStrike,
        strategyValue: Math.round(strategyValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        greeks: {
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: Math.round((longVega - shortVega) * 100) / 100,
        },
      });
    }

    return scenarios;
  }

  private identifyAdjustmentWindow(
    shortDte: number,
    greeks: GreekSensitivities
  ): AdjustmentWindow | null {
    const approachingExpiration = shortDte <= this.minDteForRoll;
    const lowThetaResidual = Math.abs(greeks.theta) < this.thetaResidualThreshold;
    const highGammaExposure = Math.abs(greeks.gamma) > 0.05;

    if (!approachingExpiration && !lowThetaResidual && !highGammaExposure) {
      return null;
    }

    const reasons: string[] = [];
    if (approachingExpiration) reasons.push(`Short expiration in ${shortDte} days`);
    if (lowThetaResidual) reasons.push(`Theta residual (${Math.round(Math.abs(greeks.theta) * 100) / 100}) below threshold (${this.thetaResidualThreshold})`);
    if (highGammaExposure) reasons.push(`Gamma exposure (${Math.round(greeks.gamma * 1000) / 1000}) exceeds threshold (0.05)`);

    const recommendation = `Consider rolling: ${reasons.join("; ")}.`;

    return {
      daysToShortExpiration: shortDte,
      thetaResidual: Math.round(Math.abs(greeks.theta) * 100) / 100,
      gammaExposure: Math.round(greeks.gamma * 1000) / 1000,
      recommendation,
    };
  }

  getContract(): TermStrategyContract {
    return this.contract;
  }
}
