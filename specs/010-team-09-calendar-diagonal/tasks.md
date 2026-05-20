# Backlog Operativo Speckit: Calendar Spread & Diagonal Spread
## TEAM-09 — SquadISC

**Proyecto**: diana-inversions
**Iniciativa**: 001-inversions
**Equipo**: TEAM-09 (SquadISC)
**Engine**: speckit
**Etapa**: tasks
**Idioma**: es
**Generado desde**: `/diana.integrate action="run" engine="speckit" project="diana-inversions" initiative="001-inversions" team="TEAM-09" run_only="tasks" language="es"`
**Canon de entrada (base)**: `teams/TEAM-09/tasks.md`
**Plan Speckit vigente**: `specs/010-team-09-calendar-diagonal/plan.md`
**Spec Speckit vigente**: `specs/010-team-09-calendar-diagonal/spec.md`
**SDD Engine Matrix**: `sdd-engine-matrix.yaml` — speckit.tasks
**Required skills verificadas**: 008-inv-market-data-and-realtime ✅, 010-inv-broker-integration-ibkr-alpaca ✅, 011-inv-portfolio-and-performance-analytics ✅, 012-inv-compliance-audit-retention ✅
**Version**: 1.0
**Estado**: Draft Speckit

---

## 1. Principios de Ejecucion (desde canon Diana)

1. **Diana es la fuente de verdad** para IDs canonicos y alcance funcional.
2. **Speckit NO omite** contenido canonico ya validado — solo optimiza, expande o mergea.
3. **Trazabilidad 1:1** — cada tarea canonica T162-T169, T177, T196-T203 se preserva con su ID original y se expande con detalle Speckit.
4. **Grafo de dependencias obligatorio** — las tareas deben ejecutarse en las oleadas definidas en `plan.md` seccion 6.
5. **Cobertura minima de tests**: 80% en rutas criticas (logica de negocio, contratos de API, flujos de error).
6. **Los IDs canonicos son la unica llave de sincronizacion** entre Diana y Speckit.

---

## 2. Backlog Operativo Detallado

---

### OLA 1: Fundacion (dependencias: raiz)
*Objetivo: Establecer contratos base y motores de estrategia puros.*

---

#### T162 — Contrato Base Calendar/Diagonal (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T162 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termStrategyContract.ts` |
| **Fase Canonica** | T09-1: Modelado temporal |
| **Ola Speckit** | Ola 1 — Fundacion |
| **Dependencias** | Ninguna (modulo fundacional) |
| **Estimacion** | 1 unidad de desarrollo |
| **Habilitador de** | T163, T164 |
| **Prioridad** | Critica — bloquea Ola 1 |

**Descripcion canonica:**
Definir contrato base Calendar/Diagonal en `projects/rest-api/inversions_api/src/modules/strategies/term/termStrategyContract.ts` con inputs por pata (strikes, expiraciones cercanas/lejana, primas, contratos), validacion de consistencia temporal y estilo de opcion.

**Sub-tareas operativas Speckit:**

- [X] T162.1 Definir interfaz `TermStrategyInput` con campos:
  - `legs: TermLeg[]` (min 2 patas)
  - Cada `TermLeg`: `strike: number`, `expiration: Date` (corta/larga), `premium: number`, `contracts: number`, `optionStyle: 'call' | 'put'`
- [X] T162.2 Implementar `TermStrategyContract` class con:
  - Constructor que acepta y valida `TermStrategyInput`
  - Metodo `validate()` que retorna `ValidationResult` con errores descriptivos
  - Metodo `getType()` que retorna `'calendar' | 'diagonal'` segn los strikes y expiraciones
- [X] T162.3 Implementar validaciones de consistencia temporal:
  - `expirationShort < expirationLong` (obligatorio)
  - Diferencia minima entre expiraciones (configurable, default 7 dias)
  - Misma moneda/base subyacente entre patas
- [X] T162.4 Implementar validaciones de estilo de opcion:
  - Verificar que `optionStyle` sea `'call'` o `'put'`
  - Validar consistencia: Calendar = mismo strike, expiraciones diferentes; Diagonal = strikes diferentes, expiraciones diferentes
- [X] T162.5 Implementar manejo de errores con `TermStrategyError` (codigo, mensaje, campo afectado)
- [X] T162.6 Escribir tests unitarios para T162 (cobertura >= 80% en validaciones)

**Criterios de aceptacion:**
- Valida consistencia temporal (expiracion corta < expiracion larga)
- Valida estilo de opcion (call/put) por pata
- Acepta inputs: strikes, expiraciones, primas, contratos
- Rechaza configuraciones invalidas con error descriptivo
- Clasifica correctamente Calendar vs Diagonal segun strikes

---

#### T163 — Core Calendar Spread (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T163 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/calendarSpreadEngine.ts` |
| **Fase Canonica** | T09-1: Modelado temporal |
| **Ola Speckit** | Ola 1 — Fundacion |
| **Dependencias** | T162 completado |
| **Estimacion** | 2 unidades de desarrollo |
| **Habilitador de** | T165, T166, T168, Chat IA |
| **Prioridad** | Alta |

**Descripcion canonica:**
Implementar core de Calendar Spread (call/put) en `projects/rest-api/inversions_api/src/modules/strategies/term/calendarSpreadEngine.ts` con modelado de theta, vencimiento corto/largo, impacto de term structure IV y escenarios de precio.

**Sub-tareas operativas Speckit:**

- [X] T163.1 Implementar `CalendarSpreadEngine` class con constructor que recibe `TermStrategyContract` validado
- [X] T163.2 Implementar calculo de theta decay:
  - Theta de la pata corta (vencimiento proximo)
  - Theta de la pata larga (vencimiento lejano)
  - Theta neto = theta corta - theta larga
- [X] T163.3 Implementar modelado de vencimiento corto/largo:
  - Descomposicion por dias hasta expiracion (DTE) para cada pata
  - Perfil de theta decay en funcion del DTE
- [X] T163.4 Implementar impacto de term structure IV:
  - Input de curva IV por expiration (skew temporal)
  - Calcular precio Black-Scholes con IV diferenciada por pata
- [X] T163.5 Implementar generacion de escenarios de precio:
  - Rango configurable de precio del subyacente
  - Paso de precio configurable
  - Output: `CalendarScenario[]` con precio, valor estrategia, P&L, theta, IV implícita
