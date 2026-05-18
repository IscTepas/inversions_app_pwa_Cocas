# Feature Speckit: Calendar Spread & Diagonal Spread
## TEAM-09 — SquadISC

**Proyecto**: diana-inversions
**Iniciativa**: 001-inversions
**Equipo**: TEAM-09 (SquadISC)
**Engine**: speckit
**Etapa**: specify
**Idioma**: es
**Generado desde**: /diana.integrate action="run" engine="speckit" project="diana-inversions" initiative="001-inversions" team="TEAM-09" run_only="specify" language="es"
**Canon de entrada**: teams/TEAM-09/spec.md
**Version**: 1.0
**Estado**: Draft Speckit

---

## 1. Descripcion del Feature

Implementar el modelado, calculo, simulacion y exposition de las estrategias de opciones **Calendar Spread** y **Diagonal Spread** en sus variantes **call** y **put**, con un asistente Chat IA que explique el proposito, riesgo y condiciones de uso de cada estructura temporal.

Este feature es el slice operativo del equipo TEAM-09 dentro de la iniciativa 001-inversions, en topologia multi-equipo.

---

## 2. Requerimientos Funcionales (desde canon Diana)

| ID Canonico | Descripcion | Prioridad |
|-------------|-------------|-----------|
| RF-001 | Implementar contratos para modelar estrategias Calendar Spread y Diagonal Spread | Alta |
| RF-002 | Cubrir variantes call y put de ambas estructuras | Alta |
| RF-003 | Exponer escenarios de riesgo, tiempo y sensibilidad para cada estrategia | Alta |
| RF-004 | Integrar un Chat IA para explicar el proposito, riesgo y condiciones de uso | Media |
| RF-005 | Publicar salidas estructuradas para consumo por otros equipos y Speckit | Alta |
| RF-006 | Mantener trazabilidad entre estructura temporal, estrategia y decision sugerida | Alta |

---

## 3. Requerimientos No Funcionales (desde canon Diana)

| ID Canonico | Descripcion | Criticidad |
|-------------|-------------|------------|
| RNF-001 | La IA no ejecuta operaciones y no sustituye el juicio humano | Critica |
| RNF-002 | Las estructuras deben ser reproducibles y auditables | Alta |
| RNF-003 | Las estrategias deben permanecer desacopladas del broker y del frontend | Alta |
| RNF-004 | La salida debe ser clara para validacion humana y lectura operativa | Alta |
| RNF-005 | El componente debe conservar contratos estables de integracion | Alta |
| RNF-006 | Cada modulo o historia de usuario implementada DEBE contar con tests automatizados (unit e integration) que cubran la logica de negocio critica, los contratos de API y los flujos de error, con cobertura minima del 80% en rutas criticas | Alta |

---

## 4. Arquitectura de Modulos (Speckit expansion)

### 4.1 Modulo de Contratos Base
- `termStrategyContract.ts` — Contrato base Calendar/Diagonal con inputs por pata (strikes, expiraciones cercanas/lejana, primas, contratos), validacion de consistencia temporal y estilo de opcion

### 4.2 Motores de Estrategia
- `calendarSpreadEngine.ts` — Core de Calendar Spread (call/put) con modelado de theta, vencimiento corto/largo, impacto de term structure IV y escenarios de precio
- `diagonalSpreadEngine.ts` — Core de Diagonal Spread (call/put) con combinacion strike+tiempo, sensibilidad de griegas, perfiles de riesgo y ventanas de ajuste

### 4.3 Motor de Simulacion Temporal
- `termSimulationEngine.ts` — Backtesting, Monte Carlo/escenarios deterministicos y proyeccion de payoff/P&L en tiempo real

### 4.4 Motor de Riesgo
- `termRiskEngine.ts` — Limites por vencimiento, riesgo de asignacion, reglas de stop-loss y alertas push/email

### 4.5 Visualizacion y Reporting
- `termReportEngine.ts` — Curvas de payoff, superficies tiempo-precio-IV y metricas riesgo/beneficio auditables

### 4.6 APIs de Exposicion
- `calendarSpread.ts` — API REST para Calendar Spread
- `diagonalSpread.ts` — API REST para Diagonal Spread
- `termComparator.ts` — Comparador Calendar vs Diagonal para recomendacion segun contexto

### 4.7 Orquestador de Gestion Temporal
- `termRollOrchestrator.ts` — Reglas de roll/ajuste, cierre anticipado y control de deterioro temporal

### 4.8 Chat IA Explicativo
- `termChatAssistant.ts` — Integracion con Chat IA para explicar proposito, riesgo y condiciones de uso de cada estructura temporal

---

## 5. Diagrama de Contexto (Speckit expansion)

