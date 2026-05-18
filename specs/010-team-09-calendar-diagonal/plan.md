# Plan Operativo Speckit: Calendar Spread & Diagonal Spread
## TEAM-09 — SquadISC

**Proyecto**: diana-inversions
**Iniciativa**: 001-inversions
**Equipo**: TEAM-09 (SquadISC)
**Engine**: speckit
**Etapa**: plan
**Idioma**: es
**Generado desde**: `/diana.integrate action="run" engine="speckit" project="diana-inversions" initiative="001-inversions" team="TEAM-09" run_only="plan" language="es"`
**Canon de entrada (base)**: `teams/TEAM-09/plan.md`
**Spec Speckit vigente**: `specs/010-team-09-calendar-diagonal/spec.md`
**Version**: 1.0
**Estado**: Draft Speckit

---

## 1. Autoridad (desde canon Diana)

Este plan de equipo esta subordinado a:
1. `inv-constitution.md`
2. `001-inv-spec.md`
3. `001-inv-plan.md`
4. `teams/TEAM-09/spec.md`
5. `scope_primario.md`
6. `specs/010-team-09-calendar-diagonal/spec.md` — spec Speckit vigente del feature

**Regla de autoridad**: Ante conflicto entre este plan operativo y el canon Diana (`teams/TEAM-09/plan.md`), prevalece el canon. Este plan expande, detalla y complementa, pero NO omite ni contradice el canon fuente.

---

## 2. Objetivo (desde canon Diana — preservado)

Implementar estrategias Calendar Spread y Diagonal Spread con explicabilidad, trazabilidad y consumo operativo.

**Ampliacion Speckit**: El objetivo se descompone en 8 modulos de implementacion con entregables concretos, rutas de integracion y criterios de aceptacion por modulo, manteniendo trazabilidad 1:1 con las fases tecnicas del canon.

---

## 3. Fases Tecnicas (desde canon Diana — preservado y expandido)

### Fase T09-1: Modelado temporal
- Contratos para estructuras calendar y diagonal.
- Parametrizacion call/put.

### Fase T09-2: Calculo y escenarios
- Riesgo, tiempo y sensibilidad.
- Reglas de evaluacion comparativa.

### Fase T09-3: Chat IA y API
- Narrativa explicativa de estructura temporal.
- Endpoints para consumo operativo.

### Fase T09-4: Validacion
- Trazabilidad y readiness para Speckit.

---

## 4. Mapeo de Fases Canonicas a Modulos Speckit (Speckit expansion)

Cada fase canonica se materializa en uno o mas modulos de la arquitectura definida en `spec.md`:

| Fase Canonica | Modulo Speckit | Artefacto(s) | IDs Tarea Asociados |
|---------------|----------------|--------------|---------------------|
| **T09-1** Modelado temporal | `termStrategyContract.ts` | Contrato base Calendar/Diagonal con validacion de consistencia temporal y estilo de opcion | T162 |
| **T09-1** Modelado temporal | `calendarSpreadEngine.ts` | Core Calendar Spread (call/put) con theta, vencimiento corto/largo, term structure IV | T163 |
| **T09-1** Modelado temporal | `diagonalSpreadEngine.ts` | Core Diagonal Spread (call/put) con combinacion strike+tiempo, griegas, perfiles de riesgo | T164 |
| **T09-2** Calculo y escenarios | `termSimulationEngine.ts` | Backtesting, Monte Carlo/escenarios deterministicos, proyeccion payoff/P&L | T165 |
| **T09-2** Calculo y escenarios | `termRiskEngine.ts` | Limites por vencimiento, riesgo de asignacion, stop-loss, alertas | T166 |
| **T09-2** Calculo y escenarios | `termRollOrchestrator.ts` | Reglas de roll/ajuste, cierre anticipado, control de deterioro temporal | T169 |
| **T09-3** Chat IA y API | `calendarSpread.ts` (API) | API REST Calendar Spread | T168 |
| **T09-3** Chat IA y API | `diagonalSpread.ts` (API) | API REST Diagonal Spread | T168 |
| **T09-3** Chat IA y API | `termComparator.ts` | Comparador Calendar vs Diagonal para recomendacion segun contexto | T168 |
| **T09-3** Chat IA y API | `termChatAssistant.ts` | Integracion Chat IA explicativo | — |
| **T09-3** Chat IA y API | `termReportEngine.ts` | Curvas de payoff, superficies tiempo-precio-IV, metricas riesgo/beneficio | T167 |
| **T09-4** Validacion | Tests unitarios y de integracion | `tests/unit/strategies/term/`, `tests/integration/strategies/term/` | T196, T197, T198 |
| **T09-4** Validacion | Estandarizacion transversal | Ajuste al estandar transversal de estrategias | T177 |

