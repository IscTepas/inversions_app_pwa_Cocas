# Team 09 — Estado vs T3-Actividad 2

## Backend (Completo ✅)

| Módulo | Archivo | Estado |
|--------|---------|--------|
| Contractos de estrategias | `termStrategyContract.ts` | ✅ |
| Calendar Spread Engine | `calendarSpreadEngine.ts` | ✅ |
| Diagonal Spread Engine | `diagonalSpreadEngine.ts` | ✅ |
| Simulación (Monte Carlo, backtest) | `termSimulationEngine.ts` | ✅ |
| Motor de Riesgo | `termRiskEngine.ts` | ✅ |
| Reportes estructurados | `termReportEngine.ts` | ✅ |
| Roll Orchestrator | `termRollOrchestrator.ts` | ✅ |
| Chat Assistant | `termChatAssistant.ts` | ✅ |
| Utilidades (Black-Scholes, Greeks, IV) | `termUtils.ts` | ✅ |

## API REST (Completo ✅)

| Endpoint | Archivo | Estado |
|----------|---------|--------|
| `POST /api/v1/strategies/term/calendar` | `calendarSpread.ts` | ✅ |
| `POST /api/v1/strategies/term/diagonal` | `diagonalSpread.ts` | ✅ |
| `POST /api/v1/strategies/term/compare` | `termComparator.ts` | ✅ |
| Documentación Swagger | `/api/docs` | ✅ |

## Tests (Completo ✅ — 173 tests)

| Suite | Archivos | Estado |
|-------|----------|--------|
| Contract | `termStrategyContract.test.ts` | ✅ |
| Calendar Spread | `calendarSpreadEngine.test.ts` | ✅ |
| Diagonal Spread | `diagonalSpreadEngine.test.ts` | ✅ |
| Simulación | `termSimulationEngine.test.ts` | ✅ |
| Riesgo | `termRiskEngine.test.ts` | ✅ |
| Roll Orchestrator | `termRollOrchestrator.test.ts` | ✅ |
| Reportes | `termReportEngine.test.ts` | ✅ |
| Chat Assistant | `termChatAssistant.test.ts` | ✅ |
| Integración rutas | `termRoutes.test.ts` | ✅ |

## Frontend React / PWA (No iniciado ❌)

| Requisito T3-Actividad 2 | Estado | Detalle |
|---|---|---|
| Páginas React para Calendar/Diagonal Spread | ❌ | No hay componentes `.tsx` de estrategias |
| CRUDs con formularios web | ❌ | No hay create/update/delete via UI |
| Redux Toolkit (store, slices, hooks) | ❌ | No implementado |
| React Router (navegación entre páginas) | ❌ | Todo en una sola vista |
| Consumo de APIs propias desde Frontend | ❌ | Solo `term-verify.html` llama a los endpoints |
| Tablas con CRUD en tabpages | ❌ | No existen |
| Service Worker + manifest.json | ❌ | Sin infraestructura PWA |
| Despliegue en nube | ❌ | Sin configurar |
| Chat IA expuesto como endpoint | ❌ | `TermChatAssistant` existe pero no tiene ruta |

## Brechas documentadas

| Gap | Descripción | Estado |
|-----|-------------|--------|
| G-T09-01 | Supuestos de estructura temporal IV | ⏳ Pendiente |
| G-T09-02 | Validación de reglas de roll | ⏳ Pendiente |
| G-T09-03 | Métricas theta decay para UI | ⏳ Pendiente |

---

**Resumen:** Team 09 tiene el **backend y lógica de negocio 100% completo**. La actividad T3-Actividad 2 requiere **frontend PWA, CRUDs, Redux Toolkit, routing, y despliegue** — todo eso está sin empezar.
