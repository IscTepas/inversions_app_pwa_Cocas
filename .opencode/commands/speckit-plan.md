---
description: Genera el plan tecnico de implementacion siguiendo el workflow de Speckit SDD.
agent: build
---

# /speckit.plan

Ejecuta la fase de planificacion del workflow Speckit.

Usa la spec en `specs/*/spec.md` para generar un plan tecnico detallado con arquitectura, fases, y criterios de validacion.

En contexto Diana: este comando consume el plan canonico de Diana en `.drfic/diana-sdk/projects/<project>/initiatives/<initiative>/001-inv-plan.md` o `teams/TEAM-XX/plan.md` (multi-team) como entrada base.
