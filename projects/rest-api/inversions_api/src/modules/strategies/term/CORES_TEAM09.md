# Cores de TEAM-09 — Calendar & Diagonal Spread

> **Rama de trabajo:** `codex/calendar-local`
> **Proyecto:** DIANA Inversions — Módulo `strategies/term/`
> **Tareas:** T162–T169, S-T09-C01
> **Nota de salidas:** La mayoría de los cores devuelven **objetos tipados** (no strings).
> El único método que devuelve un `string` plano es `TermReportEngine.toJson()`.

---

## Índice

1. [TermStrategyContract](#1-termstrategycontract--t162)
2. [CalendarSpreadEngine](#2-calendarspreadengine--t163)
3. [DiagonalSpreadEngine](#3-diagonalspreadengine--t164)
4. [TermSimulationEngine](#4-termsimulationengine--t165)
5. [TermRiskEngine](#5-termriskengine--t166)
6. [TermReportEngine](#6-termreportengine--t167)
7. [TermChatAssistant](#7-termchatassistant--s-t09-c01)
8. [TermRollOrchestrator](#8-termrollorchestrator--t169)

---

## 1. TermStrategyContract — T162

**Archivo:** `termStrategyContract.ts`
**Propósito:** Módulo fundacional. Define los tipos base (`TermLeg`, `TermStrategyInput`) y valida consistencia temporal y de estilo de opción para ambas estrategias. Es la única dependencia que no importa ningún otro core del árbol.

**Usado por:** CalendarSpreadEngine, DiagonalSpreadEngine, TermSimulationEngine, TermRiskEngine, TermRollOrchestrator, y todas las rutas POST.

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `validate()` | Objeto con `isValid: boolean` y `errors: TermStrategyError[]` | `ValidationResult` | ❌ No |
| `getType()` | `"calendar"` o `"diagonal"` | `StrategyType` (union literal) | ✅ Sí (string literal) |
| `getLegs()` | Arreglo de patas del spread | `TermLeg[]` | ❌ No |
| `getInput()` | Copia del input original | `TermStrategyInput` | ❌ No |

### Tipos clave

```ts
interface ValidationResult {
  isValid: boolean;
  errors: TermStrategyError[];  // clase con code, message, field
}

interface TermLeg {
  strike: number;
  expiration: Date;
  premium: number;
  contracts: number;
  optionStyle: "call" | "put";
}

type StrategyType = "calendar" | "diagonal";
```

> **Reglas que aplica `validate()`:**
> - Mínimo 2 patas
> - Strike positivo, prima ≥ 0, contratos > 0
> - `optionStyle` debe ser `"call"` o `"put"` (igual en todas las patas)
> - Fecha de expiración válida y no en el pasado
> - Expiración corta < expiración larga, con diferencia mínima de 7 días
> - No permite mismo strike + misma expiración (no es spread), ni distinto strike + misma expiración (eso sería vertical spread)

---

## 2. CalendarSpreadEngine — T163

**Archivo:** `calendarSpreadEngine.ts`
**Propósito:** Analiza un Calendar Spread: calcula las griegas netas (Black-Scholes), genera escenarios de precio, perfiles de theta/vega y stress tests. Recibe un contrato validado + tasa libre de riesgo + curva IV.

**Usado por:** ruta `POST /calendar`, TermReportEngine, TermChatAssistant.

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `analyze()` | Resultado completo del análisis | `CalendarSpreadResult` | ❌ No |

### Tipo de salida

```ts
interface CalendarSpreadResult {
  shortDte: number;              // días a expiración de la pata corta
  longDte: number;               // días a expiración de la pata larga
  shortTheta: number;            // theta de la pata corta
  longTheta: number;             // theta de la pata larga
  netTheta: number;              // theta neto de la estrategia
  greeks: GreekSensitivities;    // delta, gamma, theta, vega (todos number)
  scenarios: CalendarScenario[]; // array de escenarios por precio subyacente
  stressTests: CalendarStressTest[];
}

interface CalendarScenario {
  underlyingPrice: number;
  strategyValue: number;
  pnl: number;
  theta: number;
  impliedVolatility: number;
}

interface CalendarStressTest {
  label: string;                 // ← string
  description: string;           // ← string
  underlyingPrice: number;
  shortIv: number;
  longIv: number;
  strategyValue: number;
  pnl: number;
  theta: number;
}
```

> `GreekSensitivities` = `{ delta: number, gamma: number, theta: number, vega: number }`

---

## 3. DiagonalSpreadEngine — T164

**Archivo:** `diagonalSpreadEngine.ts`
**Propósito:** Analiza un Diagonal Spread: griegas netas, perfil direccional, ventana de ajuste (roll), escenarios de precio, perfiles de theta decay, vega shock y stress tests. A diferencia del Calendar, los strikes son diferentes.

**Usado por:** ruta `POST /diagonal`, TermReportEngine, TermChatAssistant.

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `analyze()` | Resultado completo del análisis | `RiskProfile` | ❌ No |

### Tipo de salida

```ts
interface RiskProfile {
  shortDte: number;
  longDte: number;
  greeks: GreekSensitivities;             // delta, gamma, theta, vega
  directionalProfile: DirectionalProfile; // "bullish" | "bearish" | "neutral"
  scenarios: DiagonalScenario[];
  thetaDecayProfile: DiagonalScenario[];  // evolución del P&L con el tiempo
  vegaShockProfile: DiagonalScenario[];   // impacto de shocks de volatilidad
  adjustmentWindow: AdjustmentWindow | null;
  stressTests: DiagonalStressTest[];
}

interface DiagonalScenario {
  underlyingPrice: number;
  strategyValue: number;
  pnl: number;           // corregido: ya no es siempre 0
  theta: number;
  impliedVolatility: number;
}

interface AdjustmentWindow {
  shouldAdjust: boolean;
  reason: string;        // ← string (en español)
  suggestedAction: string; // ← string
}

interface DiagonalStressTest {
  label: string;         // ← string (corregido: sin typos)
  description: string;   // ← string
  underlyingPrice: number;
  shortIv: number;
  longIv: number;
  strategyValue: number;
  pnl: number;
  greeks: { delta: number; gamma: number; theta: number; vega: number };
}

type DirectionalProfile = "bullish" | "bearish" | "neutral";
```

---

## 4. TermSimulationEngine — T165

**Archivo:** `termSimulationEngine.ts`
**Propósito:** Ejecuta simulación Monte Carlo y determinista sobre la estrategia. Soporta distribución normal o lognormal. Genera escenarios de precio/IV/DTE y distribuciones de P&L.

**Usado por:** rutas `POST /calendar` y `POST /diagonal`, TermReportEngine.

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `simulate(backtest?, mcConfig?)` | Resultado completo de simulación | `SimulationResult` | ❌ No |

### Tipo de salida

```ts
interface SimulationResult {
  strategy: "calendar" | "diagonal";   // ← string literal
  optionStyle: OptionStyle;            // "call" | "put"
  backtest: BacktestResult | null;
  monteCarlo: MonteCarloResult | null;
  deterministic: DeterministicScenario[];
  timestamp: Date;                     // ← Date, no string
}

interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  returns: number[];
  equityCurve: number[];
}

interface MonteCarloResult {
  iterations: number;
  distribution: string;           // "normal" | "lognormal"
  meanPnl: number;
  medianPnl: number;
  percentile5: number;
  percentile95: number;
  var95: number;
  pnlDistribution: number[];
}

interface DeterministicScenario {
  label: string;          // ← string
  price: number;
  ivShock: number;
  dteRemaining: number;
  strategyValue: number;
  pnl: number;
}
```

> ⚠️ `timestamp` es un `Date`, no un string. Si se serializa a JSON se convierte a ISO string automáticamente.

---

## 5. TermRiskEngine — T166

**Archivo:** `termRiskEngine.ts`
**Propósito:** Análisis de riesgo con límites configurables (concentración, expiración, theta). Evalúa riesgo de asignación temprana, genera reglas de stop-loss (fixed/percentage/trailing) y alertas push/email.

**Usado por:** TermRollOrchestrator (importa `RiskAnalysis`), TermReportEngine (indirectamente vía rutas).

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `analyze(netTheta, netGamma?)` | Análisis completo de riesgo | `RiskAnalysis` | ❌ No |
| `getContract()` | El contrato que recibió | `TermStrategyContract` | ❌ No |

### Tipo de salida

```ts
interface RiskAnalysis {
  limitsViolation: boolean;
  violations: string[];               // ← array de strings descriptivos
  earlyAssignmentRisk: EarlyAssignmentRisk | null;
  stopLossRules: StopLossRule[];
  alerts: RiskAlert[];
  portfolioExposure: number;
  thetaExposure: number;
}

interface EarlyAssignmentRisk {
  isAtRisk: boolean;
  probability: number;
  reason: string;                     // ← string
  leg: TermLeg;
}

interface StopLossRule {
  type: "fixed" | "percentage" | "trailing"; // ← string literal
  value: number;
  triggered: boolean;
  currentDrawdown: number;
  message: string;                    // ← string
}

interface RiskAlert {
  type: "push" | "email";            // ← string literal
  severity: "low" | "medium" | "high" | "critical"; // ← string literal
  message: string;                   // ← string
  timestamp: Date;                   // ← Date, no string
  data: Record<string, unknown>;
}
```

> ⚠️ `RiskAlert.timestamp` es un `Date`. Los campos `message`, `violations[]`, y `reason` son strings planos dentro de objetos.

---

## 6. TermReportEngine — T167

**Archivo:** `termReportEngine.ts`
**Propósito:** Agrega resultados de calendar/diagonal + simulación + riesgo en un reporte estructurado único. Genera curva de payoff, superficie tiempo-precio-IV (solo calendar), métricas de riesgo, probability cone y stress tests. Exportable a JSON para TEAM-01.

**Usado por:** rutas `POST /calendar` y `POST /diagonal`.

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `generateReport()` | Reporte estructurado completo | `StructuredReport` | ❌ No |
| `toJson()` | Reporte serializado | `string` | ✅ **SÍ — único método que devuelve string puro** |
| `generatePayoffCurve()` | Curva de payoff | `PayoffCurvePoint[]` | ❌ No |
| `generateSurface()` | Superficie 3D (calendar) o null | `TimePriceIvSurface \| null` | ❌ No |
| `calculateRiskMetrics()` | Métricas de riesgo agregadas | `RiskMetrics` | ❌ No |
| `generateStressTestSummary()` | Stress tests normalizados | `StressTestEntry[]` | ❌ No |
| `generateProbabilityCone()` | Cono de probabilidad | `ProbabilityConePoint[]` | ❌ No |
| `static calculateBreakEvens(curve)` | Precios de break-even | `number[]` | ❌ No |
| `static calculateNetCost(legs)` | Costo neto de entrada | `number` | ❌ No |
| `static generatePayoffAtExpiration(...)` | Curva al vencimiento corto | `PayoffCurvePoint[]` | ❌ No |

### Tipo de salida principal

```ts
interface StructuredReport {
  strategy: string;            // "calendar" | "diagonal"
  optionStyle: string;         // "call" | "put"
  payoffCurve: PayoffCurvePoint[];
  surface: TimePriceIvSurface | null;  // null para diagonal
  riskMetrics: RiskMetrics;
  deterministic: DeterministicScenario[];
  stressTests: StressTestEntry[];
  probabilityCone: ProbabilityConePoint[];
  generatedAt: string;         // ← ISO string (Date.toISOString())
}

interface RiskMetrics {
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  probabilityOfProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  stressTestMaxLoss: number;
  stressTestMaxGain: number;
  expectedShortfall: number;
}

interface PayoffCurvePoint {
  price: number;
  payoff: number;
  pnl: number;
}

interface ProbabilityConePoint {
  dte: number;
  percentile5: number;
  percentile25: number;
  median: number;
  percentile75: number;
  percentile95: number;
}
```

> ✅ `TermReportEngine.toJson()` es el **único método de todos los cores** que devuelve un `string` puro (JSON serializado con `JSON.stringify(..., null, 2)`).
> ⚠️ `generatedAt` dentro del reporte es un string ISO — pero el objeto `StructuredReport` en sí no es un string.

---

## 7. TermChatAssistant — S-T09-C01

**Archivo:** `termChatAssistant.ts`
**Propósito:** Genera explicaciones en lenguaje natural (inglés) sobre el propósito, riesgo y condiciones de uso de la estrategia. **No autoriza ejecución (RNF-001).** No está conectado a ninguna ruta actualmente — disponible para integración con el chat IA del frontend.

**Usado por:** (sin rutas activas — disponible para integración futura)

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `explain()` | Explicación estructurada completa | `ChatExplanation` | ❌ No |
| `getContext()` | Contexto extraído de la estrategia | `ChatContext \| null` | ❌ No |

### Tipos de salida

```ts
interface ChatExplanation {
  purpose: string;            // ← string (texto en inglés)
  riskProfile: string;        // ← string (texto en inglés)
  usageConditions: string;    // ← string (texto en inglés)
  scenarioSummary: string;    // ← string (texto en inglés)
  disclaimer: string;         // ← string (aviso legal fijo)
  structuredOutput: {
    purpose: string;
    conditions: string[];
    risks: string[];
    metrics: Record<string, number | string>;  // ← mixto
  };
}

interface ChatContext {
  strategyType: "calendar" | "diagonal";
  optionStyle: "call" | "put";
  shortStrike: number;
  longStrike: number;
  shortDte: number;
  longDte: number;
  netTheta: number;
  netDelta: number;
  directionalProfile: string;  // "bullish" | "bearish" | "neutral"
}
```

> ⚠️ Aunque los campos internos de `ChatExplanation` son strings, el objeto de salida de `explain()` **no es un string** — es el objeto completo.
> El campo `metrics` dentro de `structuredOutput` es `Record<string, number | string>` — puede contener tanto números como strings.

---

## 8. TermRollOrchestrator — T169

**Archivo:** `termRollOrchestrator.ts`
**Propósito:** Evalúa si una posición debe hacerse roll (renovación de la pata corta) o cerrarse anticipadamente. Evalúa 4 triggers: theta residual bajo, gamma alto, DTE mínimo alcanzado, violación de límites de riesgo. Calcula el costo estimado del roll via Black-Scholes.

**Usado por:** (sin rutas activas — módulo de orquestación interna, disponible para integración futura)

### Métodos públicos y sus salidas

| Método | Salida | Tipo | ¿Es string? |
|---|---|---|---|
| `evaluate()` | Recomendación completa de roll | `RollRecommendation` | ❌ No |
| `getContract()` | El contrato | `TermStrategyContract` | ❌ No |

### Tipo de salida

```ts
interface RollRecommendation {
  shouldRoll: boolean;
  shouldCloseEarly: boolean;
  triggers: RollTriggerEvaluation;
  cost: RollCost | null;       // null si la pata corta ya expiró
  recommendation: string;      // ← string (texto descriptivo)
  timing: string;              // ← string: "Today", "Within 2 days", etc.
}

interface RollTriggerEvaluation {
  thetaResidualTriggered: boolean;
  gammaExposureTriggered: boolean;
  dteMinTriggered: boolean;
  riskLimitViolationTriggered: boolean;
  triggered: boolean;          // OR de los 4 anteriores
  reasons: string[];           // ← array de strings descriptivos
}

interface RollCost {
  premiumDifferential: number;
  transactionCost: number;
  totalCost: number;
  postRollRiskDelta: number;
  postRollRiskTheta: number;
}
```

> `recommendation` y `timing` son strings dentro del objeto — el objeto de salida `RollRecommendation` **no es un string**.

---

## Resumen de salidas — tabla comparativa

| Core | Task | Método principal | Tipo de salida | ¿String? |
|---|---|---|---|---|
| `TermStrategyContract` | T162 | `validate()` | `ValidationResult` | ❌ objeto |
| `TermStrategyContract` | T162 | `getType()` | `"calendar" \| "diagonal"` | ✅ string literal |
| `CalendarSpreadEngine` | T163 | `analyze()` | `CalendarSpreadResult` | ❌ objeto |
| `DiagonalSpreadEngine` | T164 | `analyze()` | `RiskProfile` | ❌ objeto |
| `TermSimulationEngine` | T165 | `simulate()` | `SimulationResult` | ❌ objeto |
| `TermRiskEngine` | T166 | `analyze()` | `RiskAnalysis` | ❌ objeto |
| `TermReportEngine` | T167 | `generateReport()` | `StructuredReport` | ❌ objeto |
| `TermReportEngine` | T167 | `toJson()` | `string` | ✅ **STRING PURO** |
| `TermChatAssistant` | S-T09-C01 | `explain()` | `ChatExplanation` | ❌ objeto |
| `TermRollOrchestrator` | T169 | `evaluate()` | `RollRecommendation` | ❌ objeto |

### Casos especiales de tipos no-string dentro de objetos

| Core | Campo | Tipo real | Nota |
|---|---|---|---|
| `TermSimulationEngine` | `SimulationResult.timestamp` | `Date` | Se convierte a ISO string al serializar |
| `TermRiskEngine` | `RiskAlert.timestamp` | `Date` | Se convierte a ISO string al serializar |
| `TermChatAssistant` | `structuredOutput.metrics` | `Record<string, number \| string>` | Mixto: puede ser número o string |
| `TermReportEngine` | `TimePriceIvSurface.pnlMatrix` | `number[][]` | Matriz 2D, no array plano |
| `TermReportEngine` | `StructuredReport.surface` | `TimePriceIvSurface \| null` | `null` para diagonal |

---

*Generado para TEAM-09 (SquadISC) — Rama: `codex/calendar-local`*
