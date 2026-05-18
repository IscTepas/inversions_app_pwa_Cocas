# Diana Engine Handoff — TEAM-09 · speckit.specify
## Calendar Spread & Diagonal Spread — SquadISC

**Identificador**: 001-INV-HANDOFF-T09-SPECIFY
**Proyecto**: diana-inversions
**Iniciativa**: 001-inversions
**Equipo**: TEAM-09 (SquadISC)
**Engine objetivo**: speckit
**Stage objetivo**: specify
**Accion**: /diana.integrate action="run" engine="speckit" project="diana-inversions" initiative="001-inversions" team="TEAM-09" run_only="specify" language="es"
**Version de generacion**: 2026-05-18
**Idioma**: es (espanol tecnico)

---

## Autoridad

Este handoff esta subordinado a:
1. `inv-constitution.md` — Constitucion del proyecto
2. `001-inv-spec.md` — Spec canonica global
3. `001-inv-plan.md` — Plan canonico global
4. `001-inv-tasks.md` — Backlog canonico global
5. `teams/TEAM-09/spec.md` — Spec canonica de equipo (CANON DE ENTRADA)
6. `teams/TEAM-09/plan.md` — Plan canonico de equipo
7. `teams/TEAM-09/tasks.md` — Tasks canonicas de equipo
8. `integrations/integration-profile.md` — Perfil de integracion Diana-Speckit
9. `speckit/team-agent-bootstrap.md` — Bootstrap de agente por equipo

Ante conflicto, prevalece el canon Diana.

---

## Objetivo

Definir exactamente que debe consumir Speckit en la etapa `specify` para TEAM-09, leyendo el artefacto canonico `teams/TEAM-09/spec.md` como entrada base obligatoria, y producir un feature Speckit optimizado para estrategias Calendar Spread y Diagonal Spread (variantes call/put) con apoyo de Chat IA explicativo, sin omitir ni redefinir el alcance ya validado por Diana.

---

## Engine y Stage Objetivo

| Campo | Valor |
|-------|-------|
| engine | speckit |
| stage | specify |
| etapa_equivalente_en_sdd_engine_matrix | engines.speckit.specify |
| required_skills | 009-inv-execution-governance-human-control, 012-inv-compliance-audit-retention, 001-inv-technical-analysis-structure, 002-inv-indicator-signal-logic, 003-inv-fundamental-analysis, 007-inv-ai-confluence-orchestration |

---

## Perfil de Integracion (desde integration-profile.md)

| Decision | Valor |
|----------|-------|
| motor_sdd | speckit |
| orquestacion | manual |
| topologia_desarrollo | multi_team |
| politica_autoridad | diana_canon_strict |
| sync_trigger_automatico | on_merge |
| auto_on_specify | false |

---

## Artefactos Diana de Entrada Obligatoria para speckit.specify

Segun la regla de entrada canonica (seccion 88-91 del comando):

| # | Artefacto | Ruta | Rol |
|---|-----------|------|-----|
| 1 | Spec canonica de equipo | `teams/TEAM-09/spec.md` | **ENTRADA BASE OBLIGATORIA** — Speckit debe cargar este archivo como descripcion base del feature |
| 2 | Plan canonico de equipo | `teams/TEAM-09/plan.md` | Contexto de fases tecnicas y riesgos |
| 3 | Tasks canonicas de equipo | `teams/TEAM-09/tasks.md` | Backlog base con IDs canonicos T162-T169, T177, T196-T198 |
| 4 | Perfil de integracion | `integrations/integration-profile.md` | Politica de derivacion de features Speckit |
| 5 | Bootstrap de agente | `speckit/team-agent-bootstrap.md` | Required skills, knowledge docs, contracts, gaps conocidos |
| 6 | Skills manifest | `knowledge/indexes/skills-manifest.yaml` | Catalogo de skills canonicas |
| 7 | Engine matrix | `knowledge/indexes/sdd-engine-matrix.yaml` | Mapeo de etapas y required_skills |
| 8 | Constitucion | `inv-constitution.md` | Principios constitucionales del proyecto |
| 9 | Spec global | `001-inv-spec.md` | Spec canonica global de la iniciativa |

---

## Orden de Ejecucion Recomendado para speckit.specify

