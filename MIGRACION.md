# Migración: inversions_app_pwa_Cocas → inversions_app_pwa-main

## Archivos preservados de la versión anterior (Cocas)

### Team 09 — Calendar & Diagonal Spread (tuyo)
Estos archivos NO existían en la versión nueva y se restauraron desde git:

**Módulos backend (10):**
- `projects/rest-api/inversions_api/src/modules/strategies/term/termStrategyContract.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/calendarSpreadEngine.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/diagonalSpreadEngine.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/termSimulationEngine.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/termRiskEngine.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/termReportEngine.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/termRollOrchestrator.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/termChatAssistant.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/termUtils.ts`
- `projects/rest-api/inversions_api/src/modules/strategies/term/CORES_TEAM09.md`

**Rutas backend (3):**
- `projects/rest-api/inversions_api/src/routes/strategies/term/calendarSpread.ts`
- `projects/rest-api/inversions_api/src/routes/strategies/term/diagonalSpread.ts`
- `projects/rest-api/inversions_api/src/routes/strategies/term/termComparator.ts`

**Tests (9):**
- `projects/rest-api/inversions_api/tests/unit/strategies/term/termStrategyContract.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/calendarSpreadEngine.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/diagonalSpreadEngine.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/termSimulationEngine.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/termRiskEngine.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/termRollOrchestrator.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/termReportEngine.test.ts`
- `projects/rest-api/inversions_api/tests/unit/strategies/term/termChatAssistant.test.ts`
- `projects/rest-api/inversions_api/tests/integration/strategies/term/termRoutes.test.ts`

**Frontend:**
- `projects/pwa/inversions_app/public/term-verify.html`

### Otras estrategias preservadas (solo en Cocas)
- `modules/strategies/options/` (longCall, longPut, shortCall, shortPut, optionMath)
- `modules/strategies/optionsAnalysisCore.ts`
- `modules/strategies/optionsStrategyContract.ts`
- `modules/strategies/optionsStrategyService.ts`
- `modules/strategies/simulationEngine.ts`
- `modules/strategies/strategyComparator.ts`
- `modules/strategies/strategyRecommendationService.ts`
- `modules/strategies/alertService.ts`
- `modules/strategies/standards/errorHandling.ts`
- `modules/strategies/standards/iStrategy.ts`
- `routes/strategies/optionsRouter.ts`
- `routes/strategies/optionsAnalysisQARouter.ts`
- `tests/unit/strategies/fundamentalOptions.test.ts`
- `tests/unit/strategies/strategyRecommendationService.test.ts`
- `tests/integration/strategies/optionsRoutes.test.ts`

### Routes registradas manualmente en index.ts
Se agregaron estas líneas a `src/index.ts` del backend:
- `api/team-03/options` → createOptionsRouter, createOptionsAnalysisQARouter
- `api/v1/strategies/term` → calendarSpreadRouter, diagonalSpreadRouter, termComparatorRouter

---

## Archivos nuevos incorporados desde inversions_app_pwa-main

**Frontend (10 archivos nuevos):**
- `src/components/ui/MarkdownContent.tsx`
- `src/components/ui/Tooltip.tsx`
- `src/features/dashboard/ChartLegend.tsx`
- `src/features/dashboard/ObservationsTab.tsx`
- `src/features/dashboard/useChartInit.ts`
- `src/features/dashboard/simulation/SimulatorStrategySection.tsx`
- `src/features/options/OptionChainTable.tsx`
- `src/services/options/optionChainApi.ts`
- `src/utils/format.ts`
- `src/utils/indicators.ts`

**Backend (8 archivos nuevos):**
- `src/modules/market/alpacaOptionsClient.ts`
- `src/modules/market/cboeOptionsClient.ts`
- `src/modules/market/marketdataClient.ts`
- `src/modules/market/optionChainService.ts`
- `src/modules/market/tradierClient.ts`
- `src/modules/institutional/yahooChartParser.ts`
- `src/routes/options/chain.ts`
- `src/routes/options/expirations.ts`

---

## Archivos eliminados (no existen en la versión main)
- `src/features/ai/FundamentalCopilotPanel.tsx`
- `src/features/dashboard/MultiSymbolCharts.tsx`
- `src/features/dashboard/simulation/FundamentalAnalysisModal.tsx`
- `src/features/dashboard/simulation/ProjectionSimulationPanel.tsx`
- `vitest-shim.d.ts`

---

## Archivos modificados (existían en ambas versiones, se usó la de main)
- `modules/strategies/coverage/*` (10 archivos: collarEngine, protectivePutEngine, coverageComparator, etc.)
- ~55 archivos backend con cambios entre versiones
- ~46 archivos frontend con cambios entre versiones
 
---

## Verificación post-migración
- ✅ `npm install` — dependencias instaladas correctamente
- ✅ `npm run lint` — TypeScript sin errores (frontend + backend)
- ✅ `npm run test` — 490 tests pasando en 56 archivos

---

> **Nota:** Para arrancar el backend necesitas configurar `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` en tu `.env`. Usa `.env.example` como base.