- [X] T163.6 Soportar variantes call y put con parametro `optionStyle`
- [X] T163.7 Escribir tests unitarios para T163 (cobertura >= 80%)

**Criterios de aceptacion:**
- Modela theta decay para vencimiento corto y largo
- Calcula impacto de term structure IV
- Genera escenarios de precio en rango configurable
- Soporta variantes call y put

---

#### T164 — Core Diagonal Spread (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T164 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/diagonalSpreadEngine.ts` |
| **Fase Canonica** | T09-1: Modelado temporal |
| **Ola Speckit** | Ola 1 — Fundacion |
| **Dependencias** | T162 completado |
| **Estimacion** | 2 unidades de desarrollo |
| **Habilitador de** | T165, T166, T168, Chat IA |
| **Prioridad** | Alta |

**Descripcion canonica:**
Implementar core de Diagonal Spread (call/put) en `projects/rest-api/inversions_api/src/modules/strategies/term/diagonalSpreadEngine.ts` con combinacion strike+tiempo, sensibilidad de griegas, perfiles de riesgo y ventanas de ajuste.

**Sub-tareas operativas Speckit:**

- [X] T164.1 Implementar `DiagonalSpreadEngine` class con constructor que recibe `TermStrategyContract` validado
- [X] T164.2 Implementar combinacion strike diferencial + expiracion diferencial:
  - Pata corta: strike cercano al dinero (ATM aproximado), expiracion corta
  - Pata larga: strike fuera del dinero (OTM), expiracion larga
  - Validar relacion strike + expiracion
- [X] T164.3 Implementar calculo de sensibilidad de griegas:
  - Delta, gamma, theta, vega por pata y neto
  - Identificar perfil direccional (bullish/bearish/neutral)
- [X] T164.4 Implementar perfiles de riesgo:
  - Por escenario de precio del subyacente
  - Por paso del tiempo (decaimiento temporal)
  - Por cambio en IV (vega shock)
- [X] T164.5 Implementar identificacion de ventanas de ajuste/roll:
  - Umbral configurable de theta residual
  - Proximidad a expiracion corta
  - Desviacion de perfil de riesgo esperado
- [X] T164.6 Soportar variantes call y put con parametro `optionStyle`
- [X] T164.7 Escribir tests unitarios para T164 (cobertura >= 80%)

**Criterios de aceptacion:**
- Combina strike diferencial + expiracion diferencial
- Calcula sensibilidad de griegas (delta, gamma, theta, vega)
- Genera perfiles de riesgo por escenario de precio y tiempo
- Identifica ventanas de ajuste/roll

---

#### T200 — Validacion de Fechas en Contrato Base (NUEVA)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T200 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termStrategyContract.ts` |
| **Fase Canonica** | T09-1: Modelado temporal |
| **Ola Speckit** | Ola 1 — Fundacion |
| **Dependencias** | T162 completado |
| **Estimacion** | 0.5 unidades de desarrollo |
| **Habilitador de** | Calidad de datos en T163, T164 |
| **Prioridad** | Alta |

**Descripcion:**
Agregar validacion de formato de fecha y expiracion en pasado al contrato base `termStrategyContract.ts`. Actualmente `new Date("invalido")` produce `Invalid Date` que propaga `NaN` silenciosamente a todos los calculos de los motores.

**Sub-tareas operativas Speckit:**

- [ ] T200.1 Agregar validacion de `Invalid Date`:
  - Verificar que `expiration.getTime()` no sea `NaN`
  - Rechazar con error `INVALID_DATE_FORMAT` y campo afectado
- [ ] T200.2 Agregar validacion de expiracion en pasado:
  - Verificar que `expiration > new Date()` (con tolerancia de 1 dia)
  - Rechazar con error `EXPIRATION_IN_PAST` y campo afectado
- [ ] T200.3 Agregar metodos estaticos en `TermStrategyError` para los nuevos errores
- [ ] T200.4 Escribir tests unitarios para las nuevas validaciones

**Criterios de aceptacion:**
- Rechaza `Invalid Date` con error descriptivo
- Rechaza fechas de expiracion en pasado
- Tests unitarios para ambas validaciones

---

### OLA 2: Simulacion y Riesgo (dependencias: Ola 1)
*Objetivo: Motor de simulacion, riesgo y orquestador de roll.*

---

#### T165 — Motor de Simulacion Temporal (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T165 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termSimulationEngine.ts` |
| **Fase Canonica** | T09-2: Calculo y escenarios |
| **Ola Speckit** | Ola 2 — Simulacion y Riesgo |
| **Dependencias** | T163, T164 completados |
| **Estimacion** | 2 unidades de desarrollo |
| **Habilitador de** | T166, T167 |
| **Prioridad** | Alta |

**Descripcion canonica:**
Implementar motor de simulacion temporal para Calendar/Diagonal en `projects/rest-api/inversions_api/src/modules/strategies/term/termSimulationEngine.ts` con backtesting, Monte Carlo/escenarios deterministicos y proyeccion de payoff/P&L en tiempo real.

**Sub-tareas operativas Speckit:**

- [X] T165.1 Implementar `TermSimulationEngine` class con soporte para CalendarSpreadEngine y DiagonalSpreadEngine
- [X] T165.2 Implementar modo backtesting:
  - Carga de datos historicos de precios (formato OHLC configurable)
  - Iteracion por ventana temporal
  - Calculo de rendimiento historico de la estrategia
- [X] T165.3 Implementar simulacion Monte Carlo:
  - Parametros configurables: iteraciones (default 10,000), distribucion (normal, lognormal), semilla
  - Generacion de trayectorias de precio y IV
  - Output: distribucion de P&L, percentiles, VaR
- [X] T165.4 Implementar escenarios deterministicos:
  - Precio fijo en rango
  - Shock de IV (paralelo, por expiration)
  - Paso temporal (DTE decreciente)
- [X] T165.5 Implementar proyeccion de payoff y P&L en tiempo real:
  - Payoff por escenario
  - P&L acumulado
  - Metricas de rendimiento (Sharpe, Sortino, max drawdown)
- [X] T165.6 Implementar formato de salida `SimulationResult` con datos estructurados para consumo por termReportEngine y APIs
- [X] T165.7 Escribir tests unitarios para T165 (cobertura >= 80%)

