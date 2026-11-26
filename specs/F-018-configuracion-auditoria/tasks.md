# F-018 — Tareas

Rama `feat/F-018-configuracion-auditoria`. Pendiente de aprobar el plan.

- [ ] T0 Plan aprobado (D-1…D-4 resueltas).
- [ ] T1 [P] Dominio de configuración en `src/domain/settings/`: `DEFAULT_SETTINGS`, `resolveSettings` y validadores (enteros ≥ 0, emails, umbral en CHF), con pruebas al 100 %. (CA-1, CA-2)
- [ ] T2 [P] Dominio de auditoría en `src/domain/audit/`: `diffDocs`, `SENSITIVE_KEYS`/`redact`, `actionFor`, `describeActor`, con pruebas al 100 %. (CA-3, CA-5)
- [ ] T3 Global `settings` con pestañas, etiquetas y errores en español, validación en el servidor, y `getSettings()` cacheado con invalidación al guardar. (CA-1, CA-2)
- [ ] T4 Colección `audit-log` de solo lectura (acceso, `timestamps: false`, sin relaciones) y `auditHooks` / `auditGlobalHooks` en la misma transacción. (CA-3, CA-4)
- [ ] T5 Migración: tablas de `settings` y `audit_log`, índices y trigger de inmutabilidad; revisar el SQL generado. Paso de `psql` en `ci.yml` que comprueba que `UPDATE` y `DELETE` fallan. (CA-4, CA-6)
- [ ] T6 Enganchar la auditoría a `products`, `variants` y `settings`; prueba de la lista de entidades auditadas. (CA-3)
- [ ] T7 Panel: `AuditFilters` (entidad, usuario, fechas, con controles nativos), `AuditChanges` (tabla antes/después) y enlace "Ver historial" en producto y variante. (CA-4, HU-2)
- [ ] T8 Pruebas E2E (Playwright, escritorio y móvil, axe): configuración y validación, umbral → auditoría con antes y después, precio y estado, filtros, solo lectura (UI y 403 en la API), sin campos sensibles. (CA-1…CA-5)
- [ ] T9 Documentación: `docs/ARCHITECTURE.md` §5 (global `settings` en lugar de clave-valor; `audit_log` con trigger), nota en F-072 (exportación del registro fuera de Neon) y en F-053 (email del administrador en la política de privacidad). (CA-6)
- [ ] T10 PR: CI en verde, Lighthouse ≥ 90 × 4 sin cambios en el preview, axe sin violaciones. Al terminar: spec y plan a "Hecha"/"Implementado", BACKLOG ✅.
