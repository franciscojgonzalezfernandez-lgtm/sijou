# F-013 — Tareas

Rama `feat/F-013-stock-lotes`. Plan aprobado el 28-11-2026. Hecho.

- [x] T1 Reglas de dominio en `src/domain/stock/`: `zurichToday`, `isExpired`, `availableStock`, `fefoOrder`, `allocate`, `validateAdjustment`, `validateLotEntry`, `REASONS`. 100 % de ramas. (CA-1…CA-5)
- [x] T2 Colecciones `lots` y `stock-movements` con acceso (cantidades de solo lectura, movimientos solo inserción), auditoría de `lots` (entidad nueva en F-018) y registro en `payload.config.ts`. (CA-1, CA-6)
- [x] T3 Migración `…_stock_lots` con `CHECK`, `UNIQUE (variant_id, code)`, índices compuestos y trigger de `stock_movements`; ampliar la comprobación de migraciones de CI. Revisada antes de aplicarla. (CA-5, CA-6)
- [x] T4 `src/lib/stock.ts`: `receiveLot`, `adjustLot`, `consume`, `variantStock`, en transacción con `FOR UPDATE`. (CA-3, CA-4, CA-5, CA-6, CA-8)
- [x] T5 [P] Prueba de integración `src/lib/stock.integration.test.ts` en el job `quality`: concurrencia, `CHECK`, trigger y coherencia lote = suma de movimientos. (CA-5, CA-6, CA-8)
- [x] T6 Endpoints `POST /api/lots/receive` y `POST /api/lots/:id/adjust` con `req.user` y errores por campo; `expireCatalog()` después de cada cambio. (CA-4, CA-5)
- [x] T7 `StockPanel` en la ficha de la variante: resumen, lotes en FEFO, registrar lote, ajustar, historial con filtros; móvil sin desbordar. Campo virtual `stockAvailable` en la lista de variantes. (CA-2, CA-7)
- [x] T8 Bloquear el borrado de variantes con movimientos y archivar en vez de borrar productos con historial. (D-3)
- [x] T9 Seed: 2 lotes de ejemplo (con y sin caducidad), idempotente.
- [x] T10 E2E `e2e/stock.spec.ts` en escritorio y móvil, con axe. (CA-1…CA-7)
- [x] T11 Al terminar: spec y plan a "Hecha"/"Implementado", BACKLOG ✅, ARCHITECTURE §5 con `lot` y `stock_movement` como quedan.