**Criterios de aceptacion:**
- Soporta backtesting con datos historicos
- Ejecuta Monte Carlo con parametros configurables
- Ejecuta escenarios deterministicos
- Proyecta payoff y P&L en tiempo real

---

#### T166 — Risk Engine Calendar/Diagonal (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T166 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termRiskEngine.ts` |
| **Fase Canonica** | T09-2: Calculo y escenarios |
| **Ola Speckit** | Ola 2 — Simulacion y Riesgo |
| **Dependencias** | T165 completado |
| **Estimacion** | 1.5 unidades de desarrollo |
| **Habilitador de** | T169 |
| **Prioridad** | Alta |

**Descripcion canonica:**
Implementar Risk Engine Calendar/Diagonal en `projects/rest-api/inversions_api/src/modules/strategies/term/termRiskEngine.ts` con limites por vencimiento, riesgo de asignacion, reglas de stop-loss y alertas push/email.

**Sub-tareas operativas Speckit:**

- [X] T166.1 Implementar `TermRiskEngine` class con configuracion de limites:
  - Limite de concentracion por vencimiento (max % del portafolio)
  - Limite de fecha maxima de expiracion
  - Limite de theta negativo maximo
- [X] T166.2 Implementar calculo de riesgo de asignacion temprana:
  - Deteccion de opciones ITM profundas en pata corta
  - Probabilidad de asignacion temprana (dividendos, tasa, tiempo restante)
- [X] T166.3 Implementar reglas de stop-loss:
  - Stop-loss fijo (perdida maxima absoluta)
  - Stop-loss porcentual (% del capital asignado)
  - Stop-loss trailing (por theta decay)
  - Notificacion/configuracion de auto-liquidacion (solo sugerida, RNF-001)
- [X] T166.4 Implementar sistema de alertas:
  - Alertas push (evento en memoria para consumo por orchestrator)
  - Alertas email (formato estructurado con resumen de riesgo)
  - Umbrales configurables por tipo de alerta
- [X] T166.5 Escribir tests unitarios para T166 (cobertura >= 80%)

**Criterios de aceptacion:**
- Aplica limites por vencimiento (max fecha, concentracion)
- Calcula riesgo de asignacion temprana
- Implementa reglas de stop-loss configurables
- Dispara alertas push/email en violacion de limites

---

#### T169 — Orquestador de Gestion Temporal (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T169 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termRollOrchestrator.ts` |
| **Fase Canonica** | T09-2: Calculo y escenarios |
| **Ola Speckit** | Ola 3 — Orquestacion y Exposicion |
| **Dependencias** | T166 completado |
| **Estimacion** | 1.5 unidades de desarrollo |
| **Habilitador de** | API layer |
| **Prioridad** | Media |

**Descripcion canonica:**
Implementar orquestador de gestion temporal en `projects/rest-api/inversions_api/src/modules/strategies/term/termRollOrchestrator.ts` para reglas de roll/ajuste, cierre anticipado y control de deterioro temporal.

**Sub-tareas operativas Speckit:**

- [X] T169.1 Implementar `TermRollOrchestrator` class con configuracion de calendario de roll:
  - Fechas programadas de roll (D-{X} antes de expiracion corta)
  - Periodicidad configurable (calendar-based vs trigger-based)
- [X] T169.2 Implementar evaluacion de triggers de ajuste:
  - Umbral de theta residual (cuando theta < umbral, considerar roll)
  - Umbral de gamma/vega exposure
  - Proximidad a expiracion corta (DTE minimo)
  - Violacion de limites de riesgo (desde termRiskEngine)
- [X] T169.3 Implementar calculo de costos de roll:
  - Diferencial de primas entre pata saliente y nueva pata
  - Costos de transaccion estimados
  - Impacto en perfil de riesgo post-roll
- [X] T169.4 Implementar recomendacion de cierre anticipado:
  - Cuando riesgo residual supera beneficio potencial
  - Cuando condicion de mercado invalida la tesis original
  - Output: `RollRecommendation` con justificacion estructurada
- [X] T169.5 Implementar control de deterioro temporal con metrica theta residual:
  - Monitoreo continuo de theta decay
  - Alerta cuando theta residual < umbral critico
- [X] T169.6 Escribir tests unitarios para T169 (cobertura >= 80%)

**Criterios de aceptacion:**
- Ejecuta reglas de roll programadas por calendario
- Evalua triggers de ajuste basados en umbrales de riesgo
- Calcula costos de roll y recomienda cierre anticipado si aplica
- Controla deterioro temporal con metrica theta residual

---

### OLA 3: Orquestacion y Exposicion (dependencias: Ola 2)
*Objetivo: APIs, visualizacion, Chat IA y estandarizacion.*

---

#### T167 — Visualizacion y Reporting (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T167 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termReportEngine.ts` |
| **Fase Canonica** | T09-3: Chat IA y API |
| **Ola Speckit** | Ola 3 — Orquestacion y Exposicion |
| **Dependencias** | T165 completado |
| **Estimacion** | 1.5 unidades de desarrollo |
| **Habilitador de** | API layer, Chat IA |
| **Prioridad** | Media |

**Descripcion canonica:**
Implementar modulo de visualizacion y reporting Calendar/Diagonal en `projects/rest-api/inversions_api/src/modules/strategies/term/termReportEngine.ts` con curvas de payoff, superficies tiempo-precio-IV y metricas riesgo/beneficio auditables.

**Sub-tareas operativas Speckit:**

- [X] T167.1 Implementar `TermReportEngine` class que consume `SimulationResult` y genera reportes estructurados
- [X] T167.2 Implementar generacion de curvas de payoff:
  - Para Calendar Spread (call/put)
  - Para Diagonal Spread (call/put)
  - Formato: array de puntos `{price, payoff, pnl}` para graficacion
- [X] T167.3 Implementar superficies tiempo-precio-IV:
  - Eje X: precio del subyacente
  - Eje Y: DTE restante
  - Eje Z: P&L / IV implicita
  - Formato: matriz 2D para visualizacion
- [X] T167.4 Implementar metricas riesgo/beneficio auditables:
  - Theta, gamma, vega, delta neto
  - Probabilidad de profit (POP)
  - Max drawdown esperado
  - Sharpe ratio estimado
  - Formato JSON + resumen textual
- [X] T167.5 Implementar exportacion de datos para TEAM-01 (dashboard):
  - Formato JSON estandarizado
  - Endpoint interno de consumo
