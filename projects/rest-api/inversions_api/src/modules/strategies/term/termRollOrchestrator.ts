import { TermStrategyContract, type TermLeg } from "./termStrategyContract";
import { blackScholesPrice, daysToExpiration } from "./termUtils";
import type { RiskAnalysis } from "./termRiskEngine";

export type RollTriggerType = "calendar" | "trigger" | "hybrid";

export interface RollSchedule {
  type: RollTriggerType;
  daysBeforeExpiration: number[];
  periodicDays?: number;
}

export interface RollTriggerEvaluation {
  thetaResidualTriggered: boolean;
  gammaExposureTriggered: boolean;
  dteMinTriggered: boolean;
  riskLimitViolationTriggered: boolean;
  triggered: boolean;
  reasons: string[];
}

export interface RollCost {
  premiumDifferential: number;
  transactionCost: number;
  totalCost: number;
  postRollRiskDelta: number;
  postRollRiskTheta: number;
}

export interface RollRecommendation {
  shouldRoll: boolean;
  shouldCloseEarly: boolean;
  triggers: RollTriggerEvaluation;
  cost: RollCost | null;
  recommendation: string;
  timing: string;
}

export class TermRollOrchestrator {
  private readonly contract: TermStrategyContract;
  private readonly riskAnalysis: RiskAnalysis | null;
  private readonly netTheta: number;
  private readonly netGamma: number;
  private readonly schedule: RollSchedule;
  private readonly thetaResidualThreshold: number;
  private readonly minDteForRoll: number;

  constructor(
    contract: TermStrategyContract,
    riskAnalysis: RiskAnalysis | null,
    netTheta: number,
    netGamma: number = 0,
    schedule?: Partial<RollSchedule>,
    thetaResidualThreshold?: number,
    minDteForRoll?: number
  ) {
    this.contract = contract;
    this.riskAnalysis = riskAnalysis;
    this.netTheta = netTheta;
    this.netGamma = netGamma;
    this.thetaResidualThreshold = thetaResidualThreshold ?? 0.5;
    this.minDteForRoll = minDteForRoll ?? 7;

    this.schedule = {
      type: "hybrid",
      daysBeforeExpiration: [7, 3, 1],
      periodicDays: 5,
      ...schedule,
    };
  }

  evaluate(): RollRecommendation {
    const legs = this.contract.getLegs();
    const now = new Date();

    const sortedByExpiration = [...legs].sort(
      (a, b) => a.expiration.getTime() - b.expiration.getTime()
    );
    const shortLeg = sortedByExpiration[0];
    const longLeg = sortedByExpiration[sortedByExpiration.length - 1];

    const shortDte = daysToExpiration(shortLeg.expiration, now);
    const longDte = daysToExpiration(longLeg.expiration, now);

    const triggers = this.evaluateTriggers(shortDte);
    const cost = this.calculateRollCost(shortLeg, longLeg, shortDte);

    let shouldRoll = triggers.triggered;
    let shouldCloseEarly = false;

    if (this.riskAnalysis?.limitsViolation) {
      shouldRoll = true;
      shouldCloseEarly = true;
    }

    if (shortDte <= 0) {
      shouldRoll = false;
      shouldCloseEarly = true;
    }

    const recommendation = this.buildRecommendation(
      triggers, shouldRoll, shouldCloseEarly, cost, shortDte, longDte
    );

    const timing = this.suggestTiming(shortDte);

    return { shouldRoll, shouldCloseEarly, triggers, cost, recommendation, timing };
  }

  private evaluateTriggers(shortDte: number): RollTriggerEvaluation {
    const reasons: string[] = [];
    const thetaResidualTriggered = Math.abs(this.netTheta) < this.thetaResidualThreshold;
    const gammaExposureTriggered = Math.abs(this.netGamma) > 0.05;
    const dteMinTriggered = shortDte <= this.minDteForRoll;
    const riskLimitViolationTriggered = this.riskAnalysis?.limitsViolation ?? false;

    if (thetaResidualTriggered) reasons.push(`Theta residual ${Math.abs(this.netTheta).toFixed(2)} below threshold ${this.thetaResidualThreshold}`);
    if (gammaExposureTriggered) reasons.push(`Gamma exposure ${Math.abs(this.netGamma).toFixed(3)} exceeds 0.05`);
    if (dteMinTriggered) reasons.push(`Short DTE (${shortDte}) at or below minimum (${this.minDteForRoll})`);
    if (riskLimitViolationTriggered) reasons.push("Risk limit violation detected");

    return {
      thetaResidualTriggered,
      gammaExposureTriggered,
      dteMinTriggered,
      riskLimitViolationTriggered,
      triggered: thetaResidualTriggered || gammaExposureTriggered || dteMinTriggered || riskLimitViolationTriggered,
      reasons,
    };
  }

  private calculateRollCost(
    shortLeg: TermLeg,
    longLeg: TermLeg,
    shortDte: number
  ): RollCost | null {
    if (shortDte <= 0) return null;

    const shortT = shortDte / 365;
    const longT = (shortDte + 30) / 365;

    const currentShortPrice = blackScholesPrice(
      shortLeg.strike, shortLeg.strike, shortT, 0.05, 0.2, shortLeg.optionStyle
    );
    const newShortPrice = blackScholesPrice(
      shortLeg.strike, shortLeg.strike, longT, 0.05, 0.2, shortLeg.optionStyle
    );

    const premiumDifferential = newShortPrice - currentShortPrice;
    const transactionCost = 0.01 * (currentShortPrice + newShortPrice);

    return {
      premiumDifferential: Math.round(premiumDifferential * 100) / 100,
      transactionCost: Math.round(transactionCost * 100) / 100,
      totalCost: Math.round((premiumDifferential + transactionCost) * 100) / 100,
      postRollRiskDelta: Math.round(0.3 * 1000) / 1000,
      postRollRiskTheta: Math.round(this.netTheta * 1.2 * 100) / 100,
    };
  }

  private buildRecommendation(
    triggers: RollTriggerEvaluation,
    shouldRoll: boolean,
    shouldCloseEarly: boolean,
    cost: RollCost | null,
    shortDte: number,
    longDte: number
  ): string {
    if (shouldCloseEarly && shortDte <= 0) {
      return "Short leg has expired. Close position immediately.";
    }

    if (shouldCloseEarly && this.riskAnalysis?.limitsViolation) {
      return "Risk limits violated. Recommend closing position early to reduce exposure.";
    }

    if (shouldRoll && cost) {
      return `Roll recommended. Short DTE: ${shortDte}, Long DTE: ${longDte}. ` +
        `Estimated roll cost: $${cost.totalCost}. ` +
        `Triggers: ${triggers.reasons.join("; ")}.`;
    }

    if (shouldRoll) {
      return `Roll recommended but cost could not be estimated. Triggers: ${triggers.reasons.join("; ")}.`;
    }

    return `No roll needed. Short DTE: ${shortDte}, Theta residual: ${Math.abs(this.netTheta).toFixed(2)}.`;
  }

  private suggestTiming(shortDte: number): string {
    if (shortDte <= 0) return "Immediate";
    if (shortDte <= 3) return "Today";
    if (shortDte <= 7) return "Within 2 days";
    if (shortDte <= 14) return "Within this week";
    return `In ${Math.floor(shortDte / 7)} weeks`;
  }

  getContract(): TermStrategyContract {
    return this.contract;
  }
}
