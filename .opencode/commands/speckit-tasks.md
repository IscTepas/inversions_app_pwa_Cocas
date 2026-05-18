---
description: Genera el backlog de tareas siguiendo el workflow de Speckit SDD.
agent: build
---

# /speckit.tasks

Ejecuta la fase de descomposicion de tareas del workflow Speckit.

Genera o actualiza el backlog de tareas en `specs/*/tasks.md` con tareas detalladas, dependencias y criterios de completado.

En contexto Diana: este comando consume las tareas canonicas de Diana en `.drfic/diana-sdk/projects/<project>/initiatives/<initiative>/001-inv-tasks.md` o `teams/TEAM-XX/tasks.md` (multi-team) como entrada base. Speckit puede ampliar tareas pero NO las elimina ni omite.