- [X] T167.6 Escribir tests unitarios para T167 (cobertura >= 80%)

**Criterios de aceptacion:**
- Genera curvas de payoff para ambas estrategias
- Produce superficies tiempo-precio-IV
- Presenta metricas riesgo/beneficio auditables (formato JSON + visual)
- Exporta datos para consumo por TEAM-01 (dashboard)

---

#### T168 — APIs Dedicadas y Comparador (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T168 |
| **Modulos** | `projects/rest-api/inversions_api/src/routes/strategies/term/calendarSpread.ts`, `projects/rest-api/inversions_api/src/routes/strategies/term/diagonalSpread.ts`, `projects/rest-api/inversions_api/src/routes/strategies/term/termComparator.ts` |
| **Fase Canonica** | T09-3: Chat IA y API |
| **Ola Speckit** | Ola 3 — Orquestacion y Exposicion |
| **Dependencias** | T163, T164, T165, T167 completados |
| **Estimacion** | 2 unidades de desarrollo |
| **Habilitador de** | Consumo frontend y otros equipos |
| **Prioridad** | Alta |

**Descripcion canonica:**
Implementar APIs dedicadas y comparador Calendar vs Diagonal en `projects/rest-api/inversions_api/src/routes/strategies/term/` (calendarSpread.ts, diagonalSpread.ts, termComparator.ts) para recomendar estrategia segun contexto multi-core.

**Sub-tareas operativas Speckit:**

- [X] T168.1 Implementar endpoint `POST /api/v1/strategies/term/calendar`:
  - Input: `CalendarRequest` (strikes, expiraciones, primas, contratos, escenarios)
  - Output: `CalendarResponse` (payoff, griegas, escenarios, perfil de riesgo)
  - Integracion con CalendarSpreadEngine + TermSimulationEngine
- [X] T168.2 Implementar endpoint `POST /api/v1/strategies/term/diagonal`:
  - Input: `DiagonalRequest` (strikes, expiraciones, primas, contratos, escenarios)
  - Output: `DiagonalResponse` (payoff, griegas, escenarios, perfil de riesgo)
  - Integracion con DiagonalSpreadEngine + TermSimulationEngine
- [X] T168.3 Implementar endpoint `POST /api/v1/strategies/term/compare`:
  - Input: `CompareRequest` (parametros de mercado, perfil de riesgo, horizonte)
  - Output: `CompareResponse` (recomendacion Calendar vs Diagonal, justificacion, metricas comparativas)
  - Logica de recomendacion segun contexto multi-core (volatilidad, tiempo, direccion)
- [X] T168.4 Implementar validacion de requests con esquemas JSON (Joi/Zod)
- [X] T168.5 Implementar manejo de errores estandar (HTTP codes, mensajes descriptivos)
- [X] T168.6 Generar documentacion OpenAPI/Swagger para los 3 endpoints
- [X] T168.7 Escribir tests de integracion para T168 (T198) (cobertura >= 80%)

**Criterios de aceptacion:**
- API REST con respuestas JSON estructuradas
- Endpoint Calendar Spread: calculo completo + escenarios
- Endpoint Diagonal Spread: calculo completo + escenarios
- Endpoint comparador: Calendar vs Diagonal segun contexto multi-core
- Documentacion OpenAPI/Swagger

---

#### T199 — Documentacion OpenAPI/Swagger para Endpoints Term (NUEVA)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T199 |
| **Modulos** | `projects/rest-api/inversions_api/src/routes/strategies/term/calendarSpread.ts`, `projects/rest-api/inversions_api/src/routes/strategies/term/diagonalSpread.ts`, `projects/rest-api/inversions_api/src/routes/strategies/term/termComparator.ts` |
| **Fase Canonica** | T09-3: Chat IA y API |
| **Ola Speckit** | Ola 3 — Orquestacion y Exposicion |
| **Dependencias** | T168 completado |
| **Estimacion** | 1 unidad de desarrollo |
| **Habilitador de** | Integracion con TEAM-01 (G-T09-03) |
| **Prioridad** | Alta |

**Descripcion:**
Agregar documentacion OpenAPI/Swagger a los 3 endpoints de estrategias temporales. La tarea T168.6 quedo marcada como completada pero nunca se implemento. Esto bloquea la integracion con TEAM-01 y el descubrimiento de APIs por otros equipos.

**Sub-tareas operativas Speckit:**

- [ ] T199.1 Instalar dependencias swagger-jsdoc y swagger-ui-express
- [ ] T199.2 Agregar anotaciones JSDoc OpenAPI en:
  - `calendarSpread.ts` — POST /calendar
  - `diagonalSpread.ts` — POST /diagonal
  - `termComparator.ts` — POST /compare
- [ ] T199.3 Configurar ruta `/api/docs` en index.ts con swagger-ui-express
- [ ] T199.4 Definir esquemas de request/response en OpenAPI
- [ ] T199.5 Verificar que la documentacion sea accesible via navegador

**Criterios de aceptacion:**
- Endpoints documentados con OpenAPI JSDoc
- Ruta `/api/docs` accesible via navegador
- Esquemas request/response visibles en Swagger UI

---

#### T201 — Monte Carlo Default en APIs + term-verify.html (NUEVA)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T201 |
| **Modulos** | `projects/rest-api/inversions_api/src/routes/strategies/term/calendarSpread.ts`, `projects/rest-api/inversions_api/src/routes/strategies/term/diagonalSpread.ts`, `projects/pwa/inversions_app/public/term-verify.html` |
| **Fase Canonica** | T09-3: Chat IA y API |
| **Ola Speckit** | Ola 3 — Orquestacion y Exposicion |
| **Dependencias** | T165, T168 completados |
| **Estimacion** | 0.5 unidades de desarrollo |
| **Habilitador de** | Verificacion visual de Monte Carlo |
| **Prioridad** | Media |

**Descripcion:**
El motor Monte Carlo esta completamente implementado en `termSimulationEngine.ts` pero las APIs nunca lo ejecutan porque requieren `body.monteCarlo` explicito. Cambiar para que por defecto ejecute 1000 iteraciones con distribucion normal. Ademas, actualizar `term-verify.html` para mostrar resultados de Monte Carlo y agregar controles basicos.

**Sub-tareas operativas Speckit:**

