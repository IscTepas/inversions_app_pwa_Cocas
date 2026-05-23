/**
 * calendarSpreadEngine.ts — T163
 * Proposito: Motor de analisis de Calendar Spread (mismo strike, expiraciones diferentes).
 * Calcula theta decay, escenarios de precio y perfil de riesgo para variantes call/put.
 * Llamado por: termSimulationEngine (simula escenarios con CalendarSpreadEngine),
 *              routes/strategies/term/calendarSpread (POST /calendar),
 *              routes/strategies/term/termComparator (POST /compare)
 * Dependencias: termStrategyContract (tipos y validacion), termUtils (Black-Scholes)
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

export interface GreekSensitivities {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface CalendarScenario {
  underlyingPrice: number;
  strategyValue: number;
  pnl: number;
  theta: number;
  impliedVolatility: number;
}

export interface CalendarStressTest {
  label: string;
  description: string;
  underlyingPrice: number;
  shortIv: number;
  longIv: number;
  strategyValue: number;
  pnl: number;
  theta: number;
}

export interface CalendarSpreadResult {
  shortDte: number;
  longDte: number;
  shortTheta: number;
  longTheta: number;
  netTheta: number;
  greeks: GreekSensitivities;
  scenarios: CalendarScenario[];
  stressTests: CalendarStressTest[];
}

export interface IvCurvePoint {
  dte: number;
  iv: number;
}

export class CalendarSpreadEngine {
  private readonly contract: TermStrategyContract;
  private readonly riskFreeRate: number;
  private readonly ivCurve: IvCurvePoint[];

  /** Construye el engine con un contrato validado, tasa libre de riesgo (default 5%) y curva IV opcional */
  constructor(
    contract: TermStrategyContract,
    riskFreeRate: number = 0.05,
    ivCurve: IvCurvePoint[] = []
  ) {
    this.contract = contract;
    this.riskFreeRate = riskFreeRate;
    this.ivCurve = ivCurve;
  }

  /** Analiza el Calendar Spread: ordena legs por expiracion, calcula DTE, thetas (corta/larga/neto) y genera escenarios de precio. Llamado por calendarSpread.ts ruta POST /calendar */
  analyze(): CalendarSpreadResult {
    const legs = this.contract.getLegs();
    const now = new Date();

    const sortedByExpiration = [...legs].sort(
      (a, b) => a.expiration.getTime() - b.expiration.getTime()
    );

    const shortLeg = sortedByExpiration[0];
    const longLeg = sortedByExpiration[sortedByExpiration.length - 1];

    const shortDte = daysToExpiration(shortLeg.expiration, now);
    const longDte = daysToExpiration(longLeg.expiration, now);

    const shortIv = interpolateIv(shortDte, this.ivCurve);
    const longIv = interpolateIv(longDte, this.ivCurve);

    const shortT = shortDte / 365;
    const longT = longDte / 365;

    const shortTheta = blackScholesTheta(
      shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, shortLeg.optionStyle
    );
    const longTheta = blackScholesTheta(
      longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, longLeg.optionStyle
    );

    const netTheta = longTheta - shortTheta;

    const shortDelta = blackScholesDelta(shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, shortLeg.optionStyle);
    const longDelta = blackScholesDelta(longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, longLeg.optionStyle);
    const netDelta = longDelta - shortDelta;

    const shortGamma = blackScholesGamma(shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, shortLeg.optionStyle);
    const longGamma = blackScholesGamma(longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, longLeg.optionStyle);
    const netGamma = longGamma - shortGamma;

    const shortVega = blackScholesVega(shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, shortLeg.optionStyle);
    const longVega = blackScholesVega(longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, longLeg.optionStyle);
    const netVega = longVega - shortVega;

    const optionStyle = shortLeg.optionStyle;

    const scenarios = this.generateScenarios(shortLeg, longLeg, shortDte, longDte, optionStyle);
    const stressTests = this.generateStressTests(shortLeg, longLeg, shortDte, longDte, optionStyle, shortIv, longIv);

    return {
      shortDte,
      longDte,
      shortTheta,
      longTheta,
      netTheta,
      greeks: {
        delta: Math.round(netDelta * 1000) / 1000,
        gamma: Math.round(netGamma * 1000) / 1000,
        theta: Math.round(netTheta * 100) / 100,
        vega: Math.round(netVega * 100) / 100,
      },
      scenarios,
      stressTests,
    };
  }

  /** Genera escenarios de precio en rango [70%-130%] del strike, calculando valor estrategia, P&L, theta e IV para cada punto */
  private generateScenarios(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortDte: number,
    longDte: number,
    optionStyle: OptionStyle
  ): CalendarScenario[] {
    const scenarios: CalendarScenario[] = [];
    const atmStrike = shortLeg.strike;
    const priceMin = atmStrike * 0.7;
    const priceMax = atmStrike * 1.3;
    const step = atmStrike * 0.02;

    const shortT = shortDte / 365;
    const longT = longDte / 365;

    for (let price = priceMin; price <= priceMax; price += step) {
      const shortIv = interpolateIv(shortDte, this.ivCurve);
      const longIv = interpolateIv(longDte, this.ivCurve);

      const shortPrice = blackScholesPrice(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const longPrice = blackScholesPrice(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );

      const strategyValue = longPrice - shortPrice;
      const initialShortPrice = blackScholesPrice(
        shortLeg.strike, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );
      const initialLongPrice = blackScholesPrice(
        longLeg.strike, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      );
      const initialValue = initialLongPrice - initialShortPrice;
      const pnl = strategyValue - initialValue;

      const theta = blackScholesTheta(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
      ) - blackScholesTheta(
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      );

      scenarios.push({
        underlyingPrice: Math.round(price * 100) / 100,
        strategyValue: Math.round(strategyValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        theta: Math.round(theta * 100) / 100,
        impliedVolatility: Math.round(longIv * 100) / 100,
      });
    }

    return scenarios;
  }

  /** Genera escenarios de stress: crash, gap up, IV expansion, IV contraction, volatility spike.
   *  Evalua el impacto extremo en el valor de la estrategia y P&L. */
  private generateStressTests(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortDte: number,
    longDte: number,
    optionStyle: OptionStyle,
    baseShortIv: number,
    baseLongIv: number
  ): CalendarStressTest[] {
    const shortT = shortDte / 365;
    const longT = longDte / 365;
    const atm = shortLeg.strike;
    const forwardIv = estimateForwardIv(baseShortIv, baseLongIv, shortT, longT);

    const initialShortPrice = blackScholesPrice(atm, shortLeg.strike, shortT, this.riskFreeRate, baseShortIv, optionStyle);
    const initialLongPrice = blackScholesPrice(atm, longLeg.strike, longT, this.riskFreeRate, baseLongIv, optionStyle);
    const initialValue = initialLongPrice - initialShortPrice;

    const tests: Array<{ label: string; description: string; price: number; shortIvMult: number; longIvMult: number }> = [
      { label: "Market Crash",      description: "Underying drops 20%, IV spikes +50%", price: atm * 0.8,  shortIvMult: 1.5, longIvMult: 1.5 },
      { label: "Sharp Rally",       description: "Underying jumps 15%, IV drops 20%", price: atm * 1.15, shortIvMult: 0.8, longIvMult: 0.8 },
      { label: "IV Expansion",      description: "IV expands +50% across all tenors",  price: atm,        shortIvMult: 1.5, longIvMult: 1.5 },
      { label: "IV Contraction",    description: "IV contracts 30% across all tenors",price: atm,        shortIvMult: 0.7, longIvMult: 0.7 },
      { label: "Volatility Spike",  description: "Short IV spikes +80%, long IV +30%",price: atm,        shortIvMult: 1.8, longIvMult: 1.3 },
    ];

    return tests.map(t => {
      const shortIv = baseShortIv * t.shortIvMult;
      const longIv = baseLongIv * t.longIvMult;
      const shortP = blackScholesPrice(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);
      const longP = blackScholesPrice(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle);
      const strategyValue = longP - shortP;
      const pnl = strategyValue - initialValue;
      const theta = blackScholesTheta(t.price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle)
        - blackScholesTheta(t.price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle);

      return {
        label: t.label,
        description: t.description,
        underlyingPrice: Math.round(t.price * 100) / 100,
        shortIv: Math.round(shortIv * 100) / 100,
        longIv: Math.round(longIv * 100) / 100,
        strategyValue: Math.round(strategyValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        theta: Math.round(theta * 100) / 100,
      };
    });
  }

  /** Retorna el contrato original. Usado por termSimulationEngine para leer legs durante simulacion */
  getContract(): TermStrategyContract {
    return this.contract;
  }
}