---

## 5. Plan de Implementacion por Modulo (Speckit expansion)

### 5.1 Contrato Base — `termStrategyContract.ts`

**Dependencias**: Ninguna (modulo fundacional)
**Estimacion**: 1 unidad de desarrollo
**Criterio de aceptacion**:
- Valida consistencia temporal (expiracion corta < expiracion larga)
- Valida estilo de opcion (call/put) por pata
- Acepta inputs: strikes, expiraciones, primas, contratos
- Rechaza configuraciones invalidas con error descriptivo
**Depende de**: —
**Habilitador de**: calendarSpreadEngine, diagonalSpreadEngine

### 5.2 Calendar Spread Engine — `calendarSpreadEngine.ts`

**Dependencias**: termStrategyContract
**Estimacion**: 2 unidades de desarrollo
**Criterio de aceptacion**:
- Modela theta decay para vencimiento corto y largo
- Calcula impacto de term structure IV
- Genera escenarios de precio en rango configurable
- Soporta variantes call y put
**Depende de**: T162 completado
**Habilitador de**: termSimulationEngine, termRiskEngine

### 5.3 Diagonal Spread Engine — `diagonalSpreadEngine.ts`

**Dependencias**: termStrategyContract
**Estimacion**: 2 unidades de desarrollo
**Criterio de aceptacion**:
- Combina strike diferencial + expiracion diferencial
- Calcula sensibilidad de griegas (delta, gamma, theta, vega)
- Genera perfiles de riesgo por escenario de precio y tiempo
- Identifica ventanas de ajuste/roll
**Depende de**: T162 completado
**Habilitador de**: termSimulationEngine, termRiskEngine

### 5.4 Motor de Simulacion Temporal — `termSimulationEngine.ts`

**Dependencias**: calendarSpreadEngine, diagonalSpreadEngine
**Estimacion**: 2 unidades de desarrollo
**Criterio de aceptacion**:
- Soporta backtesting con datos historicos
- Ejecuta Monte Carlo con parametros configurables (iteraciones, distribuciones)
- Ejecuta escenarios deterministicos (precio fijo, shock de IV, paso temporal)
- Proyecta payoff y P&L en tiempo real
**Depende de**: T163, T164 completados
**Habilitador de**: termRiskEngine, termReportEngine

### 5.5 Motor de Riesgo — `termRiskEngine.ts`

**Dependencias**: termSimulationEngine
**Estimacion**: 1.5 unidades de desarrollo
**Criterio de aceptacion**:
- Aplica limites por vencimiento (max fecha, concentracion)
- Calcula riesgo de asignacion temprana
- Implementa reglas de stop-loss configurables
- Dispara alertas push/email en violacion de limites
**Depende de**: T165 completado
**Habilitador de**: termRollOrchestrator

### 5.6 Orquestador de Gestion Temporal — `termRollOrchestrator.ts`

**Dependencias**: termRiskEngine
**Estimacion**: 1.5 unidades de desarrollo
**Criterio de aceptacion**:
- Ejecuta reglas de roll programadas por calendario
- Evalua triggers de ajuste basados en umbrales de riesgo
- Calcula costos de roll y recomienda cierre anticipado si aplica
- Controla deterioro temporal con metrica theta residual
**Depende de**: T166 completado
**Habilitador de**: API layer

### 5.7 Visualizacion y Reporting — `termReportEngine.ts`

**Dependencias**: termSimulationEngine
**Estimacion**: 1.5 unidades de desarrollo
**Criterio de aceptacion**:
- Genera curvas de payoff para ambas estrategias
- Produce superficies tiempo-precio-IV
- Presenta metricas riesgo/beneficio auditables (formato JSON + visual)
- Exporta datos para consumo por TEAM-01 (dashboard)
**Depende de**: T165 completado
**Habilitador de**: API layer, Chat IA

