---
description: Genera la especificacion funcional siguiendo el workflow de Speckit SDD.
agent: build
---

# /speckit.specify

Ejecuta la fase de especificacion del workflow Speckit.

Genera o actualiza la spec funcional en `specs/*/spec.md` con requisitos funcionales, no funcionales, user stories y criterios de aceptacion.

En contexto Diana: este comando consume la spec canonica de Diana en `.drfic/diana-sdk/projects/<project>/initiatives/<initiative>/NNN-<alias>-spec.md` o `teams/TEAM-XX/spec.md` (multi-team) como entrada base. Speckit optimiza pero NO omite contenido canonico.
