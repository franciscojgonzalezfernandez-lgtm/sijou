# F-013 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Propuesto (27-11-2026), pendiente de aprobación (D-1…D-5) |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-013-stock-lotes` |

## Resumen técnico
Dos colecciones nuevas de Payload: `lots` (lotes de una variante) y `stock-movements` (historial, solo inserción). Las cantidades **nunca** se escriben con los formularios ni con la API REST de Payload: las tres operaciones que cambian stock (registrar lote, ajustar, consumir) son funciones de servidor en `src/lib/stock.ts` que abren **una transacción de Postgres**, bloquean las filas de los lotes con `SELECT … FOR UPDATE`, actualizan `quantity_available` y escriben el movimiento en la misma transacción (constitución IV, ADR-06).

Las reglas (orden FEFO, qué lote está caducado, stock disponible, reparto de una salida entre lotes, validación de un ajuste) son funciones puras en `src/domain/stock/`, al 100 % de ramas. `src/lib/stock.ts` solo lee, llama al dominio y escribe.

En el panel, la ficha de la variante recibe un bloque **Stock** (componente propio) con el total, el desglose por lote, el historial filtrable y dos formularios: "Registrar lote" y "Ajustar stock". La tienda no cambia en esta feature: el stock que ve el cliente llega con F-021/F-022.

`consume()` (salida FEFO) se implementa y se prueba aquí porque CA-3, CA-5 y CA-8 la necesitan, pero solo la llamarán el webhook de pago (F-033) y la retirada de caducados (F-014).

## Modelo de datos

### `lots` (nueva) — "Lotes", grupo "Catálogo"
| Campo | Tipo | Notas |
|---|---|---|
| `variant` | relationship → `variants` | Obligatorio, índice. No se puede cambiar después de crearlo |
| `code` | text | Código del lote, obligatorio, se guarda sin espacios a los lados. Único por variante (ver D-2) |
| `quantityInitial` | number (entero ≥ 1) | Lo que entró. Solo lectura después de crearlo |
| `quantityAvailable` | number (entero ≥ 0) | Solo lectura siempre en el panel. Lo cambia únicamente `src/lib/stock.ts` |
| `receivedAt` | date (fecha y hora) | Fecha de entrada. Por defecto, ahora. Desempata FEFO entre lotes sin caducidad (CA-3) |
| `expiresAt` | date (solo día) | Opcional. Ver D-1 para cuándo se considera caducado |

- Índice `(variant, expires_at, received_at)` para el orden FEFO.
- Restricciones en la migración: `CHECK (quantity_available >= 0)` (CA-5, defensa en profundidad), `CHECK (quantity_initial >= 1)`, `UNIQUE (variant_id, code)`.
- **Acceso:** leer, el admin. Crear, nadie por la API (solo `receiveLot`). Actualizar, el admin, pero solo `code` y `expiresAt` (los demás campos con `access.update: false`), auditado con los hooks de F-018 (entidad `lots`). Borrar, nadie (los movimientos lo referencian).

### `stock-movements` (nueva) — "Movimientos de stock", grupo "Catálogo"
| Campo | Tipo | Notas |
|---|---|---|
| `at` | date | Obligatorio, índice |
| `variantId` | number | Obligatorio, índice. Entero sin clave foránea, como `audit_log` (ver D-3) |
| `variantSku` | text | SKU en el momento del movimiento, para leer el historial sin uniones |
| `lotId` | number | Opcional (una salida que toca 2 lotes crea 2 movimientos, uno por lote, así que en la práctica siempre va) |
| `lotCode` | text | Código del lote en ese momento |
| `delta` | number (entero ≠ 0) | Positivo entra, negativo sale |
| `quantityAfter` | number | Cantidad disponible del lote después del movimiento. Hace el historial legible y permite comprobar la coherencia |
| `reason` | select | `receipt` (entrada de mercancía), `breakage` (rotura), `gift` (regalo), `correction` (corrección), `other` (otro), `sale` (pedido), `expiry` (caducidad) |
| `comment` | textarea | Obligatorio si `reason = other` (CA-4) |
| `refType` | select | `lot` (alta), `adjustment`, `order`, `expiry` (CA-6) |
| `refId` | text | Id del pedido, etc. Vacío en ajustes y altas |
| `actorId`, `actorEmail` | number, text | Vacíos = "Sistema" (CA-6), con `describeActor` de F-018 |

- **Solo inserción (CA-6):** acceso `create/update/delete: false` y un trigger de Postgres que rechaza `UPDATE` y `DELETE`, igual que `audit_log` (F-018).
- Índice `(variant_id, at DESC)` para el historial de una variante.