### 5.8 APIs de Exposicion — `calendarSpread.ts`, `diagonalSpread.ts`, `termComparator.ts`

**Dependencias**: Todos los modulos anteriores
**Estimacion**: 2 unidades de desarrollo
**Criterio de aceptacion**:
- API REST con respuestas JSON estructuradas
- Endpoint Calendar Spread: calculo completo + escenarios
- Endpoint Diagonal Spread: calculo completo + escenarios
- Endpoint comparador: Calendar vs Diagonal segun contexto multi-core
- Documentacion OpenAPI/Swagger
**Depende de**: T163, T164, T165, T167 completados
**Habilitador de**: Consumo frontend y otros equipos

### 5.9 Chat IA Explicativo — `termChatAssistant.ts`

**Dependencias**: Todos los modulos anteriores
**Estimacion**: 2 unidades de desarrollo
**Criterio de aceptacion**:
- Explica proposito de la estructura temporal seleccionada
- Detalla riesgo y condiciones de uso en lenguaje natural
- Contextualiza basado en escenarios del motor de simulacion
- No autoriza ejecucion ni sustituye juicio humano (RNF-001)
**Depende de**: T163, T164, T165 completados
**Habilitador de**: Experiencia de usuario con IA conversacional

### 5.10 Tests — Unitarios y de Integracion

| ID Tests | Modulo(s) Bajo Prueba | Tipo | Archivo Destino |
|----------|----------------------|------|-----------------|
| T196 | calendarSpreadEngine, diagonalSpreadEngine | Unitario | `tests/unit/strategies/term/` |
| T197 | termSimulationEngine, termRollOrchestrator | Unitario | `tests/unit/strategies/term/` |
| T198 | calendarSpread (route), diagonalSpread (route), termComparator (route) | Integracion | `tests/integration/strategies/term/` |

**Cobertura minima requerida**: 80% en rutas criticas (logica de negocio, contratos de API, flujos de error)

### 5.11 Estandarizacion Transversal — T177

- Ajustar implementacion de TEAM-09 al estandar transversal definido en `001-inv-tasks.md`
- Asegurar consistencia de naming, estructura de archivos, manejo de errores y patrones de integracion con el resto de los equipos

---

## 6. Grafo de Dependencias (Speckit expansion)

```
T162 (termStrategyContract)
  ├──> T163 (calendarSpreadEngine)
  ├──> T164 (diagonalSpreadEngine)
  │
  ├──> T165 (termSimulationEngine)
  │     ├──> T166 (termRiskEngine)
  │     │     └──> T169 (termRollOrchestrator)
  │     └──> T167 (termReportEngine)
  │
  ├──> T168 (APIs + Comparator) ← depende de T163, T164, T165, T167
  ├──> termChatAssistant ← depende de T163, T164, T165
  │
  └──> T196 (tests unitarios engines)
  └──> T197 (tests unitarios simulacion)
  └──> T198 (tests integracion routes)
  └──> T177 (estandarizacion transversal)
```

**Secuencia recomendada de implementacion**:
1. **Ola 1**: T162 → T163 + T164 (fundacion)
2. **Ola 2**: T165 → T166 + T167 (simulacion y riesgo)
3. **Ola 3**: T169 + T168 + Chat IA (orquestacion y exposicion)
4. **Ola 4**: T196 + T197 + T198 + T177 (calidad y cierre)

---

## 7. Riesgos (desde canon Diana — preservado y expandido)

### Del canon (preservado):
- Parametrizacion temporal incorrecta; mitigar con contratos y pruebas.
- Salidas ambiguas; mitigar con explicabilidad y supuestos visibles.

### Ampliacion Speckit (expandido desde spec.md):