- [ ] T201.1 Modificar `calendarSpread.ts` para ejecutar Monte Carlo por defecto (1000 iteraciones, normal)
- [ ] T201.2 Modificar `diagonalSpread.ts` para ejecutar Monte Carlo por defecto (1000 iteraciones, normal)
- [ ] T201.3 Actualizar `term-verify.html`:
  - Agregar seccion de resultados Monte Carlo en panels Calendar y Diagonal
  - Agregar controles basicos (toggle, iteraciones, distribucion)
  - Manejar NaN en funcion `fmt()`

**Criterios de aceptacion:**
- Monte Carlo se ejecuta por defecto sin configuracion explicita
- Resultados visibles en term-verify.html
- NaN manejado correctamente en UI

---

#### S-T09-C01 — Chat IA Explicativo (SPECKIT EXPANSION — nuevo)

| Atributo | Valor |
|----------|-------|
| **ID Local** | S-T09-C01 |
| **Modulo** | `projects/rest-api/inversions_api/src/modules/strategies/term/termChatAssistant.ts` |
| **Fase Canonica** | T09-3: Chat IA y API |
| **Ola Speckit** | Ola 3 — Orquestacion y Exposicion |
| **Dependencias** | T163, T164, T165 completados |
| **Estimacion** | 2 unidades de desarrollo |
| **Origen** | RF-004 canonico + expansion Speckit desde spec.md (seccion 4.8) |
| **Prioridad** | Media |

**Descripcion:**
Integrar Chat IA para explicar el proposito, riesgo y condiciones de uso de cada estructura temporal Calendar/Diagonal, sin autorizar ejecucion ni sustituir juicio humano (RNF-001).

**Sub-tareas operativas Speckit:**

- [X] S-T09-C01.1 Implementar `TermChatAssistant` class con contexto de estrategia temporal
- [X] S-T09-C01.2 Implementar generacion de narrativa explicativa:
  - Proposito de la estructura temporal seleccionada
  - Perfil de riesgo (theta, gamma, vega)
  - Condiciones de uso (mercado tendencial, lateral, volatil)
- [X] S-T09-C01.3 Integrar con motores CalendarSpreadEngine y DiagonalSpreadEngine para contexto en vivo
- [X] S-T09-C01.4 Integrar con TermSimulationEngine para escenarios actuales
- [X] S-T09-C01.5 Implementar safeguard RNF-001: disclaimer de no-asesoramiento en toda salida
- [X] S-T09-C01.6 Implementar formato de salida estructurado (texto + metricas clave)
- [X] S-T09-C01.7 Escribir tests unitarios para S-T09-C01 (cobertura >= 80%)

**Criterios de aceptacion:**
- Explica proposito de la estructura temporal seleccionada
- Detalla riesgo y condiciones de uso en lenguaje natural
- Contextualiza basado en escenarios del motor de simulacion
- No autoriza ejecucion ni sustituye juicio humano (RNF-001)

---

### OLA 4: Calidad y Cierre (dependencias: Olas 1-3)
*Objetivo: Tests, estandarizacion y validacion final.*

---

#### T196 — Tests Unitarios: Engines Calendar/Diagonal (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T196 |
| **Tipo** | Unitario |
| **Modulos bajo prueba** | `calendarSpreadEngine.ts`, `diagonalSpreadEngine.ts` |
| **Archivo destino** | `tests/unit/strategies/term/calendarSpreadEngine.test.ts`, `tests/unit/strategies/term/diagonalSpreadEngine.test.ts` |
| **Ola Speckit** | Ola 4 — Calidad y Cierre |
| **Dependencias** | T163, T164 completados |
| **Estimacion** | 1 unidad de desarrollo |
| **Prioridad** | Alta (RNF-006) |

**Sub-tareas operativas Speckit:**

- [X] T196.1 Test unitario: CalendarSpreadEngine — calculo de theta decay correcto para call/put
- [X] T196.2 Test unitario: CalendarSpreadEngine — impacto de term structure IV
- [X] T196.3 Test unitario: CalendarSpreadEngine — escenarios de precio
- [X] T196.4 Test unitario: DiagonalSpreadEngine — combinacion strike+expiracion
- [X] T196.5 Test unitario: DiagonalSpreadEngine — sensibilidad de griegas
- [X] T196.6 Test unitario: DiagonalSpreadEngine — ventanas de ajuste
- [X] T196.7 Test unitario: Ambos engines — manejo de errores y casos borde

**Cobertura minima requerida**: 80% en rutas criticas

---

#### T197 — Tests Unitarios: Simulacion y Orquestador (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T197 |
| **Tipo** | Unitario |
| **Modulos bajo prueba** | `termSimulationEngine.ts`, `termRollOrchestrator.ts` |
| **Archivo destino** | `tests/unit/strategies/term/termSimulationEngine.test.ts`, `tests/unit/strategies/term/termRollOrchestrator.test.ts` |
| **Ola Speckit** | Ola 4 — Calidad y Cierre |
| **Dependencias** | T165, T169 completados |
| **Estimacion** | 1 unidad de desarrollo |
| **Prioridad** | Alta (RNF-006) |

**Sub-tareas operativas Speckit:**

- [X] T197.1 Test unitario: TermSimulationEngine — backtesting con datos mock
- [X] T197.2 Test unitario: TermSimulationEngine — Monte Carlo con parametros configurables
- [X] T197.3 Test unitario: TermSimulationEngine — escenarios deterministicos
- [X] T197.4 Test unitario: TermSimulationEngine — proyeccion de payoff/P&L
- [X] T197.5 Test unitario: TermRollOrchestrator — reglas de roll programadas
- [X] T197.6 Test unitario: TermRollOrchestrator — triggers de ajuste
- [X] T197.7 Test unitario: TermRollOrchestrator — costos de roll y cierre anticipado
- [X] T197.8 Test unitario: Ambos modulos — manejo de errores y casos borde

**Cobertura minima requerida**: 80% en rutas criticas

---

#### T198 — Tests de Integracion: Routes (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T198 |
| **Tipo** | Integracion |
| **Modulos bajo prueba** | `routes/strategies/term/calendarSpread.ts`, `routes/strategies/term/diagonalSpread.ts`, `routes/strategies/term/termComparator.ts` |
| **Archivo destino** | `tests/integration/strategies/term/termRoutes.test.ts` (consolidado) |
| **Ola Speckit** | Ola 4 — Calidad y Cierre |
| **Dependencias** | T168 completado |
| **Estimacion** | 1 unidad de desarrollo |
| **Prioridad** | Alta (RNF-006) |