### `variants` (se amplía)
- Campo `ui` **`stock`** con el componente `StockPanel` (ver "Panel").
- Campo virtual `stockAvailable` (afterRead, CA-2) para la columna de la lista de variantes: una consulta agregada por página de la lista, no una por fila (ver "Riesgos").
- **Borrado (D-3):** una variante con algún movimiento no se puede borrar ("Tiene historial de stock: desactívala en vez de borrarla."). Un producto cuyas variantes tienen movimientos se archiva en vez de borrarse (F-010 ya distingue archivar de borrar).

### Migración
`payload migrate:create` (`…_stock_lots`), revisada antes de aplicarla, con lo añadido a mano: las `CHECK`, la `UNIQUE (variant_id, code)`, los índices compuestos y el trigger de `stock_movements`. La comprobación de CI de F-018 (la migración se aplica en una base vacía y el trigger rechaza `UPDATE`/`DELETE`) se amplía a `stock_movements`.

## Reglas de dominio (`src/domain/stock/`)
Tipos: `Lot = { id, code, quantityAvailable, receivedAt, expiresAt: string | null }`. Las fechas `expiresAt` son días (`YYYY-MM-DD`).

- **`zurichToday(now)`** → `YYYY-MM-DD` en Europe/Zurich (reutiliza `utcToZurich` de F-012).
- **`isExpired(lot, today)`**: `expiresAt !== null && expiresAt < today` (D-1: el día de caducidad todavía se vende).
- **`availableStock(lots, today)`**: suma de `quantityAvailable` de los no caducados (CA-2).
- **`fefoOrder(lots)`**: caducidad ascendente, los sin caducidad al final, y entre iguales `receivedAt` ascendente y después `id` (orden total y estable) (CA-3).
- **`allocate(lots, quantity, today)`** → `{ ok: true, takes: [{ lotId, quantity }] }` o `{ ok: false, missing }`: recorre `fefoOrder` saltando caducados y lotes a 0. Nunca devuelve un reparto parcial (CA-3, CA-5).
- **`validateAdjustment({ delta, reason, comment }, lot)`** → lista de errores con campo y mensaje en español: `delta` entero distinto de 0, motivo de la lista de CA-4 (no `sale` ni `expiry`, que son del sistema), comentario si es `other`, y `quantityAvailable + delta ≥ 0` ("El lote solo tiene N unidades.") (CA-4, CA-5).
- **`validateLotEntry({ code, quantity, expiresAt }, today)`** → errores (código vacío, cantidad entera ≥ 1) y un aviso, no un error, si `expiresAt < today` (caso límite de la spec: se guarda, pero no suma).
- **`REASONS`**: valores y etiquetas en español, cuáles puede elegir una persona y cuáles son del sistema.

## Operaciones con stock (`src/lib/stock.ts`)
Las tres usan `payload.db.drizzle.transaction()` con SQL de Drizzle sobre las tablas generadas, no la Local API de Payload, para controlar el bloqueo de filas y que nada (hooks, otra transacción de Payload) se cuele en medio (ver D-4). Nivel de aislamiento `READ COMMITTED` + `FOR UPDATE`, que basta porque toda escritura de cantidades pasa por aquí.

- **`receiveLot(payload, user, { variantId, code, quantity, expiresAt, receivedAt? })`**: valida, inserta el lote con `quantity_available = quantity` y el movimiento `receipt`/`lot`. Si el código ya existe en la variante, error en el campo `code`. (HU-1, CA-1, CA-1b, CA-6)
  - ADR-06 dice que al entrar un lote se asignan primero las reservas. Eso llega con las reservas (F-060); aquí se deja el punto de enganche comentado, sin código "por si acaso".
- **`adjustLot(payload, user, { lotId, delta, reason, comment })`**: `SELECT … FOR UPDATE` del lote, `validateAdjustment`, `UPDATE` y movimiento `adjustment`. (HU-2, CA-4, CA-5, CA-6)
- **`consume(payload, { variantId, quantity, reason, refType, refId }, tx?)`**: `SELECT … FROM lots WHERE variant_id = $1 AND quantity_available > 0 ORDER BY <FEFO> FOR UPDATE`, `allocate`, un `UPDATE` y un movimiento por lote tocado. Si no hay bastante, no cambia nada y devuelve `{ ok: false, missing }`. Acepta la transacción de quien llama (el webhook de F-033 descontará varias líneas y guardará el pedido en la misma). (CA-3, CA-5, CA-8)
- **`variantStock(payload, variantIds)`**: stock disponible agregado por variante en una consulta, para el panel y, más adelante, la tienda.

