export type OptionStyle = 'call' | 'put';

export type StrategyType = 'calendar' | 'diagonal';

export interface TermLeg {
  strike: number;
  expiration: Date;
  premium: number;
  contracts: number;
  optionStyle: OptionStyle;
}

export interface TermStrategyInput {
  legs: TermLeg[];
  underlying?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: TermStrategyError[];
}

export class TermStrategyError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly field?: string
  ) {}

  static temporalInconsistency(field: string, detail: string): TermStrategyError {
    return new TermStrategyError('TEMPORAL_INCONSISTENCY', detail, field);
  }

  static invalidOptionStyle(value: string): TermStrategyError {
    return new TermStrategyError('INVALID_OPTION_STYLE', `Invalid option style: '${value}'. Must be 'call' or 'put'.`, 'optionStyle');
  }

  static insufficientLegs(count: number): TermStrategyError {
    return new TermStrategyError('INSUFFICIENT_LEGS', `Expected at least 2 legs, got ${count}.`, 'legs');
  }

  static inconsistentUnderlying(): TermStrategyError {
    return new TermStrategyError('INCONSISTENT_UNDERLYING', 'All legs must share the same underlying asset.', 'underlying');
  }

  static invalidConfiguration(detail: string): TermStrategyError {
    return new TermStrategyError('INVALID_CONFIGURATION', detail);
  }

  static invalidDateFormat(field: string, detail: string): TermStrategyError {
    return new TermStrategyError('INVALID_DATE_FORMAT', detail, field);
  }

  static expirationInPast(field: string, detail: string): TermStrategyError {
    return new TermStrategyError('EXPIRATION_IN_PAST', detail, field);
  }
}

export class TermStrategyContract {
  private readonly input: TermStrategyInput;

  constructor(input: TermStrategyInput) {
    this.input = input;
  }

  validate(): ValidationResult {
    const errors: TermStrategyError[] = [];

    const legErrors = this.validateLegs();
    errors.push(...legErrors);

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const temporalErrors = this.validateTemporalConsistency();
    errors.push(...temporalErrors);

    const styleErrors = this.validateOptionStyleConsistency();
    errors.push(...styleErrors);

    return { isValid: errors.length === 0, errors };
  }

  private validateLegs(): TermStrategyError[] {
    const errors: TermStrategyError[] = [];

    if (!this.input.legs || this.input.legs.length < 2) {
      errors.push(TermStrategyError.insufficientLegs(this.input.legs?.length ?? 0));
      return errors;
    }

    for (let i = 0; i < this.input.legs.length; i++) {
      const leg = this.input.legs[i];
      if (leg.strike <= 0) {
        errors.push(TermStrategyError.invalidConfiguration(`Leg ${i}: strike must be positive.`));
      }
      if (leg.premium < 0) {
        errors.push(TermStrategyError.invalidConfiguration(`Leg ${i}: premium cannot be negative.`));
      }
      if (leg.contracts <= 0) {
        errors.push(TermStrategyError.invalidConfiguration(`Leg ${i}: contracts must be positive.`));
      }
      if (leg.optionStyle !== 'call' && leg.optionStyle !== 'put') {
        errors.push(TermStrategyError.invalidOptionStyle(String(leg.optionStyle)));
      }
      const expTime = leg.expiration.getTime();
      if (isNaN(expTime)) {
        errors.push(TermStrategyError.invalidDateFormat(`Leg ${i}.expiration`, `Leg ${i}: expiration date is invalid.`));
      } else {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (expTime < oneDayAgo) {
          errors.push(TermStrategyError.expirationInPast(`Leg ${i}.expiration`, `Leg ${i}: expiration date is in the past.`));
        }
      }
    }

    const callOrPut = this.input.legs[0].optionStyle;
    const allSameStyle = this.input.legs.every(l => l.optionStyle === callOrPut);
    if (!allSameStyle) {
      errors.push(TermStrategyError.invalidConfiguration('All legs must have the same option style (all calls or all puts).'));
    }

    return errors;
  }

  private validateTemporalConsistency(): TermStrategyError[] {
    const errors: TermStrategyError[] = [];
    const minExpirationDiffDays = 7;

    const sortedByExpiration = [...this.input.legs].sort(
      (a, b) => a.expiration.getTime() - b.expiration.getTime()
    );

    const shortExp = sortedByExpiration[0].expiration;
    const longExp = sortedByExpiration[sortedByExpiration.length - 1].expiration;

    if (shortExp.getTime() >= longExp.getTime()) {
      errors.push(
        TermStrategyError.temporalInconsistency(
          'expiration',
          'Short expiration must be before long expiration.'
        )
      );
    }

    const diffMs = longExp.getTime() - shortExp.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < minExpirationDiffDays) {
      errors.push(
        TermStrategyError.temporalInconsistency(
          'expiration',
          `Minimum expiration difference is ${minExpirationDiffDays} days, got ${Math.round(diffDays)}.`
        )
      );
    }

    return errors;
  }

  private validateOptionStyleConsistency(): TermStrategyError[] {
    const errors: TermStrategyError[] = [];

    const strikes = this.input.legs.map(l => l.strike);
    const uniqueStrikes = new Set(strikes);
    const expirations = this.input.legs.map(l => l.expiration.getTime());
    const uniqueExpirations = new Set(expirations);

    const allSameStrike = uniqueStrikes.size === 1;
    const allSameExpiration = uniqueExpirations.size === 1;

    if (allSameStrike && !allSameExpiration) {
      return errors;
    }

    if (!allSameStrike && !allSameExpiration) {
      return errors;
    }

    if (allSameStrike && allSameExpiration) {
      errors.push(
        TermStrategyError.invalidConfiguration(
          'Both legs have the same strike and expiration. This is not a valid Calendar or Diagonal spread.'
        )
      );
    }

    if (!allSameStrike && allSameExpiration) {
      errors.push(
        TermStrategyError.invalidConfiguration(
          'Different strikes with same expiration is not a Calendar or Diagonal spread (this is a vertical spread).'
        )
      );
    }

    return errors;
  }

  getType(): StrategyType {
    const strikes = this.input.legs.map(l => l.strike);
    const uniqueStrikes = new Set(strikes);

    if (uniqueStrikes.size === 1) {
      return 'calendar';
    }
    return 'diagonal';
  }

  getLegs(): TermLeg[] {
    return [...this.input.legs];
  }

  getInput(): TermStrategyInput {
    return { ...this.input, legs: [...this.input.legs] };
  }
}