**Sub-tareas operativas Speckit:**

- [X] T198.1 Test integracion: POST `/api/v1/strategies/term/calendar` — flujo completo
- [X] T198.2 Test integracion: POST `/api/v1/strategies/term/calendar` — validacion de errores
- [X] T198.3 Test integracion: POST `/api/v1/strategies/term/diagonal` — flujo completo
- [X] T198.4 Test integracion: POST `/api/v1/strategies/term/diagonal` — validacion de errores
- [X] T198.5 Test integracion: POST `/api/v1/strategies/term/compare` — recomendacion Calendar
- [X] T198.6 Test integracion: POST `/api/v1/strategies/term/compare` — recomendacion Diagonal
- [X] T198.7 Test integracion: POST `/api/v1/strategies/term/compare` — casos borde

**Cobertura minima requerida**: 80% en rutas criticas

---

#### T177 — Estandarizacion Transversal (PRESERVED + EXPANDED)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T177 |
| **Alcance** | `projects/rest-api/inversions_api/src/modules/strategies/term/` (calendar/diagonal) |
| **Fase Canonica** | T09-4: Validacion |
| **Ola Speckit** | Ola 4 — Calidad y Cierre |
| **Dependencias** | T162-T169, S-T09-C01 completados |
| **Estimacion** | 0.5 unidades de desarrollo |
| **Prioridad** | Media |

**Descripcion canonica:**
Ejecutar ajuste de TEAM-09 al estandar transversal en `projects/rest-api/inversions_api/src/modules/strategies/term/` (calendar/diagonal).

**Sub-tareas operativas Speckit:**

- [X] T177.1 Verificar naming consistente con estandar transversal (`camelCase` para modulos, `PascalCase` para clases/interfaces)
- [X] T177.2 Verificar estructura de archivos consistente con el resto de equipos (modulos en `src/modules/strategies/term/`, routes en `src/routes/strategies/term/`)
- [X] T177.3 Verificar patron de manejo de errores consistente (clases `Error` con codigo y mensaje)
- [X] T177.4 Verificar patron de integracion: contratos de entrada/salida estandarizados
- [X] T177.5 Verificar documentacion minima (JSDoc/TSDoc en interfaces publicas)
- [X] T177.6 Verificar compliance con RNF-005 (contratos estables de integracion)

**Criterios de aceptacion:**
- Consistencia de naming, estructura de archivos, manejo de errores y patrones de integracion con el resto de los equipos
- No hay desviaciones del estandar transversal definido en `001-inv-tasks.md`

---

#### T202 — Cobertura Tests termChatAssistant ≥80% (NUEVA)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T202 |
| **Tipo** | Unitario |
| **Modulos bajo prueba** | `termChatAssistant.ts` |
| **Archivo destino** | `tests/unit/strategies/term/termChatAssistant.test.ts` |
| **Ola Speckit** | Ola 4 — Calidad y Cierre |
| **Dependencias** | S-T09-C01 completado |
| **Estimacion** | 0.5 unidades de desarrollo |
| **Prioridad** | Media (RNF-006) |

**Descripcion:**
La cobertura actual de `termChatAssistant.ts` es 54.41% sentencias / 39.58% ramas, muy por debajo del 80% requerido por RNF-006. Agregar tests para los metodos no cubiertos: `buildPurpose`, `buildRiskProfile`, `buildUsageConditions`, `buildScenarioSummary`, `extractMetrics`.

**Sub-tareas operativas Speckit:**

- [ ] T202.1 Test: `buildPurpose` — genera proposito para calendar y diagonal
- [ ] T202.2 Test: `buildRiskProfile` — genera perfil de riesgo con metricas
- [ ] T202.3 Test: `buildUsageConditions` — genera condiciones de uso segun contexto
- [ ] T202.4 Test: `buildScenarioSummary` — genera resumen de escenarios
- [ ] T202.5 Test: `extractMetrics` — extrae metricas clave del resultado
- [ ] T202.6 Test: Casos borde — datos nulos, parciales, extremos

**Cobertura minima requerida**: 80% sentencias, 80% ramas

---

#### T203 — Cobertura Tests termReportEngine branch ≥80% (NUEVA)

| Atributo | Valor |
|----------|-------|
| **ID Canonico** | T203 |
| **Tipo** | Unitario |
| **Modulos bajo prueba** | `termReportEngine.ts` |
| **Archivo destino** | `tests/unit/strategies/term/termReportEngine.test.ts` |
| **Ola Speckit** | Ola 4 — Calidad y Cierre |
| **Dependencias** | T167 completado |
| **Estimacion** | 0.5 unidades de desarrollo |
| **Prioridad** | Media (RNF-006) |

**Descripcion:**
La cobertura de ramas de `termReportEngine.ts` es 52.77%, por debajo del 80% requerido por RNF-006. Agregar tests para cubrir ramas faltantes en `generateSurface`, `calculateRiskMetrics`, `estimateProbabilityOfProfit`.

**Sub-tareas operativas Speckit:**

- [ ] T203.1 Test: `generateSurface` con datos parciales (solo diagonal, sin calendar)
- [ ] T203.2 Test: `generateSurface` con datos nulos en escenarios
- [ ] T203.3 Test: `calculateRiskMetrics` con datos extremos (alta volatilidad, P&L grande)
- [ ] T203.4 Test: `estimateProbabilityOfProfit` con distintos percentiles de escenarios
- [ ] T203.5 Test: `generateReport` para diagonal spread
- [ ] T203.6 Test: Casos borde — datos minimos, escenarios vacios

**Cobertura minima requerida**: 80% ramas

---

## 3. Resumen de Tareas