Las altas y los ajustes se exponen como **endpoints de Payload** en la colección `lots` (`POST /api/lots/receive`, `POST /api/lots/:id/adjust`), que comprueban `req.user` en el servidor (constitución VI) y responden `400` con `{ errors: [{ path, message }] }` en español. Después de cada cambio, `expireCatalog()`: el stock cambia lo que verá la tienda.

## Panel
`StockPanel` (componente de cliente en `src/components/admin/`), dentro de la ficha de la variante, debajo de los precios. Solo aparece en variantes ya guardadas.

- **Resumen (CA-7):** "Stock disponible: N" y, si hay, "+ M caducadas (no se venden)".
- **Lotes (CA-1b, CA-7):** tabla HTML nativa (`<table>` con `<caption>`, `<th scope>`), en orden FEFO: código, caducidad (o "Sin caducidad"), entrada, disponible / inicial, y la marca "Caducado" en texto, no solo en color. En el móvil se convierte en lista (cabeceras visibles en cada fila) para no desbordar a 360 px (WCAG 1.4.10, lo que se arregló en #37).
- **Registrar lote (HU-1):** formulario con código, cantidad, caducidad (fecha nativa, opcional) y entrada (por defecto, hoy). Si la caducidad ya pasó, aviso antes de guardar ("Este lote ya está caducado: se registra, pero no se venderá.") y confirmación.
- **Ajustar stock (HU-2, CA-4):** lote (select nativo), cantidad con signo, motivo (select nativo con los 5 motivos), comentario (obligatorio con "otro", con `aria-required` y el mensaje junto al campo).
- **Historial (HU-3, CA-7):** tabla paginada (25 por página) con fecha (hora de Zúrich), lote, cantidad con signo, motivo, referencia, quién y cantidad después. Filtros por lote, motivo y rango de fechas, con los mismos patrones de `AuditFilters` (F-018). Lee `GET /api/stock-movements` con `where`.
- Errores y resultados en una región `aria-live="polite"`; el foco vuelve al primer campo con error. Todo con teclado, sin arrastrar.
- Textos del panel en español, en el propio componente (el panel no usa next-intl, como el resto de F-010…F-018).

La lista de lotes (`/admin/collections/lots`) existe para buscar un código de lote (retiradas, RF-STK-08), con columnas variante (SKU), código, caducidad, disponible. Sin botón "Crear": se crea desde la variante.

## Datos de prueba (`scripts/seed-data.ts`)
La variante de ejemplo recibe 2 lotes: uno con caducidad a 6 meses y otro sin caducidad, cada uno con su movimiento `receipt` del "Sistema". Idempotente: no se repite si la variante ya tiene lotes.

## Pruebas
- **Unitarias (Vitest, 100 % de ramas en `src/domain/stock/`):** FEFO con empates y sin caducidad; caducado el día antes, el mismo día y el día después en hora de Zúrich (cambio de horario incluido); `availableStock` sin lotes, todos caducados, mezcla; `allocate` exacto, de varios lotes, insuficiente (sin reparto parcial), saltando lotes a 0 y caducados; `validateAdjustment` con cada motivo, "otro" sin comentario, delta 0, decimal y negativo mayor que lo disponible; `validateLotEntry` con caducidad pasada. Cada prueba cita su CA.
- **Integración (Vitest + Postgres, `src/lib/stock.integration.test.ts`):** con la base de CI (el job `quality` ya tiene Postgres y aplica las migraciones). (D-5)
  - CA-8: dos `consume()` simultáneos por la última unidad, en dos conexiones: uno termina con `ok`, el otro con `missing = 1`; el lote queda a 0 y hay un solo movimiento de salida.
  - CA-8: 20 ajustes concurrentes de −1 sobre un lote de 10: 10 se aplican, 10 se rechazan, el lote queda a 0 y nunca negativo.
  - CA-5: el `CHECK` rechaza un `UPDATE` directo a negativo.
  - CA-6: `UPDATE` y `DELETE` sobre `stock_movements` fallan por el trigger.
  - Coherencia: después de cada prueba, para cada lote, `quantity_available = suma de sus deltas`.
- **E2E (`e2e/stock.spec.ts`, escritorio y móvil, axe en cada pantalla):** dar de alta 2 lotes con caducidades distintas en una variante nueva (CA-1, CA-1b), ver el total y el desglose en orden FEFO (CA-2, CA-7), un ajuste "rotura" de −1 y un "otro" sin comentario que se rechaza (CA-4), un ajuste que dejaría el lote en negativo y se rechaza (CA-5), y el historial con sus filtros y sin botones de editar ni borrar; `PATCH`/`DELETE` por la API devuelven 403 (CA-6, CA-7). Un lote con caducidad pasada se registra con aviso y no suma.

## Dependencias nuevas
Ninguna. Drizzle ya viene con `@payloadcms/db-postgres`.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** no cambia ninguna página pública. Lighthouse CI sigue en el preview.
- [x] **II. Accesibilidad AA:** tablas y formularios nativos, mensajes junto a cada campo, `aria-live`, foco al primer error, estado "Caducado" en texto, sin desbordar en móvil; axe en la E2E del panel en escritorio y móvil.
- [x] **III. SEO e i18n:** sin textos nuevos en la tienda. El panel, en español.
- [x] **IV. Integridad del dominio:** toda escritura de cantidades en una transacción con `FOR UPDATE`, siempre con su movimiento; movimientos inmutables por acceso y por trigger; `CHECK ≥ 0` en la base; prueba de concurrencia.
- [x] **V. Pruebas:** dominio al 100 %, integración con Postgres para CA-5/6/8, E2E de HU-1…HU-3 con axe.
- [x] **VI. Seguridad y privacidad:** endpoints con `req.user` comprobado en el servidor; el movimiento guarda el email del admin, como la auditoría de F-018 (sin datos de clientes).
- [x] **VII. Simplicidad:** dos colecciones, tres operaciones y un componente. Sin almacenes (fuera de alcance), sin reservas (F-060), sin caché propia del stock.

## Dudas
- **D-1 (propuesta: el día de caducidad todavía se vende):** un lote que caduca el 31-12 se vende hasta las 23:59 del 31-12 en hora de Zúrich y deja de contar el 1-1. Alternativa: deja de venderse el mismo día de caducidad (más prudente con cosmética, pero el producto aún es válido ese día). F-014 añadirá el margen de "Ofertas" antes de caducar.
- **D-2 (propuesta: código único por variante):** el mismo código no se puede repetir en una variante; sí en variantes distintas (un lote de fabricación puede dar varios tamaños). Alternativa: único en toda la tienda, o sin restricción.
- **D-3 (propuesta: sin clave foránea y sin borrar variantes con historial):** los movimientos guardan el id y el SKU de la variante como datos, sin clave foránea, igual que `audit_log`, porque `ON DELETE SET NULL` reescribiría filas inmutables. Para que el historial no quede huérfano, una variante con movimientos no se puede borrar (se desactiva), y su producto se archiva en vez de borrarse. Alternativa: permitir borrar y que el historial conserve solo el SKU guardado.
- **D-4 (propuesta: SQL de Drizzle en una transacción propia, no la Local API de Payload):** permite `FOR UPDATE` y deja claro qué se bloquea y en qué orden. A cambio, estas escrituras no pasan por los hooks de Payload (por eso las cantidades son de solo lectura en Payload y los lotes no se pueden crear por la API). Alternativa: la Local API con `req.transactionID`, que no expone `FOR UPDATE` y deja posible una carrera entre leer y escribir.
- **D-5 (propuesta: prueba de integración en el job `quality` de CI):** con el Postgres que ese job ya tiene para comprobar las migraciones, en un fichero `*.integration.test.ts` que se salta si no hay `DATABASE_URL`. Alternativa: probar la concurrencia solo en la E2E sobre el preview, que es más lenta y menos determinista.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| Los nombres de tablas y columnas generados por Payload cambian | `src/lib/stock.ts` usa las tablas de Drizzle del adaptador (`payload.db.tables`), no nombres escritos a mano. Están tipadas como `any`, así que lo detecta la prueba de integración, no `pnpm typecheck` |
| Bloqueos mutuos cuando una salida toca varios lotes | Siempre se bloquean en el mismo orden (FEFO, desempate por `id`) y en una sola sentencia `SELECT … FOR UPDATE` |
| La columna de stock de la lista de variantes hace una consulta por fila | `stockAvailable` se calcula con una sola consulta agregada para los ids de la página (afterRead con caché por `req`); si no se puede, la columna se quita y el total queda solo en la ficha |
| Las cantidades se editan por la API saltándose la transacción | `access.update: false` en esos campos, `create: false` en la colección, y una prueba E2E que lo intenta por la API |
| El trigger de inmutabilidad impide limpiar las bases de las E2E | Las E2E crean variantes nuevas con sufijo aleatorio y no borran nada, como `settings-audit.spec.ts` |
| Hora de Zúrich en los límites de caducidad | Una sola función `zurichToday`, con pruebas en el cambio de horario |