```
[Market Data] --> [termStrategyContract]
                        |
            +-----------+-----------+
            |                       |
   [calendarSpreadEngine]  [diagonalSpreadEngine]
            |                       |
            +-----------+-----------+
                        |
              [termSimulationEngine]
                        |
                  [termRiskEngine]
                        |
            +-----------+-----------+
            |                       |
   [termReportEngine]    [termRollOrchestrator]
            |                       |
            +-----------+-----------+
                        |
                  [API Layer]
            (calendarSpread, diagonalSpread, termComparator)
                        |
                  [Chat IA Explicativo]
                        |
              [Consumo Frontend / Otros Equipos]
```

---

## 6. Tareas Canonicas Asociadas (desde teams/TEAM-09/tasks.md)

| ID | Descripcion | Modulo |
|----|-------------|--------|
| T162 | Definir contrato base Calendar/Diagonal | termStrategyContract.ts |
| T163 | Implementar core de Calendar Spread (call/put) | calendarSpreadEngine.ts |
| T164 | Implementar core de Diagonal Spread (call/put) | diagonalSpreadEngine.ts |
| T165 | Implementar motor de simulacion temporal | termSimulationEngine.ts |
| T166 | Implementar Risk Engine Calendar/Diagonal | termRiskEngine.ts |
| T167 | Implementar modulo de visualizacion y reporting | termReportEngine.ts |
| T168 | Implementar APIs dedicadas y comparador | termComparator.ts |
| T169 | Implementar orquestador de gestion temporal | termRollOrchestrator.ts |
| T177 | Ejecutar ajuste al estandar transversal | Estandarizacion |
| T196 | Tests unitarios calendar/diagonal engines | Tests |
| T197 | Tests unitarios simulacion y orquestador | Tests |
| T198 | Tests de integracion para routes | Tests |

---

## 7. Restricciones Tecnicas (desde canon Diana)

- Se mantiene la arquitectura semi-automatica constitucional
- No se permite auto-trading
- No se modifican los artefactos canonicos globales (001-inv-spec.md, 001-inv-plan.md, 001-inv-tasks.md)
- El alcance de TEAM-09 se limita a estrategias temporales Calendar y Diagonal
- La IA solo explica y contextualiza, no autoriza ejecucion

---

## 8. Supuestos (desde canon Diana)

- La topologia activa de la iniciativa es multi_team
- TEAM-09 consume contratos de mercado y puede compartir contexto con otros cores
- Existen contratos comunes de persistencia y evidencia definidos por el canon global
- El Chat IA solo explica y contextualiza, no autoriza ejecucion

---

## 9. Criterios de Exito (desde canon Diana)

- Las estrategias Calendar y Diagonal se modelan con escenarios claros y trazables
- El Chat IA puede explicar por que una estructura temporal aplica o no
- Las salidas permiten validacion humana antes de cualquier intento de operacion
- El alcance del equipo no invade dominios de volatilidad, noticias o broker
- Las salidas pueden integrarse con Speckit sin perder la autoridad canonica

---

## 10. Trazabilidad (desde canon Diana)

- **Principios constitucionales**: modelo semi-automatico obligatorio, control humano explicito, arquitectura por cores desacoplados, senales explicables y trazables
- **UCC de origen**: 001-INV-UCC
- **Fuente de division funcional**: scope_primario.md
- **Relacion con canon global**: derivada de 001-inv-spec.md

---

## 11. Riesgos Identificados (Speckit expansion)

| Riesgo | Descripcion | Mitigacion |
|--------|-------------|------------|
| R-01 | Parametrizacion temporal incorrecta | Contratos robustos y pruebas unitarias |
| R-02 | Salidas ambiguas para validacion humana | Explicabilidad y supuestos visibles en cada salida |
| R-03 | Dependencia de datos de mercado no disponibles | Contratos desacoplados con validacion de existencia |
| R-04 | Complejidad de modelado de IV term structure | Documentacion de supuestos por mercado |

---

## 12. Contratos de Integracion (Speckit expansion)

### Contratos de entrada:
- `auth-context.md` — Contexto de autenticacion
- `broker-adapter.md` — Adaptador de broker para datos de mercado
- `signal-lifecycle.md` — Ciclo de vida de senales

### Contratos de salida:
- API REST con respuestas JSON estructuradas para consumo por frontend y otros equipos
- Formato de metricas de theta decay y sensibilidad temporal para UI consolidada

---

## 13. Gaps y Decisiones Pendientes (desde team-agent-bootstrap.md)

| Gap | Descripcion | Estado |
|-----|-------------|--------|
| G-T09-01 | Definir supuestos de modelado de curva temporal e IV term structure por mercado | Pendiente |
| G-T09-02 | Validar reglas de roll (calendario, triggers, costos) con politica de riesgo institucional | Pendiente |
| G-T09-03 | Acordar formato de metricas de theta decay y sensibilidad temporal para UI consolidada | Pendiente |

---

*Este documento fue generado por speckit.specify a partir del canon Diana `teams/TEAM-09/spec.md`. Cumple con la regla de no-omision: todo el contenido canonico de entrada esta preservado, expandido o mergeado. Ver reporte de cobertura para detalle.*