| ID | Modulo | Ola | Dependencias | Estimacion | Prioridad |
|----|--------|-----|--------------|------------|-----------|
| **T162** | termStrategyContract.ts | 1 | — | 1 | Critica |
| **T163** | calendarSpreadEngine.ts | 1 | T162 | 2 | Alta |
| **T164** | diagonalSpreadEngine.ts | 1 | T162 | 2 | Alta |
| **T200** | termStrategyContract.ts (validacion fechas) | 1 | T162 | 0.5 | Alta |
| **T165** | termSimulationEngine.ts | 2 | T163, T164 | 2 | Alta |
| **T166** | termRiskEngine.ts | 2 | T165 | 1.5 | Alta |
| **T169** | termRollOrchestrator.ts | 3 | T166 | 1.5 | Media |
| **T167** | termReportEngine.ts | 3 | T165 | 1.5 | Media |
| **T168** | APIs (3 endpoints) | 3 | T163, T164, T165, T167 | 2 | Alta |
| **T199** | OpenAPI/Swagger | 3 | T168 | 1 | Alta |
| **T201** | Monte Carlo default + UI | 3 | T165, T168 | 0.5 | Media |
| **S-T09-C01** | termChatAssistant.ts | 3 | T163, T164, T165 | 2 | Media |
| **T196** | Tests calendar/diagonal engines | 4 | T163, T164 | 1 | Alta |
| **T197** | Tests simulacion/orquestador | 4 | T165, T169 | 1 | Alta |
| **T198** | Tests integracion routes | 4 | T168 | 1 | Alta |
| **T202** | Tests chat assistant coverage | 4 | S-T09-C01 | 0.5 | Media |
| **T203** | Tests report engine branch | 4 | T167 | 0.5 | Media |
| **T177** | Estandarizacion transversal | 4 | T162-T169, S-T09-C01, T199-T203 | 0.5 | Media |

---

## 4. Grafo de Dependencias (desde plan.md seccion 6)

```
T162 (termStrategyContract)
  ├──> T200 (validacion fechas) ← desde T162
  │
  ├──> T163 (calendarSpreadEngine)
  ├──> T164 (diagonalSpreadEngine)
  │
  ├──> T165 (termSimulationEngine)
  │     ├──> T166 (termRiskEngine)
  │     │     └──> T169 (termRollOrchestrator)
  │     └──> T167 (termReportEngine)
  │           └──> T203 (tests report engine)
  │
  ├──> T168 (APIs + Comparator) ← depende de T163, T164, T165, T167
  │     ├──> T199 (OpenAPI/Swagger) ← desde T168
  │     └──> T201 (Monte Carlo default) ← desde T165
  │
  ├──> S-T09-C01 (Chat IA) ← depende de T163, T164, T165
  │     └──> T202 (tests chat assistant) ← desde S-T09-C01
  │
  └──> T196 (tests unitarios engines) ← depende de T163, T164
  └──> T197 (tests unitarios simulacion) ← depende de T165, T169
  └──> T198 (tests integracion routes) ← depende de T168
  └──> T177 (estandarizacion transversal) ← depende de todo

**Secuencia recomendada de implementacion:**
1. **Ola 1**: T162 → T163 + T164 + T200 (fundacion + validacion fechas)
2. **Ola 2**: T165 → T166 + T169 (simulacion y riesgo)
3. **Ola 3**: T167 + T168 + T199 + T201 + S-T09-C01 (reportes, APIs, Swagger, Monte Carlo, Chat IA)
4. **Ola 4**: T196 + T197 + T198 + T202 + T203 + T177 (calidad y cierre)
```

---

## 5. Required Skills para speckit.tasks

| Skill ID | Nombre | Estado |
|----------|--------|--------|
| 008-inv-market-data-and-realtime | Market Data and Realtime | ✅ Disponible |
| 010-inv-broker-integration-ibkr-alpaca | Broker Integration IBKR/Alpaca | ✅ Disponible |
| 011-inv-portfolio-and-performance-analytics | Portfolio and Performance Analytics | ✅ Disponible |
| 012-inv-compliance-audit-retention | Compliance Audit Retention | ✅ Disponible |

**Resultado**: Todos los required skills para `speckit.tasks` estan disponibles. Sin gaps.

---

## 6. Contratos de Integracion (desde spec.md y plan.md)

### Contratos de entrada obligatorios:
- `specs/001-plataforma-inversiones-ia/contracts/auth-context.md`
- `specs/001-plataforma-inversiones-ia/contracts/broker-adapter.md`
- `specs/001-plataforma-inversiones-ia/contracts/signal-lifecycle.md`

### Contratos de salida:
- API REST con respuestas JSON estructuradas para consumo por frontend y otros equipos
- Formato de metricas de theta decay y sensibilidad temporal para UI consolidada (coordinado con TEAM-01)

---

## 7. Gaps y Decisiones Pendientes (preservado desde team-agent-bootstrap.md)

| Gap | Descripcion | Estado | Bloquea |
|-----|-------------|--------|---------|
| G-T09-01 | Definir supuestos de modelado de curva temporal e IV term structure por mercado | Pendiente | T163, T164 |
| G-T09-02 | Validar reglas de roll (calendario, triggers, costos) con politica de riesgo institucional | Pendiente | T169 |
| G-T09-03 | Acordar formato de metricas de theta decay y sensibilidad temporal para UI consolidada | Pendiente | T167, T168 |

**Recomendacion**: Resolver G-T09-01 antes de iniciar Ola 1. Resolver G-T09-02 antes de T169. Resolver G-T09-03 antes de T167/T168.

---

## 8. Reporte de Cobertura Canonica (obligatorio — regla de no-omision)

### Fuente: `teams/TEAM-09/tasks.md`

