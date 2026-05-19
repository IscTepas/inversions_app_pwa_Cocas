import type { OptionStyle } from "./termStrategyContract";

export function cumulativeNormal(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  if (x < -10) return 0;
  if (x > 10) return 1;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const poly = (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t;
  const pdf = Math.exp(-0.5 * absX * absX) / Math.sqrt(2 * Math.PI);
  const cnd = 1 - pdf * poly;

  return sign < 0 ? 1 - cnd : cnd;
}

export function blackScholesPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionStyle: OptionStyle
): number {
  if (T <= 0) {
    const intrinsic = optionStyle === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
    return intrinsic;
  }
  if (sigma <= 0 || S <= 0 || K <= 0) return 0;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (optionStyle === "call") {
    return S * cumulativeNormal(d1) - K * Math.exp(-r * T) * cumulativeNormal(d2);
  }
  return K * Math.exp(-r * T) * cumulativeNormal(-d2) - S * cumulativeNormal(-d1);
}

export function blackScholesDelta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionStyle: OptionStyle
): number {
  if (T <= 0) {
    return optionStyle === "call" ? (S > K ? 1 : 0) : (S > K ? 0 : -1);
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  if (optionStyle === "call") return cumulativeNormal(d1);
  return cumulativeNormal(d1) - 1;
}

export function blackScholesGamma(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  _optionStyle: OptionStyle
): number {
  if (T <= 0 || sigma <= 0 || S <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const nd1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return nd1 / (S * sigma * Math.sqrt(T));
}

export function blackScholesTheta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionStyle: OptionStyle
): number {
  if (T <= 0) return 0;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const nd1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);

  if (optionStyle === "call") {
    return (-S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * cumulativeNormal(d2);
  }
  return (-S * nd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * cumulativeNormal(-d2);
}

export function blackScholesVega(
  S: number,
  K: number,
  T: number,
  _r: number,
  sigma: number,
  _optionStyle: OptionStyle
): number {
  if (T <= 0 || sigma <= 0 || S <= 0) return 0;
  const d1 = (Math.log(S / K) + (_r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const nd1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return S * nd1 * Math.sqrt(T);
}

export function interpolateIv(dte: number, ivCurve: Array<{ dte: number; iv: number }>): number {
  if (ivCurve.length === 0) return 0.2;
  if (ivCurve.length === 1) return ivCurve[0].iv;

  const sorted = [...ivCurve].sort((a, b) => a.dte - b.dte);

  if (dte <= sorted[0].dte) return sorted[0].iv;
  if (dte >= sorted[sorted.length - 1].dte) return sorted[sorted.length - 1].iv;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (dte >= sorted[i].dte && dte <= sorted[i + 1].dte) {
      const t = (dte - sorted[i].dte) / (sorted[i + 1].dte - sorted[i].dte);
      return sorted[i].iv + t * (sorted[i + 1].iv - sorted[i].iv);
    }
  }

  return sorted[sorted.length - 1].iv;
}

export function daysToExpiration(expiration: Date, from: Date): number {
  const diffMs = expiration.getTime() - from.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