| ID Riesgo | Descripcion | Mitigacion | Fase de impacto |
|-----------|-------------|------------|-----------------|
| R-01 | Parametrizacion temporal incorrecta | Contratos robustos (`termStrategyContract`) con validacion de consistencia + tests unitarios T196 | T09-1 |
| R-02 | Salidas ambiguas para validacion humana | Explicabilidad y supuestos visibles en cada salida de `termReportEngine` y `termChatAssistant` | T09-3, T09-4 |
| R-03 | Dependencia de datos de mercado no disponibles | Contratos desacoplados con validacion de existencia en `termSimulationEngine` | T09-2 |
| R-04 | Complejidad de modelado de IV term structure | Documentacion de supuestos por mercado en `calendarSpreadEngine` y `diagonalSpreadEngine` | T09-1 |
| R-05 | Riesgo de asignacion temprana no detectado | Reglas en `termRiskEngine` con alertas push/email | T09-2 |
| R-06 | Deterioro temporal no controlado | `termRollOrchestrator` con metrica theta residual y triggers de roll | T09-2 |

---

## 8. Criterios de Validacion (desde canon Diana — preservado y expandido)

### Del canon (preservado):
- Las estrategias temporales quedan modeladas y explicadas.
- La salida es trazable y util para validacion humana.
- El plan queda listo para `/speckit.plan`.

### Ampliacion Speckit:
- Cada modulo pasa sus criterios de aceptacion individuales (seccion 5).
- La suite de tests T196-T198 pasa con cobertura >= 80% en rutas criticas.
- El grafo de dependencias se respeta en la secuencia de implementacion.
- Los contratos de integracion (`auth-context.md`, `broker-adapter.md`, `signal-lifecycle.md`) se cumplen sin desviaciones.
- Los gaps G-T09-01, G-T09-02 y G-T09-03 estan resueltos o con plan de cierre definido.
- No hay omision de contenido canonico vs `teams/TEAM-09/plan.md`.

---

## 9. Contratos de Integracion (desde spec.md)

### Contratos de entrada obligatorios:
- `specs/001-plataforma-inversiones-ia/contracts/auth-context.md`
- `specs/001-plataforma-inversiones-ia/contracts/broker-adapter.md`
- `specs/001-plataforma-inversiones-ia/contracts/signal-lifecycle.md`

### Contratos de salida:
- API REST con respuestas JSON estructuradas para consumo por frontend y otros equipos.
- Formato de metricas de theta decay y sensibilidad temporal para UI consolidada (coordinado con TEAM-01).

---

## 10. Gaps y Decisiones Pendientes (desde team-agent-bootstrap.md — preservado)

| Gap | Descripcion | Estado | Responsable |
|-----|-------------|--------|-------------|
| G-T09-01 | Definir supuestos de modelado de curva temporal e IV term structure por mercado | Pendiente | TEAM-09 + Riesgo Institucional |
| G-T09-02 | Validar reglas de roll (calendario, triggers, costos) con politica de riesgo institucional | Pendiente | TEAM-09 + Riesgo Institucional |
| G-T09-03 | Acordar formato de metricas de theta decay y sensibilidad temporal para UI consolidada | Pendiente | TEAM-09 + TEAM-01 |

**Recomendacion**: Resolver G-T09-01 y G-T09-02 antes de iniciar T169 (termRollOrchestrator). Resolver G-T09-03 antes de T167 (termReportEngine).

---

## 11. Integracion con Speckit (desde canon Diana — preservado)

- `/diana.plan action="generate" project="diana-inversions" initiative="001-inversions" team="TEAM-09"`
- Luego `/speckit.plan`

**Nota Speckit**: Este plan operativo constituye la salida de `speckit.plan` para TEAM-09. La siguiente etapa es `speckit.tasks` para generar el backlog operativo detallado con asignacion de recursos y estimaciones.

---

## 12. Trazabilidad con SDD Engine Matrix

**Etapa**: speckit.plan
**Required skills** (desde `sdd-engine-matrix.yaml`):
| Skill ID | Nombre | Estado |
|----------|--------|--------|
| 001-inv-technical-analysis-structure | Technical Analysis Structure | Disponible |
| 002-inv-indicator-signal-logic | Indicator Signal Logic | Disponible |
| 004-inv-options-strategy-engine | Options Strategy Engine | Disponible |
| 005-inv-institutional-options-flow | Institutional Options Flow | Disponible |
| 006-inv-realtime-news-impact | Realtime News Impact | Disponible |
| 007-inv-ai-confluence-orchestration | AI Confluence Orchestration | Disponible |
| 008-inv-market-data-and-realtime | Market Data and Realtime | Disponible |
| 010-inv-broker-integration-ibkr-alpaca | Broker Integration IBKR/Alpaca | Disponible |
| 011-inv-portfolio-and-performance-analytics | Portfolio and Performance Analytics | Disponible |