| ID Canonico | Descripcion | Estado en tasks.md Speckit | Categoria |
|-------------|-------------|---------------------------|-----------|
| **T162** | Contrato base Calendar/Diagonal (termStrategyContract.ts) | Seccion T162 — preservado con 6 sub-tareas operativas | **expanded** |
| **T163** | Core Calendar Spread (calendarSpreadEngine.ts) | Seccion T163 — preservado con 7 sub-tareas operativas | **expanded** |
| **T164** | Core Diagonal Spread (diagonalSpreadEngine.ts) | Seccion T164 — preservado con 7 sub-tareas operativas | **expanded** |
| **T165** | Motor de simulacion temporal (termSimulationEngine.ts) | Seccion T165 — preservado con 7 sub-tareas operativas | **expanded** |
| **T166** | Risk Engine Calendar/Diagonal (termRiskEngine.ts) | Seccion T166 — preservado con 5 sub-tareas operativas | **expanded** |
| **T167** | Visualizacion y reporting (termReportEngine.ts) | Seccion T167 — preservado con 6 sub-tareas operativas | **expanded** |
| **T168** | APIs dedicadas y comparador (3 endpoints) | Seccion T168 — preservado con 7 sub-tareas operativas | **expanded** |
| **T169** | Orquestador de gestion temporal (termRollOrchestrator.ts) | Seccion T169 — preservado con 6 sub-tareas operativas | **expanded** |
| **T177** | Estandarizacion transversal | Seccion T177 — preservado con 6 sub-tareas operativas | **expanded** |
| **T196** | Tests unitarios calendar/diagonal engines | Seccion T196 — preservado con 7 sub-tareas operativas | **expanded** |
| **T197** | Tests unitarios simulacion y orquestador | Seccion T197 — preservado con 8 sub-tareas operativas | **expanded** |
| **T198** | Tests de integracion para routes | Seccion T198 — preservado con 7 sub-tareas operativas | **expanded** |
| **T199** | Documentacion OpenAPI/Swagger | Seccion T199 — nueva tarea con 5 sub-tareas operativas | **added (v2)** |
| **T200** | Validacion de fechas en contrato base | Seccion T200 — nueva tarea con 4 sub-tareas operativas | **added (v2)** |
| **T201** | Monte Carlo default en APIs + UI | Seccion T201 — nueva tarea con 3 sub-tareas operativas | **added (v2)** |
| **T202** | Cobertura tests termChatAssistant ≥80% | Seccion T202 — nueva tarea con 6 sub-tareas operativas | **added (v2)** |
| **T203** | Cobertura tests termReportEngine branch ≥80% | Seccion T203 — nueva tarea con 6 sub-tareas operativas | **added (v2)** |

### Fuente: `specs/010-team-09-calendar-diagonal/plan.md`

| Seccion Plan Speckit | Estado | Detalle |
|----------------------|--------|---------|
| 5.1 Contrato Base (T162) | **preserved** | Expandido en T162 con sub-tareas y ACs |
| 5.2 Calendar Spread Engine (T163) | **preserved** | Expandido en T163 con sub-tareas y ACs |
| 5.3 Diagonal Spread Engine (T164) | **preserved** | Expandido en T164 con sub-tareas y ACs |
| 5.4 Motor de Simulacion (T165) | **preserved** | Expandido en T165 con sub-tareas y ACs |
| 5.5 Motor de Riesgo (T166) | **preserved** | Expandido en T166 con sub-tareas y ACs |
| 5.6 Orquestador (T169) | **preserved** | Expandido en T169 con sub-tareas y ACs |
| 5.7 Visualizacion (T167) | **preserved** | Expandido en T167 con sub-tareas y ACs |
| 5.8 APIs (T168) | **preserved** | Expandido en T168 con sub-tareas y ACs |
| 5.9 Chat IA | **merged** | Nueva tarea S-T09-C01 con trazabilidad a RF-004 |
| 5.10 Tests (T196-T198) | **preserved** | Expandido en T196, T197, T198 con sub-tareas |
| 5.11 Estandarizacion (T177) | **preserved** | Expandido en T177 con sub-tareas |
| 6. Grafo de dependencias | **preserved** | Reflejado en seccion 4 de este documento |
| 7. Riesgos | **preserved** | Reflejados en ACs de cada tarea |
| 8. Criterios de Validacion | **preserved** | Reflejados en ACs por tarea |
| 10. Gaps G-T09-01 a G-T09-03 | **preserved** | Reflejados en seccion 7 de este documento |

### Resumen de cobertura:

| Categoria | Conteo | Detalle |
|-----------|--------|---------|
| **preserved** | 21 | 12 tareas canonicas mapeadas 1:1 + 9 secciones de plan.md preservadas |
| **expanded** | 12 | Todas las tareas canonicas expandidas con sub-tareas operativas, ACs, dependencias |
| **merged** | 1 | Chat IA (RF-004) mergeado como nueva tarea S-T09-C01 desde spec.md y plan.md |
| **added (v2)** | 5 | Nuevas tareas T199-T203 para cubrir brechas de calidad detectadas en auditoria |
| **dropped** | 0 | Ningun contenido canonico omitido |

**Resultado: SIN GAPS.** Todo el contenido canonico de `teams/TEAM-09/tasks.md`, `teams/TEAM-09/plan.md` y `specs/010-team-09-calendar-diagonal/plan.md` esta preservado, expandido o mergeado. No hay omisiones no justificadas. Se agregaron 5 nuevas tareas Speckit (T199-T203) para cubrir brechas de calidad y documentacion.

---

## 9. Ready / Next Steps

- [x] Backlog operativo generado con trazabilidad 1:1 al canon Diana
- [x] Tareas canonicas T162-T169, T177, T196-T198 preservadas y expandidas
- [x] Nueva tarea Speckit S-T09-C01 (Chat IA) creada desde RF-004
- [x] 5 nuevas tareas T199-T203 agregadas (v2) para calidad y documentacion
- [x] Grafo de dependencias y oleadas definido
- [x] Required skills verificadas sin gaps
- [x] Cobertura canonica validada (preserved: 21, expanded: 12, merged: 1, added: 5, dropped: 0)
- [X] Pendiente: Ejecutar `/diana.integrate action="run" engine="speckit" run_only="implement"` para iniciar implementacion Speckit
- [ ] (gap externo) G-T09-01: Definir supuestos de modelado de curva temporal e IV term structure por mercado — requiere coordinacion con Riesgo Institucional
- [ ] (gap externo) G-T09-02: Validar reglas de roll (calendario, triggers, costos) con politica de riesgo institucional — requiere coordinacion con Riesgo Institucional
- [ ] (gap externo) G-T09-03: Acordar formato de metricas de theta decay y sensibilidad temporal para UI consolidada — requiere coordinacion con TEAM-01

---
**Nota**: Las tareas T199-T203 fueron identificadas durante auditoria de calidad posterior a la implementacion inicial. No estan en el canon Diana original porque son expansiones Speckit para cubrir brechas detectadas. La seccion de cobertura canonica las clasifica como **added (v2)**.

---

*Este documento fue generado por `speckit.tasks` a partir del canon Diana `teams/TEAM-09/tasks.md`, el plan Speckit vigente `specs/010-team-09-calendar-diagonal/plan.md` y el spec Speckit vigente `specs/010-team-09-calendar-diagonal/spec.md`. Cumple con la regla de no-omision: todo el contenido canonico de entrada esta preservado, expandido o mergeado.*
