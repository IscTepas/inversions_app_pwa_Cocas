import { TermStrategyContract, type OptionStyle, type TermLeg } from "./termStrategyContract";
import {
  blackScholesPrice,
  blackScholesTheta,
  interpolateIv,
  daysToExpiration,
} from "./termUtils";

export interface CalendarScenario {
  underlyingPrice: number;
  strategyValue: number;
  pnl: number;
  theta: number;
  impliedVolatility: number;
}

export interface CalendarSpreadResult {
  shortDte: number;
  longDte: number;
  shortTheta: number;
  longTheta: number;
  netTheta: number;
  scenarios: CalendarScenario[];
}

export interface IvCurvePoint {
  dte: number;
  iv: number;
}

export class CalendarSpreadEngine {
  private readonly contract: TermStrategyContract;
  private readonly riskFreeRate: number;
  private readonly ivCurve: IvCurvePoint[];

  constructor(
    contract: TermStrategyContract,
    riskFreeRate: number = 0.05,
    ivCurve: IvCurvePoint[] = []
  ) {
    this.contract = contract;
    this.riskFreeRate = riskFreeRate;
    this.ivCurve = ivCurve;
  }

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

    const netTheta = shortTheta - longTheta;

    const optionStyle = shortLeg.optionStyle;

    const scenarios = this.generateScenarios(shortLeg, longLeg, shortDte, longDte, optionStyle);

    return {
      shortDte,
      longDte,
      shortTheta,
      longTheta,
      netTheta,
      scenarios,
    };
  }

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
        price, shortLeg.strike, shortT, this.riskFreeRate, shortIv, optionStyle
      ) - blackScholesTheta(
        price, longLeg.strike, longT, this.riskFreeRate, longIv, optionStyle
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

  getContract(): TermStrategyContract {
    return this.contract;
  }
}