**Gaps detectados**: Ninguno. Todos los required skills para `speckit.plan` estan disponibles en el proyecto.

---

## 13. Reporte de Cobertura Canonica (obligatorio)

### Fuente: `teams/TEAM-09/plan.md`

| Seccion Canonica | Estado | Detalle |
|------------------|--------|---------|
| Autoridad (1-5) | **preserved** | Seccion 1 reproduce literal con adicion de spec.md como item 6 |
| Objetivo | **preserved** | Seccion 2 reproduce literal + ampliacion Speckit |
| Fase T09-1: Modelado temporal | **expanded** | Mapeado a modulos termStrategyContract, calendarSpreadEngine, diagonalSpreadEngine |
| Fase T09-2: Calculo y escenarios | **expanded** | Mapeado a termSimulationEngine, termRiskEngine, termRollOrchestrator |
| Fase T09-3: Chat IA y API | **expanded** | Mapeado a APIs, termComparator, termChatAssistant, termReportEngine |
| Fase T09-4: Validacion | **expanded** | Mapeado a tests T196-T198 y estandarizacion T177 |
| Riesgos (2 items canon) | **expanded** | Preservados y expandidos a 6 riesgos con mitigaciones por fase |
| Criterios de Validacion (3 items canon) | **expanded** | Preservados y expandidos con criterios por modulo y tests |
| Integracion con Speckit | **preserved** | Seccion 11 reproduce literal |

### Fuente: `specs/010-team-09-calendar-diagonal/spec.md`

| Seccion Spec Speckit | Estado | Detalle |
|----------------------|--------|---------|
| 8 modulos arquitectonicos | **merged** | Integrados como plan de implementacion por modulo (seccion 5) |
| Diagrama de contexto | **preserved** | Reflejado en grafo de dependencias (seccion 6) |
| Tareas canonicas T162-T169, T177, T196-T198 | **preserved** | Mapeadas a modulos y plan de tests (secciones 4, 5, 5.10) |
| Restricciones tecnicas | **preserved** | Reflejadas en criterios de aceptacion y contratos |
| Supuestos | **preserved** | Reflejados en contratos de integracion |
| Criterios de exito | **preserved** | Reflejados en criterios de validacion |
| Trazabilidad | **preserved** | Reflejada en autoridad y seccion 12 |
| Riesgos R-01 a R-04 | **merged** | Integrados en matriz de riesgos (seccion 7) |
| Contratos de integracion | **preserved** | Reflejados en seccion 9 |
| Gaps G-T09-01 a G-T09-03 | **preserved** | Reflejados en seccion 10 con responsables |

### Resumen de cobertura:

| Categoria | Conteo |
|-----------|--------|
| **preserved** | 12 |
| **expanded** | 6 |
| **merged** | 2 |
| **dropped** | 0 |

**Resultado: SIN GAPS. Todo el contenido canonico de `teams/TEAM-09/plan.md` y `specs/010-team-09-calendar-diagonal/spec.md` esta preservado, expandido o mergeado. No hay omisiones no justificadas.**

---

## 14. Ready / Next Steps

- [x] Plan operativo generado con trazabilidad 1:1 al canon Diana
- [x] Modulos mapeados a fases canonicas y tareas
- [x] Grafo de dependencias definido
- [x] Riesgos preservados y expandidos
- [x] Cobertura canonica validada (preserved: 12, expanded: 6, merged: 2, dropped: 0)
- [ ] Pendiente: `/diana.integrate action="run" engine="speckit" run_only="tasks"` para generar backlog operativo detallado
- [ ] Pendiente: Resolver G-T09-01, G-T09-02, G-T09-03 antes de implementacion

---

*Este documento fue generado por `speckit.plan` a partir del canon Diana `teams/TEAM-09/plan.md` y el spec Speckit vigente `specs/010-team-09-calendar-diagonal/spec.md`. Cumple con la regla de no-omision: todo el contenido canonico de entrada esta preservado, expandido o mergeado.*
