# Diana SDK + Speckit - Instrucciones del Proyecto

Este proyecto usa **Diana SDK v0.1.5** como framework de gobernanza SDD (Spec-Driven Development) integrado con **Speckit**.

## Estructura de Comandos Diana

Todos los comandos Diana estan disponibles como comandos de openCode en `.opencode/commands/`:

| Comando | Descripcion |
|---------|-------------|
| `/diana.help` | Centro de ayuda - sintaxis, flujo SDD, tutorial |
| `/diana.new` | Inicializar proyecto Diana nuevo |
| `/diana.ticket` | Crear ticket de servicio |
| `/diana.change` | Crear UCC (control de cambios) |
| `/diana.integrate` | Integrar Diana con engine SDD (Speckit) |
| `/diana.constitution` | Generar constitucion del proyecto |
| `/diana.skills` | Generar skills canonicas |
| `/diana.knowledge` | Generar conocimiento profundo |
| `/diana.specify` | Generar especificacion canonica |
| `/diana.plan` | Generar plan tecnico |
| `/diana.tasks` | Generar backlog de tareas |
| `/diana.teams` | Definir topologia multi-equipo |
| `/diana.sync` | Sincronizar tareas Speckit <-> Diana |

## Flujo SDD Recomendado (Multi-Equipo)

1. `/diana.new` -> Bootstrap proyecto
2. `/diana.change` -> Crear UCC
3. `/diana.integrate action="bootstrap" engine="speckit" topology="multi_team"`
4. `/diana.constitution` -> Generar constitucion
5. `/diana.teams action="topology"` -> Definir equipos
6. `/diana.skills action="validate"`
7. `/diana.knowledge`
8. `/diana.specify` -> `/diana.plan` -> `/diana.tasks`
9. `/diana.teams action="generate"` -> Roster + allocation
10. `/diana.integrate action="generate" engine="speckit"`
11. `speckit.specify` -> `speckit.plan` -> `speckit.tasks` -> `speckit.implement`

## Reglas Canonicas

- Diana es la fuente de verdad para gobernanza y canon del proyecto
- Speckit optimiza/amplia pero NUNCA omite contenido canonico de Diana
- Los artefactos en `teams/TEAM-XX/` son la entrada base para Speckit por equipo
- IDs canonicos de Diana son la unica llave de sincronizacion valida

## Ubicaciones Clave

- Diana SDK: `.drfic/diana-sdk/`
- Comandos openCode: `.opencode/commands/`
- Agentes openCode: `.opencode/agents/`
- Spec operativo: `specs/`
- Feature activo: `.specify/feature.json`
