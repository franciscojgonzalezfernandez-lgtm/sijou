# Spec-Driven Development (SDD)

Cada feature del [BACKLOG](./BACKLOG.md) pasa por estas fases, en orden. No se escribe código de producción sin una spec y un plan aprobados.

| Fase | Archivo | Contenido | Puerta de salida |
|---|---|---|---|
| 1. Especificar | `specs/F-XXX-slug/spec.md` | **Qué** y **por qué**: historias de usuario, criterios de aceptación con ID (CA-n), casos límite y lo que queda fuera. Sin decisiones técnicas. | Spec aprobada, sin `[DUDA]` abiertas |
| 2. Planificar | `plan.md` | **Cómo**: modelo de datos, rutas, componentes, contratos, riesgos y comprobación de la [constitución](./constitution.md). | Plan aprobado |
| 3. Tareas | `tasks.md` | Lista de tareas pequeñas y ordenadas, cada una ligada a sus CA. Las que se pueden hacer en paralelo se marcan con `[P]`. | — |
| 4. Implementar | código + pruebas | Una rama y un PR por feature (`feat/F-XXX-slug`). | CI en verde, pruebas unitarias + E2E de todos los CA, **Lighthouse ≥ 90 × 4**, axe sin violaciones |
| 5. Verificar | `spec.md` (estado) | Se comprueba cada CA en el preview y se actualiza el estado en el BACKLOG. | Feature `Hecha` |

## Convenciones
- Las plantillas están en [`_templates/`](./_templates).
- Las dudas se escriben dentro de la spec como `[DUDA: …]` y se resuelven antes de pasar al plan.
- Si el alcance cambia, primero se actualiza la spec y después el código.
- Las pruebas citan el CA que cubren: `it('CA-3: …')`.
