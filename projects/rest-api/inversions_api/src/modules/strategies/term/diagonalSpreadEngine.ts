/**
 * diagonalSpreadEngine.ts — T164
 * Proposito: Motor de analisis de Diagonal Spread (strikes Y expiraciones diferentes).
 * Calcula las 4 griegas (delta/gamma/theta/vega), perfiles de riesgo, ventanas de ajuste/roll.
 * Llamado por: termSimulationEngine (simula escenarios con DiagonalSpreadEngine),
 *              routes/strategies/term/diagonalSpread (POST /diagonal),
 *              routes/strategies/term/termComparator (POST /compare)
 * Dependencias: termStrategyContract (tipos y validacion), termUtils (Black-Scholes completo)
 */
import { TermStrategyContract, type OptionStyle, type TermLeg } from "./termStrategyContract";
import {
  blackScholesPrice,
  blackScholesDelta,
  blackScholesGamma,
  blackScholesTheta,
  blackScholesVega,
  interpolateIv,
  daysToExpiration,
  estimateForwardIv,
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

export interface DiagonalStressTest {
  label: string;
  description: string;
  underlyingPrice: number;
  shortIv: number;
  longIv: number;
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
  stressTests: DiagonalStressTest[];
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

  /** Construye el engine con contrato validado, tasa libre de riesgo, curva IV, umbral de theta residual y DTE minimo para roll */
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

  /** Analiza el Diagonal Spread: calcula griegas, perfil direccional, escenarios de precio, theta decay, vega shock y ventana de ajuste. Llamado por diagonalSpread.ts POST /diagonal */
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

    const stressTests = this.generateStressTests(
      shortLeg, longLeg, shortT, longT, shortIv, longIv, optionStyle
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
      stressTests,
    };
  }

  /** Calcula las 4 griegas (delta/gamma/theta/vega) netas = larga - corta */
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
      theta: longThetaVal - shortThetaVal,
      vega: longVega - shortVega,
    };
  }

  /** Clasifica perfil direccional: bullish (delta > 0.3), bearish (delta < -0.3), neutral */
  private identifyDirectionalProfile(greeks: GreekSensitivities): DirectionalProfile {
    if (greeks.delta > 0.3) return "bullish";
    if (greeks.delta < -0.3) return "bearish";
    return "neutral";
  }

  /** Genera escenarios de precio [70%-130%] con valor estrategia, P&L y griegas por punto */
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
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      ) - blackScholesDelta(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const gamma = blackScholesGamma(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      ) - blackScholesGamma(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const theta = blackScholesTheta(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      ) - blackScholesTheta(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const vega = blackScholesVega(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      ) - blackScholesVega(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
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

  /** Genera perfil de theta decay a lo largo del tiempo (DTE decreciente de 5 en 5). Despues de expiracion corta, solo queda la pata larga. Las T usan el DTE remanente real = original - dias transcurridos */
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

    for (let longRemaining = longDte; longRemaining >= 1; longRemaining -= 5) {
      const shortRemaining = Math.max(0, shortDte - (longDte - longRemaining));
      const shortExpired = shortRemaining <= 0;

      if (shortExpired) {
        const longT = longRemaining / 365;
        const longPrice = blackScholesPrice(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const strategyValue = longPrice;

        const delta = blackScholesDelta(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const gamma = blackScholesGamma(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const thetaTerm = blackScholesTheta(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const vega = blackScholesVega(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );

        scenarios.push({
          underlyingPrice: atmStrike,
          strategyValue: Math.round(strategyValue * 100) / 100,
          pnl: 0,
          greeks: {
            delta: Math.round(delta * 1000) / 1000,
            gamma: Math.round(gamma * 1000) / 1000,
            theta: Math.round(thetaTerm * 100) / 100,
            vega: Math.round(vega * 100) / 100,
          },
        });
      } else {
        const shortT = shortRemaining / 365;
        const longT = longRemaining / 365;

        const shortPrice = blackScholesPrice(
          atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
        );
        const longPrice = blackScholesPrice(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        );
        const strategyValue = longPrice - shortPrice;

        const delta = blackScholesDelta(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        ) - blackScholesDelta(
          atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
        );
        const gamma = blackScholesGamma(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        ) - blackScholesGamma(
          atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
        );
        const thetaTerm = blackScholesTheta(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        ) - blackScholesTheta(
          atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
        );
        const vega = blackScholesVega(
          atmStrike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
        ) - blackScholesVega(
          atmStrike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
        );

        scenarios.push({
          underlyingPrice: atmStrike,
          strategyValue: Math.round(strategyValue * 100) / 100,
          pnl: 0,
          greeks: {
            delta: Math.round(delta * 1000) / 1000,
            gamma: Math.round(gamma * 1000) / 1000,
            theta: Math.round(thetaTerm * 100) / 100,
            vega: Math.round(vega * 100) / 100,
          },
        });
      }
    }

    return scenarios;
  }

  /** Genera perfil de sensibilidad a cambios en IV (-10%, -5%, -2%, 0%, +2%, +5%, +10%) */
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

  /** Identifica si hay ventana de ajuste/roll basado en: proximidad a expiracion, theta residual bajo, gamma exposure alto */
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

  /** Genera escenarios de stress: crash, rally, IV expansion/contraction, volatility spike.
   *  Similar a calendar pero con griegas completas para diagonal. */
  private generateStressTests(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortT: number,
    longT: number,
    baseShortIv: number,
    baseLongIv: number,
    optionStyle: OptionStyle
  ): DiagonalStressTest[] {
    const atm = shortLeg.strike;
    const forwardIv = estimateForwardIv(baseShortIv, baseLongIv, shortT, longT);

    const atmShortPrice = blackScholesPrice(atm, shortLeg.strike, shortT, this.riskFreeRate, baseShortIv, optionStyle);
    const atmLongPrice = blackScholesPrice(atm, longLeg.strike, longT, this.riskFreeRate, baseLongIv, optionStyle);
    const initialValue = atmLongPrice - atmShortPrice;

    const tests: Array<{ label: string; description: string; price: number; shortIvMult: number; longIvMult: number }> = [
      { label: "Market Crash",      description: "Underying drops 20%, IV spikes +50%", price: atm * 0.8,  shortIvMult: 1.5, longIvMult: 1.5 },
      { label: "Sharp Rally",       description: "Underying jumps 15%, IV drops 20%", price: atm * 1.15, shortIvMult: 0.8, longIvMult: 0.8 },
      { label: "IV Expansion",      description: "IV expands +50% across all tenors",  price: atm,        shortIvMult: 1.5, longIvMult: 1.5 },
      { label: "IV Contraction",    description: "IV contracts 30% across all tenors",price: atm,        shortIvMult: 0.7, longIvMult: 0.7 },
      { label: "Volatility Spike",  description: "Short IV spikes +80%, long IV +30%",price: atm,        shortIvMult: 1.8, longIvMult: 1.3 },
    ];

    return tests.map(t => {
      const shortIv = Math.max(0.05, baseShortIv * t.shortIvMult);
      const longIv = Math.max(0.05, baseLongIv * t.longIvMult);
      const shortP = blackScholesPrice(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);
      const longP = blackScholesPrice(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle);
      const strategyValue = longP - shortP;
      const pnl = strategyValue - initialValue;

      const delta = blackScholesDelta(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle)
        - blackScholesDelta(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);
      const gamma = blackScholesGamma(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle)
        - blackScholesGamma(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);
      const theta = blackScholesTheta(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle)
        - blackScholesTheta(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);
      const vega = blackScholesVega(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle)
        - blackScholesVega(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);

      return {
        label: t.label,
        description: t.description,
        underlyingPrice: Math.round(t.price * 100) / 100,
        shortIv: Math.round(shortIv * 100) / 100,
        longIv: Math.round(longIv * 100) / 100,
        strategyValue: Math.round(strategyValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        greeks: {
          delta: Math.round(delta * 1000) / 1000,
          gamma: Math.round(gamma * 1000) / 1000,
          theta: Math.round(theta * 100) / 100,
          vega: Math.round(vega * 100) / 100,
        },
      };
    });
  }

  /** Retorna el contrato. Usado por termSimulationEngine y routes */
  getContract(): TermStrategyContract {
    return this.contract;
  }
}
