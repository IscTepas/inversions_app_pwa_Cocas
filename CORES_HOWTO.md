# CORES TEAM-09 — Guía de uso y ejemplos de llamada

> Basado en la implementación real en `projects/rest-api/inversions_api/src/modules/strategies/term/`
> y las rutas en `projects/rest-api/inversions_api/src/routes/strategies/term/`.

---

## Índice

1. [TermStrategyContract](#1-termstrategycontract-t162)
2. [CalendarSpreadEngine](#2-calendarspreadengine-t163)
3. [DiagonalSpreadEngine](#3-diagonalspreadengine-t164)
4. [TermSimulationEngine](#4-termsimulationengine-t165)
5. [TermRiskEngine](#5-termriskengine-t166)
6. [TermReportEngine](#6-termreportengine-t167)
7. [TermChatAssistant](#7-termchatassistant-s-t09-c01)
8. [TermRollOrchestrator](#8-termrollorchestrator-t169)
9. [Flujo completo de orquestación](#9-flujo-completo-de-orquestacin)
10. [Tabla resumen de signal()](#10-tabla-resumen-de-signal)

---

## 1. TermStrategyContract (T162)

**Archivo:** `termStrategyContract.ts`
**Propósito:** Módulo fundacional. Define tipos base y valida consistencia temporal y de estilo.

### Constructor

```ts
constructor(input: TermStrategyInput)
```

```ts
// Types
interface TermStrategyInput {
  legs: TermLeg[];
  underlying?: string;
}

interface TermLeg {
  strike: number;
  expiration: Date;
  premium: number;
  contracts: number;
  optionStyle: "call" | "put";
}
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `validate()` | `validate(): ValidationResult` | `{ isValid: boolean, errors: TermStrategyError[] }` |
| `getType()` | `getType(): StrategyType` | `"calendar"` si todos los strikes son iguales, `"diagonal"` si son distintos |
| `getLegs()` | `getLegs(): TermLeg[]` | Copia defensiva del array de legs |
| `getInput()` | `getInput(): TermStrategyInput` | Copia defensiva del input original |
| `signal()` | `signal(): string` | Delega a `getType()` |

### Ejemplo de llamada

```ts
import { TermStrategyContract } from "./termStrategyContract";

const contract = new TermStrategyContract({
  legs: [
    { strike: 100, expiration: new Date("2026-06-19"), premium: 2.50, contracts: 1, optionStyle: "call" },
    { strike: 100, expiration: new Date("2026-09-18"), premium: 4.80, contracts: 1, optionStyle: "call" },
  ],
  underlying: "SPX",
});

const validation = contract.validate();
if (!validation.isValid) {
  console.error("Error:", validation.errors);
}

console.log(contract.getType());   // "calendar"
console.log(contract.signal());    // "calendar"
console.log(contract.getLegs());   // TermLeg[]
```

### signal(): string

| Condición | Retorna |
|-----------|---------|
| Todos los strikes iguales | `"calendar"` |
| Strikes diferentes | `"diagonal"` |

---

## 2. CalendarSpreadEngine (T163)

**Archivo:** `calendarSpreadEngine.ts`
**Propósito:** Analiza un Calendar Spread: griegas Black-Scholes, escenarios de precio, perfiles de theta/vega, stress tests.

### Constructor

```ts
constructor(
  contract: TermStrategyContract,
  riskFreeRate: number = 0.05,
  ivCurve: IvCurvePoint[] = []
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `analyze()` | `analyze(): CalendarSpreadResult` | `{ shortDte, longDte, shortTheta, longTheta, netTheta, greeks, scenarios, stressTests }` |
| `getContract()` | `getContract(): TermStrategyContract` | Referencia al contrato |
| `signal()` | `signal(): string` | Señal de trading |

### Ejemplo de llamada

```ts
import { CalendarSpreadEngine } from "./calendarSpreadEngine";
import { TermStrategyContract } from "./termStrategyContract";

const contract = new TermStrategyContract({ /* ... */ });
const engine = new CalendarSpreadEngine(contract, 0.05, []);

const result = engine.analyze();
console.log(result.shortDte);   // días a expiración corta
console.log(result.netTheta);   // theta neto
console.log(result.greeks);     // { delta, gamma, theta, vega }
console.log(result.scenarios);  // escenarios por precio subyacente
console.log(result.stressTests);

const signal = engine.signal();
console.log(signal); // "EXPIRED" | "ROLL" | "THETA_ALERT" | "DELTA_ALERT" | "HOLD"
```

### signal(): string — reglas de negocio

```ts
signal(): string {
  const result = this.analyze();
  if (result.shortDte <= 0)         return "EXPIRED";
  if (result.shortDte <= 7)         return "ROLL";
  if (result.greeks.theta < -5)     return "THETA_ALERT";
  if (Math.abs(result.greeks.delta) > 0.7) return "DELTA_ALERT";
  return "HOLD";
}
```

| Condición | Retorna |
|-----------|---------|
| `shortDte <= 0` | `"EXPIRED"` |
| `shortDte <= 7` | `"ROLL"` |
| `netTheta < -5` | `"THETA_ALERT"` |
| `\|netDelta\| > 0.7` | `"DELTA_ALERT"` |
| default | `"HOLD"` |

---

## 3. DiagonalSpreadEngine (T164)

**Archivo:** `diagonalSpreadEngine.ts`
**Propósito:** Analiza un Diagonal Spread: griegas, perfil direccional, ventana de ajuste (roll), escenarios, theta decay, vega shock, stress tests.

### Constructor

```ts
constructor(
  contract: TermStrategyContract,
  riskFreeRate: number = 0.05,
  ivCurve: IvCurvePoint[] = [],
  thetaResidualThreshold: number = 0.5,
  minDteForRoll: number = 7
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `analyze()` | `analyze(): RiskProfile` | `{ shortDte, longDte, greeks, directionalProfile, scenarios, thetaDecayProfile, vegaShockProfile, adjustmentWindow, stressTests }` |
| `getContract()` | `getContract(): TermStrategyContract` | Referencia al contrato |
| `signal()` | `signal(): string` | Señal de trading |

### Ejemplo de llamada

```ts
import { DiagonalSpreadEngine } from "./diagonalSpreadEngine";
import { TermStrategyContract } from "./termStrategyContract";

const contract = new TermStrategyContract({
  legs: [
    { strike: 95,  expiration: new Date("2026-06-19"), premium: 3.50, contracts: 1, optionStyle: "call" },
    { strike: 105, expiration: new Date("2026-09-18"), premium: 2.00, contracts: 1, optionStyle: "call" },
  ],
});

const engine = new DiagonalSpreadEngine(contract, 0.05, []);
const result = engine.analyze();

console.log(result.directionalProfile); // "bullish" | "bearish" | "neutral"
console.log(result.greeks);
console.log(result.adjustmentWindow);   // { shouldAdjust, reason, suggestedAction } | null
console.log(result.thetaDecayProfile);
console.log(result.vegaShockProfile);

console.log(engine.signal()); // "ROLL" | "BULLISH" | "BEARISH" | "NEUTRAL"
```

### signal(): string — reglas de negocio

```ts
signal(): string {
  const result = this.analyze();
  if (result.adjustmentWindow)               return "ROLL";
  if (result.directionalProfile === "bullish") return "BULLISH";
  if (result.directionalProfile === "bearish") return "BEARISH";
  return "NEUTRAL";
}
```

| Condición | Retorna |
|-----------|---------|
| `adjustmentWindow != null` | `"ROLL"` |
| `directionalProfile === "bullish"` | `"BULLISH"` |
| `directionalProfile === "bearish"` | `"BEARISH"` |
| default | `"NEUTRAL"` |

---

## 4. TermSimulationEngine (T165)

**Archivo:** `termSimulationEngine.ts`
**Propósito:** Ejecuta simulación Monte Carlo y determinista sobre la estrategia.

### Constructor

```ts
constructor(
  contract: TermStrategyContract,
  calendarEngine: CalendarSpreadEngine | null,
  diagonalEngine: DiagonalSpreadEngine | null,
  riskFreeRate: number = 0.05,
  ivCurve: IvCurvePoint[] = []
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `simulate()` | `simulate(historicalData?, monteCarloConfig?): SimulationResult` | `{ strategy, optionStyle, backtest, monteCarlo, deterministic, timestamp }` |
| `runBacktest()` | `runBacktest(historicalData: OhlcData[]): BacktestResult` | `{ totalReturn, sharpeRatio, sortinoRatio, maxDrawdown, winRate, totalTrades, returns, equityCurve }` |
| `runMonteCarlo()` | `runMonteCarlo(config: MonteCarloConfig): MonteCarloResult` | `{ iterations, distribution, meanPnl, medianPnl, percentile5, percentile95, var95, pnlDistribution }` |
| `runDeterministic()` | `runDeterministic(): DeterministicScenario[]` | 9 combinaciones price x IV shock |
| `signal()` | `signal(historicalData?, monteCarloConfig?): string` | Señal de simulación |
| `getCalendarEngine()` | `getCalendarEngine(): CalendarSpreadEngine \| null` | Accessor |
| `getDiagonalEngine()` | `getDiagonalEngine(): DiagonalSpreadEngine \| null` | Accessor |

### Ejemplo de llamada

```ts
import { TermSimulationEngine } from "./termSimulationEngine";

// Requiere contract + al menos un engine (calendar o diagonal)
const simEngine = new TermSimulationEngine(contract, calEngine, null, 0.05, []);

const mcConfig = { iterations: 1000, distribution: "normal" as const };
const simResult = simEngine.simulate(undefined, mcConfig);

console.log(simResult.monteCarlo?.meanPnl);
console.log(simResult.monteCarlo?.var95);
console.log(simResult.deterministic); // 9 escenarios

const signal = simEngine.signal(undefined, mcConfig);
console.log(signal); // "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL" | "NO_MC_DATA"
```

### signal(): string — reglas de negocio

```ts
signal(historicalData?, monteCarloConfig?): string {
  const result = this.simulate(historicalData, monteCarloConfig);
  const mc = result.monteCarlo;
  if (!mc)                return "NO_MC_DATA";
  if (mc.meanPnl > 5 && mc.var95 > -10)  return "FAVORABLE";
  if (mc.meanPnl < -5 || mc.var95 < -20) return "UNFAVORABLE";
  return "NEUTRAL";
}
```

| Condición | Retorna |
|-----------|---------|
| Sin Monte Carlo | `"NO_MC_DATA"` |
| `meanPnl > 5 && var95 > -10` | `"FAVORABLE"` |
| `meanPnl < -5 \|\| var95 < -20` | `"UNFAVORABLE"` |
| default | `"NEUTRAL"` |

---

## 5. TermRiskEngine (T166)

**Archivo:** `termRiskEngine.ts`
**Propósito:** Análisis de riesgo con límites configurables, evaluación de asignación temprana, stop-loss y alertas.

### Constructor

```ts
constructor(
  contract: TermStrategyContract,
  portfolioValue: number = 100000,
  riskLimits?: Partial<RiskLimits>
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `analyze()` | `analyze(netTheta: number, netGamma?: number): RiskAnalysis` | `{ limitsViolation, violations, earlyAssignmentRisk, stopLossRules, alerts, portfolioExposure, thetaExposure }` |
| `getContract()` | `getContract(): TermStrategyContract` | Referencia al contrato |
| `signal()` | `signal(netTheta: number, netGamma?: number): string` | Señal de riesgo |

### Ejemplo de llamada

```ts
import { TermRiskEngine } from "./termRiskEngine";

const riskEngine = new TermRiskEngine(contract, 100000, {
  maxPortfolioExposure: 0.2,    // 20% del portafolio
  maxDte: 365,
  maxTheta: -10,
});

const riskAnalysis = riskEngine.analyze(-3.2, 0.05);
console.log(riskAnalysis.limitsViolation);
console.log(riskAnalysis.violations);        // string[] descriptivos
console.log(riskAnalysis.earlyAssignmentRisk);
console.log(riskAnalysis.stopLossRules);
console.log(riskAnalysis.alerts);

const signal = riskEngine.signal(-3.2, 0.05);
console.log(signal); // "RISK_LIMIT_VIOLATION" | "EARLY_ASSIGNMENT_RISK" | "RISK_OK"
```

### signal(): string — reglas de negocio

```ts
signal(netTheta: number, netGamma?: number): string {
  const analysis = this.analyze(netTheta, netGamma);
  if (analysis.limitsViolation)               return "RISK_LIMIT_VIOLATION";
  if (analysis.earlyAssignmentRisk?.isAtRisk)  return "EARLY_ASSIGNMENT_RISK";
  return "RISK_OK";
}
```

| Condición | Retorna |
|-----------|---------|
| `limitsViolation === true` | `"RISK_LIMIT_VIOLATION"` |
| `earlyAssignmentRisk.isAtRisk === true` | `"EARLY_ASSIGNMENT_RISK"` |
| default | `"RISK_OK"` |

---

## 6. TermReportEngine (T167)

**Archivo:** `termReportEngine.ts`
**Propósito:** Agrega resultados de calendar/diagonal + simulación + riesgo en un reporte estructurado único. Exportable a JSON.

### Constructor

```ts
constructor(
  calendarResult: CalendarSpreadResult | null,
  diagonalResult: RiskProfile | null,
  simulationResult: SimulationResult | null,
  riskAnalysis: RiskAnalysis | null
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `generateReport()` | `generateReport(): StructuredReport` | `{ strategy, optionStyle, payoffCurve, surface, riskMetrics, deterministic, stressTests, probabilityCone, generatedAt }` |
| `toJson()` | `toJson(): string` | Reporte serializado a JSON string |
| `generatePayoffCurve()` | `generatePayoffCurve(): PayoffCurvePoint[]` | Curva de payoff desde escenarios |
| `generateSurface()` | `generateSurface(): TimePriceIvSurface \| null` | Superficie 3D (solo calendar) |
| `calculateRiskMetrics()` | `calculateRiskMetrics(): RiskMetrics` | Métricas agregadas: net Greeks, PoP, max drawdown, Sharpe, etc. |
| `generateStressTestSummary()` | `generateStressTestSummary(): StressTestEntry[]` | Stress tests normalizados |
| `generateProbabilityCone()` | `generateProbabilityCone(): ProbabilityConePoint[]` | Cono de probabilidad desde MC |
| `static calculateBreakEvens()` | `static calculateBreakEvens(curve: PayoffCurvePoint[]): number[]` | Break-even por interpolación lineal |
| `static calculateNetCost()` | `static calculateNetCost(legs): number` | Costo neto de entrada |
| `static generatePayoffAtExpiration()` | `static generatePayoffAtExpiration(legs, initialCost, riskFreeRate, longIv, remainingDte, priceRange?): PayoffCurvePoint[]` | Curva al vencimiento corto |
| `signal()` | `signal(): string` | Señal de reporte |

### Ejemplo de llamada

```ts
import { TermReportEngine } from "./termReportEngine";

const report = new TermReportEngine(calResult, null, simResult, null);

const structured = report.generateReport();
console.log(structured.strategy);       // "calendar"
console.log(structured.riskMetrics);
console.log(structured.probabilityCone);

const jsonString = report.toJson();
console.log(jsonString); // string JSON

const breakEvens = TermReportEngine.calculateBreakEvens(structured.payoffCurve);
const netCost = TermReportEngine.calculateNetCost(legs);

const signal = report.signal();
console.log(signal); // "REPORT_CALENDAR" | "REPORT_DIAGONAL" | "REPORT_UNKNOWN"
```

### signal(): string — reglas de negocio

```ts
signal(): string {
  const report = this.generateReport();
  return `REPORT_${report.strategy.toUpperCase()}`;
}
```

| Condición | Retorna |
|-----------|---------|
| `strategy === "calendar"` | `"REPORT_CALENDAR"` |
| `strategy === "diagonal"` | `"REPORT_DIAGONAL"` |
| default | `"REPORT_UNKNOWN"` |

---

## 7. TermChatAssistant (S-T09-C01)

**Archivo:** `termChatAssistant.ts`
**Propósito:** Genera explicaciones en lenguaje natural. No autoriza ejecución.

### Constructor

```ts
constructor(
  calendarResult: CalendarSpreadResult | null,
  diagonalResult: RiskProfile | null,
  simulationResult: SimulationResult | null,
  riskAnalysis: RiskAnalysis | null
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `explain()` | `explain(): ChatExplanation` | `{ purpose, riskProfile, usageConditions, scenarioSummary, disclaimer, structuredOutput }` |
| `getContext()` | `getContext(): ChatContext \| null` | `{ strategyType, optionStyle, shortStrike, longStrike, shortDte, longDte, netTheta, netDelta, directionalProfile }` |
| `signal()` | `signal(): string` | Señal contextual |

### Ejemplo de llamada

```ts
import { TermChatAssistant } from "./termChatAssistant";

const assistant = new TermChatAssistant(calResult, null, simResult, null);

const context = assistant.getContext();
console.log(context?.strategyType);     // "calendar"
console.log(context?.directionalProfile);

const explanation = assistant.explain();
console.log(explanation.purpose);         // string en inglés
console.log(explanation.riskProfile);     // string en inglés
console.log(explanation.structuredOutput);

const signal = assistant.signal();
console.log(signal); // "CALENDAR_NEUTRAL" | "DIAGONAL_BULLISH" | etc.
```

### signal(): string — reglas de negocio

```ts
signal(): string {
  const ctx = this.getContext();
  if (!ctx) return "NO_DATA";
  return `${ctx.strategyType.toUpperCase()}_${ctx.directionalProfile.toUpperCase()}`;
}
```

| Condición | Retorna |
|-----------|---------|
| Sin datos (ctx === null) | `"NO_DATA"` |
| Calendar + neutral | `"CALENDAR_NEUTRAL"` |
| Diagonal + bullish | `"DIAGONAL_BULLISH"` |
| Diagonal + bearish | `"DIAGONAL_BEARISH"` |

---

## 8. TermRollOrchestrator (T169)

**Archivo:** `termRollOrchestrator.ts`
**Propósito:** Evalúa si una posición debe hacerse roll (renovación de la pata corta) o cerrarse anticipadamente.

### Constructor

```ts
constructor(
  contract: TermStrategyContract,
  riskAnalysis: RiskAnalysis | null,
  netTheta: number,
  netGamma: number = 0,
  schedule?: Partial<RollSchedule>,
  thetaResidualThreshold?: number,
  minDteForRoll?: number
)
```

### Métodos públicos

| Método | Firma | Retorna |
|--------|-------|---------|
| `evaluate()` | `evaluate(): RollRecommendation` | `{ shouldRoll, shouldCloseEarly, triggers, cost, recommendation, timing }` |
| `getContract()` | `getContract(): TermStrategyContract` | Referencia al contrato |
| `signal()` | `signal(): string` | Señal de roll |

### Ejemplo de llamada

```ts
import { TermRollOrchestrator } from "./termRollOrchestrator";

const orchestrator = new TermRollOrchestrator(
  contract,
  riskAnalysis,
  netTheta,   // -3.2
  netGamma,   // 0.05
);

const evaluation = orchestrator.evaluate();
console.log(evaluation.shouldRoll);
console.log(evaluation.shouldCloseEarly);
console.log(evaluation.triggers);    // { thetaResidualTriggered, gammaExposureTriggered, ... }
console.log(evaluation.recommendation); // string descriptivo
console.log(evaluation.timing);         // "Today", "Within 2 days", etc.

const signal = orchestrator.signal();
console.log(signal); // "CLOSE" | "ROLL" | "HOLD"
```

### signal(): string — reglas de negocio

```ts
signal(): string {
  const result = this.evaluate();
  if (result.shouldCloseEarly) return "CLOSE";
  if (result.shouldRoll)       return "ROLL";
  return "HOLD";
}
```

| Condición | Retorna |
|-----------|---------|
| `shouldCloseEarly === true` | `"CLOSE"` |
| `shouldRoll === true` | `"ROLL"` |
| default | `"HOLD"` |

---

## 9. Flujo completo de orquestación

### POST /api/v1/strategies/term/calendar

Así se encadenan los cores en la ruta real (`calendarSpread.ts`):

```ts
// 1. Validar contrato
const contract = new TermStrategyContract({ legs, underlying });
const validation = contract.validate();
if (!validation.isValid) throw validation.errors;

// 2. Verificar tipo
if (contract.getType() !== "calendar") throw Error("Not a calendar spread");

// 3. Analizar con CalendarSpreadEngine
const engine = new CalendarSpreadEngine(contract, riskFreeRate, ivCurve);
const result = engine.analyze();

// 4. Simular con TermSimulationEngine
const simulation = new TermSimulationEngine(contract, engine, null, riskFreeRate, ivCurve);
const simResult = simulation.simulate(undefined, mcConfig);

// 5. Generar reporte con TermReportEngine
const report = new TermReportEngine(result, null, simResult, null);

// 6. Responder JSON
res.json({
  analysis: { shortDte: result.shortDte, netTheta: result.netTheta },
  scenarios: result.scenarios,
  simulation: { deterministic: simResult.deterministic, monteCarlo: simResult.monteCarlo },
  report: report.generateReport(),
});
```

### POST /api/v1/strategies/term/diagonal

Mismo patrón pero con `DiagonalSpreadEngine`:

```ts
const contract = new TermStrategyContract({ legs, underlying });
const validation = contract.validate();
if (!validation.isValid) throw validation.errors;
if (contract.getType() !== "diagonal") throw Error("Not a diagonal spread");

const engine = new DiagonalSpreadEngine(contract, riskFreeRate, ivCurve);
const result = engine.analyze();

const simulation = new TermSimulationEngine(contract, null, engine, riskFreeRate, ivCurve);
const simResult = simulation.simulate(undefined, mcConfig);

const report = new TermReportEngine(null, result, simResult, null);

res.json({
  analysis: { shortDte: result.shortDte, greeks: result.greeks, directionalProfile: result.directionalProfile },
  scenarios: result.scenarios,
  thetaDecayProfile: result.thetaDecayProfile,
  vegaShockProfile: result.vegaShockProfile,
  simulation: { deterministic: simResult.deterministic, monteCarlo: simResult.monteCarlo },
  report: report.generateReport(),
});
```

### POST /api/v1/strategies/term/compare

El `termComparator.ts` orquesta **ambas** estrategias side-by-side:

```ts
const calendarContract = new TermStrategyContract({ legs: body.calendarLegs });
const diagonalContract = new TermStrategyContract({ legs: body.diagonalLegs });

const calEngine = new CalendarSpreadEngine(calendarContract);
const diagEngine = new DiagonalSpreadEngine(diagonalContract);

const calResult = calEngine.analyze();
const diagResult = diagEngine.analyze();

// Construye métricas para cada una (cost, breakEvens, payoff curves)
const calMetrics = buildBaseMetrics(calResult, body.calendarLegs, true, currentPrice, 0.05);
const diagMetrics = buildBaseMetrics(diagResult, body.diagonalLegs, false, currentPrice, 0.05);

// Enriquece con riskMetrics vía TermReportEngine
const simEngine = new TermSimulationEngine(calendarContract, calEngine, null);
const simResult = { strategy: "calendar", monteCarlo: simEngine.runMonteCarlo(...), ... };
const reportEngine = new TermReportEngine(calResult, null, simResult, null);
calMetrics = enrichWithRiskMetrics(calMetrics, reportEngine);

// Scoring y recomendación
const recommendation = calendarScore >= diagonalScore ? "calendar" : "diagonal";
```

---

## 10. Tabla resumen de signal()

| Core | signal() | Valores posibles |
|------|----------|-----------------|
| `TermStrategyContract` | `signal(): string` | `"calendar"` \| `"diagonal"` |
| `CalendarSpreadEngine` | `signal(): string` | `"EXPIRED"` \| `"ROLL"` \| `"THETA_ALERT"` \| `"DELTA_ALERT"` \| `"HOLD"` |
| `DiagonalSpreadEngine` | `signal(): string` | `"ROLL"` \| `"BULLISH"` \| `"BEARISH"` \| `"NEUTRAL"` |
| `TermSimulationEngine` | `signal(historicalData?, mcConfig?): string` | `"FAVORABLE"` \| `"UNFAVORABLE"` \| `"NEUTRAL"` \| `"NO_MC_DATA"` |
| `TermRiskEngine` | `signal(netTheta, netGamma?): string` | `"RISK_LIMIT_VIOLATION"` \| `"EARLY_ASSIGNMENT_RISK"` \| `"RISK_OK"` |
| `TermReportEngine` | `signal(): string` | `"REPORT_CALENDAR"` \| `"REPORT_DIAGONAL"` \| `"REPORT_UNKNOWN"` |
| `TermChatAssistant` | `signal(): string` | `"CALENDAR_NEUTRAL"` \| `"DIAGONAL_BULLISH"` \| `"DIAGONAL_BEARISH"` \| `"NO_DATA"` |
| `TermRollOrchestrator` | `signal(): string` | `"CLOSE"` \| `"ROLL"` \| `"HOLD"` |

### Mapa de dependencias entre cores

```
termUtils.ts (Black-Scholes, interpolación, DTE)
  │
  ▼
termStrategyContract.ts  ← raíz, sin dependencias del módulo
  │
  ├──► calendarSpreadEngine.ts
  ├──► diagonalSpreadEngine.ts
  ├──► termRiskEngine.ts
  │
  ├──► termSimulationEngine.ts  ← requiere calendarEngine o diagonalEngine
  │
  ├──► termReportEngine.ts      ← recibe resultados, no instancia engines
  ├──► termChatAssistant.ts     ← recibe resultados, no instancia engines
  │
  └──► termRollOrchestrator.ts  ← requiere contract + riskAnalysis
```

---

> Documentación generada a partir de los archivos fuente en:
> - `src/modules/strategies/term/*.ts`
> - `src/routes/strategies/term/*.ts`

---

## 11. Ejemplos de salidas reales

### 11.1 POST /api/v1/strategies/term/calendar — Calendar Call Spread

**Request:**
```json
{
  "legs": [
    { "strike": 100, "expiration": "2026-06-19", "premium": 2.50, "contracts": 1, "optionStyle": "call" },
    { "strike": 100, "expiration": "2026-09-18", "premium": 4.80, "contracts": 1, "optionStyle": "call" }
  ],
  "riskFreeRate": 0.05,
  "ivCurve": [
    { "dte": 21,  "iv": 0.22 },
    { "dte": 112, "iv": 0.25 }
  ]
}
```

**Response (200):**
```json
{
  "strategy": "calendar",
  "variant": "call",
  "structureName": "Calendar Call Spread",
  "structureDescription": "Short near-term call plus long later-term call at the same strike.",
  "analysis": {
    "shortDte": 21,
    "longDte": 112,
    "shortTheta": -0.035,
    "longTheta": -0.012,
    "netTheta": 0.023
  },
  "scenarios": [
    { "underlyingPrice": 70,  "strategyValue": 0.82, "pnl": 2.32, "theta": 0.015, "impliedVolatility": 0.25 },
    { "underlyingPrice": 85,  "strategyValue": 1.20, "pnl": 1.48, "theta": 0.019, "impliedVolatility": 0.25 },
    { "underlyingPrice": 100, "strategyValue": 1.80, "pnl": 0.50, "theta": 0.023, "impliedVolatility": 0.25 },
    { "underlyingPrice": 115, "strategyValue": 1.50, "pnl": 1.12, "theta": 0.020, "impliedVolatility": 0.25 },
    { "underlyingPrice": 130, "strategyValue": 0.95, "pnl": 2.15, "theta": 0.018, "impliedVolatility": 0.25 }
  ],
  "simulation": {
    "deterministic": [
      { "label": "price_-10%_iv_-10%", "price": 90, "ivShock": -0.1, "dteRemaining": 91, "strategyValue": 1.65, "pnl": 0.65 },
      { "label": "price_0%_iv_0%",     "price": 100, "ivShock": 0,   "dteRemaining": 91, "strategyValue": 1.80, "pnl": 0.50 },
      { "label": "price_+10%_iv_+10%", "price": 110, "ivShock": 0.1, "dteRemaining": 91, "strategyValue": 1.55, "pnl": 0.75 }
    ],
    "monteCarlo": {
      "iterations": 1000,
      "distribution": "normal",
      "meanPnl": 0.48,
      "medianPnl": 0.42,
      "percentile5": -2.10,
      "percentile95": 3.20,
      "var95": -2.10,
      "pnlDistribution": [0.1, 0.3, 0.5, 0.7, 0.9]
    }
  },
  "report": {
    "strategy": "calendar",
    "optionStyle": "call",
    "generatedAt": "2026-05-29T12:00:00.000Z",
    "riskMetrics": {
      "netDelta": 0.02,
      "netGamma": 0.003,
      "netTheta": 0.023,
      "netVega": -0.15,
      "probabilityOfProfit": 0.68,
      "maxDrawdown": -0.12,
      "sharpeRatio": 1.45,
      "stressTestMaxLoss": -3.50,
      "stressTestMaxGain": 4.20,
      "expectedShortfall": -1.80
    },
    "probabilityCone": [
      { "dte": 112, "percentile5": -2.10, "percentile25": -0.80, "median": 0.42, "percentile75": 1.60, "percentile95": 3.20 },
      { "dte": 80,  "percentile5": -1.50, "percentile25": -0.50, "median": 0.30, "percentile75": 1.10, "percentile95": 2.40 },
      { "dte": 40,  "percentile5": -0.80, "percentile25": -0.20, "median": 0.15, "percentile75": 0.60, "percentile95": 1.20 },
      { "dte": 0,   "percentile5": 0.00,  "percentile25": 0.00,  "median": 0.00, "percentile75": 0.00,  "percentile95": 0.00 }
    ]
  }
}
```

---

### 11.2 POST /api/v1/strategies/term/diagonal — Diagonal Call Spread

**Request:**
```json
{
  "legs": [
    { "strike": 95,  "expiration": "2026-06-19", "premium": 3.50, "contracts": 1, "optionStyle": "call" },
    { "strike": 105, "expiration": "2026-09-18", "premium": 2.00, "contracts": 1, "optionStyle": "call" }
  ],
  "riskFreeRate": 0.05
}
```

**Response (200):**
```json
{
  "strategy": "diagonal",
  "variant": "call",
  "structureName": "Diagonal Call Spread",
  "structureDescription": "Pata corta call vendida y pata larga call comprada con strikes y expiraciones diferentes.",
  "netEntryCost": -1.50,
  "analysis": {
    "shortDte": 21,
    "longDte": 112,
    "greeks": { "delta": 0.35, "gamma": 0.008, "theta": 0.018, "vega": -0.22 },
    "directionalProfile": "bullish",
    "adjustmentWindow": null
  },
  "scenarios": [
    { "underlyingPrice": 70,  "strategyValue": 0.50, "pnl": 1.00, "theta": 0.010, "impliedVolatility": 0.25 },
    { "underlyingPrice": 85,  "strategyValue": 1.10, "pnl": 0.40, "theta": 0.014, "impliedVolatility": 0.25 },
    { "underlyingPrice": 100, "strategyValue": 1.80, "pnl": 0.30, "theta": 0.018, "impliedVolatility": 0.25 },
    { "underlyingPrice": 115, "strategyValue": 2.60, "pnl": 1.10, "theta": 0.022, "impliedVolatility": 0.25 },
    { "underlyingPrice": 130, "strategyValue": 3.10, "pnl": 1.60, "theta": 0.025, "impliedVolatility": 0.25 }
  ],
  "thetaDecayProfile": [
    { "underlyingPrice": 100, "strategyValue": 1.80, "pnl": 0.30, "theta": 0.018, "impliedVolatility": 0.25 },
    { "underlyingPrice": 100, "strategyValue": 1.92, "pnl": 0.42, "theta": 0.016, "impliedVolatility": 0.25 },
    { "underlyingPrice": 100, "strategyValue": 2.05, "pnl": 0.55, "theta": 0.014, "impliedVolatility": 0.25 }
  ],
  "vegaShockProfile": [
    { "underlyingPrice": 100, "strategyValue": 1.60, "pnl": 0.10, "theta": 0.018, "impliedVolatility": 0.225 },
    { "underlyingPrice": 100, "strategyValue": 1.80, "pnl": 0.30, "theta": 0.018, "impliedVolatility": 0.250 },
    { "underlyingPrice": 100, "strategyValue": 2.05, "pnl": 0.55, "theta": 0.018, "impliedVolatility": 0.275 }
  ],
  "simulation": {
    "deterministic": [
      { "label": "price_-10%_iv_-10%", "price": 90, "ivShock": -0.1, "dteRemaining": 91, "strategyValue": 1.40, "pnl": -0.10 },
      { "label": "price_0%_iv_0%",     "price": 100, "ivShock": 0,   "dteRemaining": 91, "strategyValue": 1.80, "pnl": 0.30 },
      { "label": "price_+10%_iv_+10%", "price": 110, "ivShock": 0.1, "dteRemaining": 91, "strategyValue": 2.40, "pnl": 0.90 }
    ],
    "monteCarlo": {
      "iterations": 1000,
      "distribution": "normal",
      "meanPnl": 0.35,
      "medianPnl": 0.28,
      "percentile5": -1.80,
      "percentile95": 2.90,
      "var95": -1.80
    }
  },
  "report": {
    "strategy": "diagonal",
    "optionStyle": "call",
    "generatedAt": "2026-05-29T12:00:00.000Z",
    "riskMetrics": {
      "netDelta": 0.35,
      "netGamma": 0.008,
      "netTheta": 0.018,
      "netVega": -0.22,
      "probabilityOfProfit": 0.58,
      "maxDrawdown": -0.18,
      "sharpeRatio": 0.95,
      "stressTestMaxLoss": -4.20,
      "stressTestMaxGain": 3.80,
      "expectedShortfall": -2.10
    }
  }
}
```

---

### 11.3 POST /api/v1/strategies/term/compare — Comparación side-by-side

**Request:**
```json
{
  "marketVolatility": "medium",
  "timeHorizon": "medium",
  "direction": "neutral",
  "riskTolerance": "moderate",
  "underlyingPrice": 100,
  "calendarLegs": [
    { "strike": 100, "expiration": "2026-06-19", "premium": 2.50, "contracts": 1, "optionStyle": "call" },
    { "strike": 100, "expiration": "2026-09-18", "premium": 4.80, "contracts": 1, "optionStyle": "call" }
  ],
  "diagonalLegs": [
    { "strike": 95,  "expiration": "2026-06-19", "premium": 3.50, "contracts": 1, "optionStyle": "call" },
    { "strike": 105, "expiration": "2026-09-18", "premium": 2.00, "contracts": 1, "optionStyle": "call" }
  ]
}
```

**Response (200):**
```json
{
  "recommendation": "calendar",
  "justification": "Calendar spread recommended for medium volatility, medium horizon, neutral outlook. Lower cost ($2.30 vs $1.50), neutral delta (0.02), and higher POP (68% vs 58%).",
  "scores": {
    "calendar": 0.75,
    "diagonal": 0.45
  },
  "metricas": [
    { "label": "Costo Neto",         "calendar": 2.30, "diagonal": 1.50, "winner": "calendar", "reason": "Menor costo → menos capital en riesgo",               "category": "capital" },
    { "label": "Pérdida Máxima",     "calendar": -3.50,"diagonal": -4.20,"winner": "calendar", "reason": "Menor pérdida máxima → mejor control de riesgo",       "category": "capital" },
    { "label": "Ganancia Máxima",    "calendar": 4.20, "diagonal": 3.80, "winner": "calendar", "reason": "Mayor ganancia máxima → mejor potencial de retorno",    "category": "capital" },
    { "label": "Prob. de Ganancia",  "calendar": 0.68, "diagonal": 0.58, "winner": "calendar", "reason": "POP más alto → mayor probabilidad de éxito estadístico", "category": "capital" },
    { "label": "Delta (Δ)",          "calendar": 0.02, "diagonal": 0.35, "winner": "calendar", "reason": "Delta más cercano a 0 → neutral",                     "category": "greeks"  },
    { "label": "Gamma (Γ)",          "calendar": 0.003,"diagonal": 0.008,"winner": "calendar", "reason": "Menor gamma → menor riesgo de convexidad",              "category": "greeks"  },
    { "label": "Theta (θ)",          "calendar": 0.023,"diagonal": 0.018,"winner": "calendar", "reason": "Theta más positivo → mayor beneficio por decaimiento temporal", "category": "greeks" },
    { "label": "Vega (ν)",           "calendar": -0.15,"diagonal": -0.22,"winner": "calendar", "reason": "Menor vega → menos riesgo por cambios en IV",           "category": "greeks"  },
    { "label": "DTE Corto",          "calendar": 21,   "diagonal": 21,   "winner": "tie",      "reason": "Mismo DTE corto",                                     "category": "dte"     },
    { "label": "DTE Largo",          "calendar": 112,  "diagonal": 112,  "winner": "tie",      "reason": "Mismo DTE largo",                                     "category": "dte"     }
  ]
}
```

---

### 11.4 Ejemplos de cada `signal()` en acción

```ts
// ============================================
// TermStrategyContract.signal()
// ============================================
const contractCalendar = new TermStrategyContract({
  legs: [
    { strike: 100, expiration: new Date("2026-06-19"), premium: 2.50, contracts: 1, optionStyle: "call" },
    { strike: 100, expiration: new Date("2026-09-18"), premium: 4.80, contracts: 1, optionStyle: "call" },
  ],
});
contractCalendar.signal(); // → "calendar"

const contractDiagonal = new TermStrategyContract({
  legs: [
    { strike: 95, expiration: new Date("2026-06-19"), premium: 3.50, contracts: 1, optionStyle: "call" },
    { strike: 105, expiration: new Date("2026-09-18"), premium: 2.00, contracts: 1, optionStyle: "call" },
  ],
});
contractDiagonal.signal(); // → "diagonal"

// ============================================
// CalendarSpreadEngine.signal()
// ============================================
// Caso 1: shortDte = 45 → HOLD
new CalendarSpreadEngine(contract45Dias).signal();  // → "HOLD"

// Caso 2: shortDte = 5 → ROLL (menos de 7 días)
new CalendarSpreadEngine(contract5Dias).signal();   // → "ROLL"

// Caso 3: shortDte <= 0 → EXPIRED
new CalendarSpreadEngine(contractVencido).signal(); // → "EXPIRED"

// Caso 4: netTheta = -8.5 → THETA_ALERT
new CalendarSpreadEngine(contractThetaAlto).signal(); // → "THETA_ALERT"

// Caso 5: |delta| = 0.85 → DELTA_ALERT
new CalendarSpreadEngine(contractDeltaAlto).signal(); // → "DELTA_ALERT"

// ============================================
// DiagonalSpreadEngine.signal()
// ============================================
// Caso 1: adjustmentWindow presente → ROLL
new DiagonalSpreadEngine(contractConVentana).signal();  // → "ROLL"

// Caso 2: directionalProfile = "bullish" → BULLISH
const diagBullish = new DiagonalSpreadEngine(contractBullish);
diagBullish.signal(); // → "BULLISH"

// Caso 3: directionalProfile = "bearish" → BEARISH
const diagBearish = new DiagonalSpreadEngine(contractBearish);
diagBearish.signal(); // → "BEARISH"

// Caso 4: default → NEUTRAL
const diagNeutral = new DiagonalSpreadEngine(contractNeutral);
diagNeutral.signal(); // → "NEUTRAL"

// ============================================
// TermSimulationEngine.signal()
// ============================================
// Caso 1: sin Monte Carlo → NO_MC_DATA
simEngine.signal(undefined, undefined); // → "NO_MC_DATA"

// Caso 2: meanPnl=6.5, var95=-8 → FAVORABLE
simEngine.signal(data, { iterations: 1000, distribution: "normal" }); // → "FAVORABLE"

// Caso 3: meanPnl=-8, var95=-25 → UNFAVORABLE
simEngine.signal(data, mcConfig); // → "UNFAVORABLE"

// Caso 4: meanPnl=2, var95=-15 → NEUTRAL
simEngine.signal(data, mcConfig); // → "NEUTRAL"

// ============================================
// TermRiskEngine.signal()
// ============================================
// Caso 1: netTheta=-12 → RISK_LIMIT_VIOLATION (límite maxTheta=-10 excedido)
riskEngine.signal(-12); // → "RISK_LIMIT_VIOLATION"

// Caso 2: short leg ITM + DTE<14 → EARLY_ASSIGNMENT_RISK
riskEngine.signal(-2, 0.05); // → "EARLY_ASSIGNMENT_RISK"

// Caso 3: todo normal → RISK_OK
riskEngine.signal(-2, 0.05); // → "RISK_OK"

// ============================================
// TermReportEngine.signal()
// ============================================
new TermReportEngine(calResult, null, simResult, null).signal();  // → "REPORT_CALENDAR"
new TermReportEngine(null, diagResult, simResult, null).signal(); // → "REPORT_DIAGONAL"
new TermReportEngine(null, null, null, null).signal();            // → "REPORT_UNKNOWN"

// ============================================
// TermChatAssistant.signal()
// ============================================
new TermChatAssistant(calResult, null, simResult, null).signal();  // → "CALENDAR_NEUTRAL"
new TermChatAssistant(null, diagBullishResult, null, null).signal(); // → "DIAGONAL_BULLISH"
new TermChatAssistant(null, null, null, null).signal();              // → "NO_DATA"

// ============================================
// TermRollOrchestrator.signal()
// ============================================
new TermRollOrchestrator(contract, riskAnalysis, -0.5, 0.02).signal(); // → "HOLD"
new TermRollOrchestrator(contract, riskRollAnalysis, 0.1, 0.15).signal(); // → "ROLL"
new TermRollOrchestrator(contract, riskCloseAnalysis, -2, 0.01).signal(); // → "CLOSE"
```

---

### 11.5 Ejemplo de salida de `report.toJson()`

```ts
const jsonString = report.toJson();
// jsonString es un string JSON con el StructuredReport completo:
// "{\"strategy\":\"calendar\",\"optionStyle\":\"call\",\"generatedAt\":\"2026-05-29T12:00:00.000Z\", ...}"
```

### 11.6 Resumen visual de cada `signal()` y cuándo aparece

```
CalendarSpreadEngine.signal()
  shortDte ≤ 0  ───────────────► "EXPIRED"
  shortDte ≤ 7  ───────────────► "ROLL"
  netTheta < -5 ───────────────► "THETA_ALERT"
  |delta| > 0.7 ───────────────► "DELTA_ALERT"
  default       ───────────────► "HOLD"

DiagonalSpreadEngine.signal()
  adjustmentWindow != null ────► "ROLL"
  directionalProfile=bullish ──► "BULLISH"
  directionalProfile=bearish ──► "BEARISH"
  default       ───────────────► "NEUTRAL"

TermSimulationEngine.signal()
  sin MC        ───────────────► "NO_MC_DATA"
  meanPnl>5 && var95>-10 ──────► "FAVORABLE"
  meanPnl<-5 || var95<-20 ─────► "UNFAVORABLE"
  default       ───────────────► "NEUTRAL"

TermRiskEngine.signal()
  limitsViolation ─────────────► "RISK_LIMIT_VIOLATION"
  earlyAssignmentRisk ─────────► "EARLY_ASSIGNMENT_RISK"
  default       ───────────────► "RISK_OK"

TermReportEngine.signal()
  strategy="calendar" ─────────► "REPORT_CALENDAR"
  strategy="diagonal" ─────────► "REPORT_DIAGONAL"
  default       ───────────────► "REPORT_UNKNOWN"

TermChatAssistant.signal()
  sin datos     ───────────────► "NO_DATA"
  calendar+neut ───────────────► "CALENDAR_NEUTRAL"
  diagonal+bull ───────────────► "DIAGONAL_BULLISH"
  diagonal+bear ───────────────► "DIAGONAL_BEARISH"

TermRollOrchestrator.signal()
  shouldCloseEarly ────────────► "CLOSE"
  shouldRoll     ──────────────► "ROLL"
  default       ───────────────► "HOLD"
```