1. **Carga de conocimiento base**: Leer skills-manifest.yaml, sdd-engine-matrix.yaml, team-agent-bootstrap.md
2. **Carga del canon de entrada**: Leer `teams/TEAM-09/spec.md` como fuente base obligatoria
3. **Carga de contexto adicional**: Leer `teams/TEAM-09/plan.md` y `teams/TEAM-09/tasks.md` para entender alcance completo
4. **Ejecucion de speckit.specify**: Generar feature spec optimizada para TEAM-09 en `specs/010-team-09-calendar-diagonal/`
5. **Validacion de cobertura**: Confirmar que el output preserva, expande o mergea todo el contenido del canon de entrada
6. **Reporte de cobertura**: Generar analisis preserved/expanded/merged/dropped

---

## Reglas de Consumo por Speckit

### Que puede hacer Speckit en specify:
- **Optimizar** la estructura y detalle de la especificacion
- **Expandir** el alcance con secciones adicionales (ej. casos de uso, diagramas, contratos de API)
- **Mejorar** la claridad, granularidad y completitud de los requerimientos
- **Complementar** con analisis tecnico propio de Speckit (griegas, escenarios, ejemplos)

### Que NO puede hacer Speckit en specify:
- **Omitir** requisitos, decisiones o alcance ya validados por Diana en `teams/TEAM-09/spec.md`
- **Redefinir** el alcance funcional RF-001 a RF-006
- **Redefinir** los requerimientos no funcionales RNF-001 a RNF-006
- **Modificar** los artefactos canonicos globales (`001-inv-spec.md`, `001-inv-plan.md`, `001-inv-tasks.md`, `inv-constitution.md`)
- **Ignorar** las restricciones de la politica de autoridad `diana_canon_strict`

### Cuando debe detenerse:
- Si detecta contradiccion irresoluble entre el canon Diana y su analisis
- Si el alcance solicitado excede los limites definidos en `scope_primario.md` para TEAM-09
- Si requiere modificar contratos compartidos sin autorizacion

---

## Feature Speckit Objetivo

Segun `integration-profile.md`, el feature Speckit para TEAM-09 debe generarse en:

```
specs/010-team-09-calendar-diagonal/
```

Este feature debe contener:
- `spec.md` — Especificacion Speckit optimizada (output de speckit.specify)
- `plan.md` — Plan Speckit (output de speckit.plan, etapa posterior)
- `tasks.md` — Tasks Speckit (output de speckit.tasks, etapa posterior)
- Contratos de API y modulos segun corresponda

La feature umbrella `specs/001-plataforma-inversiones-ia/` NO debe modificarse con el contenido de TEAM-09.

---

## Ready / Gaps

### Ready Status: READY_FOR_SPECKIT_SPECIFY

### Gaps detectados:
| # | Gap | Impacto | Accion recomendada |
|---|-----|---------|-------------------|
| G01 | No existe la feature `specs/010-team-09-calendar-diagonal/` | El feature debe crearse como parte de esta ejecucion | Crear estructura de directorio y spec.md inicial |
| G02 | `run_only="specify"` — Solo se ejecuta esta etapa; plan y tasks quedan pendientes | El pipeline no esta completo hasta ejecutar speckit.plan y speckit.tasks | Ejecutar `/diana.integrate action="run" engine="speckit" project="diana-inversions" initiative="001-inversions" team="TEAM-09" run_only="plan"` y luego `run_only="tasks"` |
| G03 | required_skills 001, 002, 003, 007, 009, 012 deben estar cargadas en contexto Speckit | Si falta alguna, la especificacion podria ser incompleta | Verificar con `/diana.skills action="validate"` que todas las skills esten disponibles |

### Acciones recomendadas:
1. Ejecutar speckit.specify sobre el canon de entrada `teams/TEAM-09/spec.md`
2. Generar `specs/010-team-09-calendar-diagonal/spec.md` como output
3. Validar cobertura del canon de entrada en el output generado
4. Proceder con speckit.plan y speckit.tasks en ejecuciones posteriores

---

## Estado

Este documento constituye el Handoff Oficial entre Diana y Speckit para la etapa `specify` del equipo TEAM-09 (SquadISC) en la iniciativa 001-inversions.

Proximo paso: Ejecutar `speckit.specify` con la entrada base `teams/TEAM-09/spec.md` y generar el feature Speckit en `specs/010-team-09-calendar-diagonal/`.
