# F-018 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Propuesto (26-11-2026), pendiente de aprobación |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-018-configuracion-auditoria` |

## Resumen técnico
Dos piezas, las dos dentro de Payload y sin dependencias nuevas:

1. **Configuración** (CA-1, CA-2): un **global** de Payload, `settings`, con los datos de la tienda, los ajustes de stock y caducidad, los emails de aviso y el umbral de envío gratis. Las demás features no leen el global directamente: llaman a `getSettings()`, que devuelve un objeto tipado con los valores por defecto ya aplicados (función pura `resolveSettings` en `src/domain/settings/`) y está cacheado con una etiqueta que se invalida al guardar.
2. **Auditoría** (CA-3…CA-6): una colección `audit-log` de solo lectura. Un único juego de hooks (`auditHooks(entity)`) se engancha a cada colección o global auditado y, en la **misma transacción** que el cambio, escribe quién, cuándo, qué entidad, qué acción y la lista de cambios (antes → después). La diferencia la calcula una función pura (`diffDocs` en `src/domain/audit/`) que excluye los campos sensibles. La inmutabilidad se garantiza dos veces: control de acceso de Payload (nadie puede crear, editar ni borrar por el panel o la API) y un **trigger de Postgres** que rechaza cualquier `UPDATE` o `DELETE` sobre la tabla.

En F-018 se auditan las entidades que ya existen: `products` (incluye su estado), `variants` (incluye el precio) y `settings`. Stock, promociones y pedidos todavía no existen: F-013, F-017 y F-033/F-040 enganchan `auditHooks` al crear sus colecciones (ver "Contrato para las features siguientes").

## Modelo de datos

### Global `settings` (nuevo)
Etiqueta en el panel: **Configuración**. Agrupado en pestañas para que sea cómodo en el móvil.

| Pestaña | Campo | Tipo | Validación (CA-2) | Por defecto | Lo usa |
|---|---|---|---|---|---|
| Tienda | `storeName` | text | obligatorio | `Sijôu` | F-053, emails |
| Tienda | `contactEmail` | email | email válido | vacío (ver D-1) | F-052, F-053, emails |
| Tienda | `impressumAddress` | textarea | — | vacío (ver D-1) | F-053 (Impressum) |
| Stock | `lowStockThreshold` | number | entero ≥ 0 | `5` | F-014 CA-6 |
| Stock | `offerDaysBeforeExpiry` | number | entero ≥ 0 | `30` (ver D-2) | F-014 CA-1 |
| Stock | `expiryWarningDays` | number | entero ≥ 0 | `30` | F-014 CA-5 (lo fija su spec) |
| Avisos | `alertEmails` | array de `{ email }` | cada uno email válido, sin repetidos, máximo 5 | vacío → se usa `contactEmail` | F-014, F-041 |
| Envíos | `freeShippingThreshold` | number (CHF) | ≥ 0, 2 decimales como máximo | vacío = sin envío gratis (ver D-3) | F-031 CA-3 (umbral general) |

- Ningún campo es traducible: son datos del negocio, no textos de la tienda. Los textos de la tienda que los acompañen (p. ej. "Envío gratis a partir de…") van en los mensajes de next-intl de la feature que los muestre.
- Las etiquetas, descripciones y errores del panel, en español.
- Los números se validan en el servidor con funciones del dominio (`isNonNegativeInteger`, `isValidPrice` de F-010), no solo con el `min` del campo, para que el mensaje sea claro y la regla tenga pruebas.
- **Por qué un global y no la tabla clave-valor `settings(key, value)` de la arquitectura:** un global da tipos, validación y pantalla del panel sin código propio, y sigue siendo una sola fila. Es la opción más simple (constitución VII). Se actualiza `docs/ARCHITECTURE.md` §5.

### Colección `audit-log` (nueva)
Etiqueta en el panel: **Auditoría**, en un grupo "Sistema" de la barra lateral.

| Campo | Tipo | Notas |
|---|---|---|
| `at` | date (con hora) | Momento del cambio. Indexado. Orden por defecto: más reciente primero |
| `actorId` | number, nullable | Id del usuario del panel. **No es una relación**: una relación crea una clave foránea con `ON DELETE SET NULL`, que modificaría filas al borrar un usuario y chocaría con el trigger |
| `actorEmail` | text, nullable | Email del usuario en el momento del cambio, para que el registro se entienda aunque el usuario cambie o se borre. Vacío = **Sistema** (seed, migraciones, webhooks de Stripe, crons) |
| `entity` | select | `products`, `variants`, `settings` (y las que añadan F-013, F-017, F-033…). Etiquetas en español: Producto, Variante, Configuración… Indexado |
| `entityId` | text, nullable | Id del documento (vacío en un global). Indexado junto con `entity` |
| `entityLabel` | text | Lo que identifica al documento para una persona: nombre del producto en español, SKU de la variante, "Configuración" |
| `action` | select | `create`, `update`, `delete`, `status` (Creación, Edición, Borrado, Cambio de estado) |
| `locale` | text, nullable | Idioma editado, cuando el cambio toca campos traducibles (`es`, `en`, `de`) |
| `changes` | json | Lista `{ path, before, after }[]`. Ver "Cálculo de las diferencias" |

- `timestamps: false` en la colección: `at` es la única fecha, y así no hay `updatedAt` que nadie pueda tocar.
- **Acceso:** `read` solo con sesión del panel; `create`, `update` y `delete` devuelven `false` siempre. Los hooks escriben con la API local y `overrideAccess: true`, que es el único camino. Con eso el panel no muestra los botones de crear, guardar ni borrar, y la API REST responde 403 (CA-4).
- **Trigger de inmutabilidad** (CA-4, CA-6), en la migración de F-018:
  ```sql
  CREATE FUNCTION audit_log_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$;
  CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
  ```
  El `down` de la migración borra el trigger y la función. Un `TRUNCATE` de una base de pruebas no se ve afectado (los triggers de fila no se disparan con `TRUNCATE`).

### Migración
Una migración nueva generada con `pnpm migrate:create` (tablas del global `settings` y su array `alertEmails`, tabla `audit_log` con sus índices) a la que se añade a mano el trigger. Se revisa el SQL generado antes de aplicarlo. Se aplica en el build de Vercel como hasta ahora.

## Lectura de la configuración

- **`src/domain/settings/defaults.ts`**: `DEFAULT_SETTINGS` y `resolveSettings(raw): Settings`, función pura que rellena lo que falte con los valores por defecto, convierte `alertEmails` a una lista de strings y, si está vacía, usa `contactEmail`. 100 % de ramas.
- **`src/lib/settings.ts`**: `getSettings()` lee el global con la API local (`depth: 0`) dentro de `"use cache"` con `cacheTag("settings")` y devuelve `resolveSettings(doc)`. Un hook `afterChange` del global invalida la etiqueta (mismo patrón que `expireCatalog` de F-010).
- F-018 no usa ningún ajuste en la tienda. F-014, F-031 y F-053 los leen con `getSettings()`; ninguna feature lee el global directamente.

## Auditoría: hooks y cálculo de las diferencias

### `src/domain/audit/diff.ts` (puro, 100 % de ramas)
- **`diffDocs(before, after, options)`** → `{ path, before, after }[]`:
  - Recorre los dos documentos campo a campo. Los objetos anidados (grupos, pestañas) se aplanan con rutas tipo `seo.title`. Los arrays (fotos, `alertEmails`, categorías) se comparan como un valor entero: si cambian, se guarda la lista completa antes y después, porque en estos casos lo que importa es el resultado y el orden (la primera foto es la principal).
  - Las relaciones se normalizan a su id (`{ id: 3, … }` → `3`), para no guardar documentos enteros ni detectar cambios falsos por la profundidad de la consulta.
  - El texto enriquecido (Lexical) se compara y se guarda como **texto plano** (los nodos de texto unidos), recortado a 2000 caracteres: el JSON de Lexical es enorme e ilegible en un registro.
  - Cualquier valor de texto se recorta a 2000 caracteres con una marca de recorte, para que una fila no crezca sin límite.
  - Ignora `id`, `createdAt`, `updatedAt` y los campos de control de Payload (`_status`, `__v`).
  - Si no hay diferencias, devuelve `[]` y el hook **no escribe nada** (p. ej. guardar sin tocar nada).
- **`redact(path)`** / lista `SENSITIVE_KEYS` (CA-5): `password`, `hash`, `salt`, `token`, `resetPasswordToken`, `resetPasswordExpiration`, `_verificationToken`, `apiKey`, `enableAPIKey`, `secret`, `sessions`, `loginAttempts`, `lockUntil`, y cualquier clave que contenga `password`, `token` o `secret` (sin distinguir mayúsculas). Esos campos **no aparecen** en `changes`, ni siquiera como "cambiado". Se aplica en `diffDocs` y otra vez justo antes de insertar (defensa en profundidad), así que ninguna feature puede saltárselo.
- **`actionFor(operation, changes)`**: `create`, `delete`, o `status` si cambia el campo `status` (aunque cambien más campos a la vez; la lista los recoge todos), y si no `update`. (CA-3, "cambio de estado")
- **`describeActor(user)`**: `{ actorId, actorEmail }` o `{ null, null }` = Sistema.

### `src/collections/audit.ts`
- **`auditHooks({ entity, label })`** devuelve `{ afterChange, afterDelete }` para una colección, y **`auditGlobalHooks({ entity })`** el `afterChange` de un global.
  - `afterChange` recibe `doc` y `previousDoc` (vacío al crear), llama a `diffDocs`, y si hay cambios inserta la fila con `req.payload.create({ collection: "audit-log", …, req, overrideAccess: true })`. Al pasar `req`, la inserción va en **la misma transacción** que el cambio: si la auditoría falla, el cambio tampoco se guarda. No se pierde ningún cambio sin registrar.
  - `afterDelete` guarda `action: "delete"` con el documento borrado como `before` (ya sin campos sensibles).
  - `locale`: el de `req.locale` cuando el documento tiene campos traducibles; `doc` y `previousDoc` llegan en ese idioma, así que la diferencia es la de ese idioma.
  - `entityLabel` sale de una función por entidad (`products` → `name` en español; `variants` → `sku`; `settings` → "Configuración").
- Se engancha en `Products`, `Variants` y el global `settings`.
- **Borrado de un producto** (F-010 borra sus variantes): cada variante borrada deja su propia fila, más la del producto.
- **Rendimiento:** una inserción por guardado. Son 2 administradores; no hace falta cola ni lotes.

### Contrato para las features siguientes
- Toda colección que la spec F-018 CA-3 nombra (stock y lotes en F-013, promociones en F-017, pedidos en F-033/F-040/F-042, y lo que cambie precios) usa `auditHooks` al crearse, y añade su valor a `entity` en la misma migración.
- `stock_movement` (F-013) ya es su propio registro inmutable; F-013 audita además los lotes y los ajustes manuales con `auditHooks`.
- Los cambios hechos por webhooks o crons quedan con actor **Sistema**.
- Una prueba unitaria (`audited-entities.test.ts`) compara la lista de colecciones con `auditHooks` con la lista de entidades del select, para que no se quede ninguna sin etiqueta.

## Pantallas del panel

### Configuración (`/admin/globals/settings`)
- Formulario de Payload con las pestañas de arriba. Los números con `<input type="number">` y `inputmode="numeric"`; los emails con `type="email"`. Cada campo con descripción corta en español ("Se avisa cuando una variante baja de estas unidades").
- Errores de validación en el campo y en el resumen de Payload. Se comprueba con axe y en el móvil (lección de F-010: si el tooltip de error no se ve en el móvil, se usa el mismo patrón de error visible que `NativeSelect`).

### Auditoría (`/admin/collections/audit-log`)
- **Lista**: columnas Fecha, Usuario, Entidad, Elemento, Acción. Orden por fecha descendente. Paginación de Payload.
- **Filtros (CA-4)**: el filtro avanzado de Payload usa `react-select`, que en F-010 dio problemas de accesibilidad. Se añade un componente propio `AuditFilters` (`admin.components.beforeListTable`) con controles nativos dentro de un `<form method="get">`: **Entidad** (`<select>`), **Usuario** (`<select>` con los emails de los usuarios del panel y "Sistema") y **Desde / Hasta** (`<input type="date">`). Al enviarlo construye la consulta `where` que la lista de Payload ya entiende (`where[entity][equals]=…`, `where[actorEmail][equals]=…`, `where[at][greater_than_equal]=…`). Un botón "Quitar filtros". Funciona con teclado y sin JavaScript propio más allá de Payload.
- **Detalle**: todos los campos en solo lectura, sin botón de guardar ni de borrar (lo garantiza el acceso, no solo la interfaz). `changes` se muestra con un componente propio `AuditChanges` como una **tabla** (`<table>` con `<caption>` y cabeceras Campo · Antes · Después), con "(vacío)" para los valores nulos, en lugar del editor JSON de Payload.
- **Accesos directos**: en la barra lateral de un producto y de una variante, un enlace "Ver historial" a la lista de auditoría filtrada por esa entidad y ese id. Cubre HU-2 ("quién cambió un precio") con un clic.

## Conservación 10 años (CA-6)
- Nada borra filas de `audit_log`: ni Payload (acceso), ni SQL normal (trigger), ni ningún cron. No hay purga: la primera fila llegará a 10 años en 2036 y la purga, si se quiere, será una feature aparte con su propia spec.
- El volumen previsto es pequeño (decenas de cambios al día, filas de pocos KB): unos cientos de MB en 10 años, dentro del plan de Neon.
- Las copias de seguridad de Neon (PITR) cubren días, no años. Para que el registro sobreviva a un borrado accidental de la base de datos, **F-072 (puesta en producción)** incluye una exportación periódica del registro fuera de Neon. Se anota en F-072; no se implementa aquí (ver riesgos).

## Datos personales (constitución VI)
- El registro guarda el **email del administrador** que hizo el cambio: son 2 personas de la tienda, es el dato mínimo para saber "quién" y se conserva 10 años por la misma razón que los pedidos (L-09). Se menciona en la política de privacidad (F-053).
- Cuando lleguen los pedidos (F-033/F-040), sus cambios pueden incluir datos del cliente (dirección, email). Se conservan el mismo tiempo que el propio pedido (10 años, L-09), así que no amplían la conservación. F-040 decide qué campos del pedido se auditan.
- Nunca contraseñas ni tokens (CA-5).

## Datos de prueba
`scripts/seed-data.ts` no crea configuración: con el global vacío, `getSettings()` devuelve los valores por defecto. Los cambios que hace el seed (crear el producto de ejemplo) quedan auditados con actor Sistema, lo que sirve de ejemplo en los previews.

## Pruebas
- **Unitarias (Vitest)**:
  - `resolveSettings`: global vacío → valores por defecto; valores guardados que se respetan (incluido `0`); `alertEmails` vacío → `contactEmail`; ambos vacíos → lista vacía. (CA-1, CA-2)
  - Validadores: enteros ≥ 0 (negativo, decimal, vacío, texto), emails (válido, inválido, repetidos, más de 5), umbral de envío (negativo, 3 decimales, vacío). (CA-2)
  - `diffDocs`: sin cambios → `[]`; campo simple; grupo anidado; array reordenado; relación poblada frente a id (sin cambio falso); Lexical a texto plano; recorte a 2000; `create` (antes vacío) y `delete` (después vacío). (CA-3)
  - Exclusión de campos sensibles: cada clave de `SENSITIVE_KEYS`, claves que contienen `password`/`token`/`secret` en cualquier mayúscula y en grupos anidados; nunca aparecen en el resultado. (CA-5)
  - `actionFor` con los 4 casos y `describeActor` con usuario y sin él. (CA-3)
  - Lista de entidades auditadas = valores del select. (CA-3)
- **E2E (Playwright, en el preview, axe en cada visita, escritorio y móvil)**, con sesión del administrador de prueba:
  - Abrir Configuración: se ven todos los campos de CA-1 con sus valores por defecto. (CA-1, CA-2)
  - Guardar un umbral negativo y un email inválido → error en cada campo, no se guarda. (CA-2)
  - Cambiar el umbral de stock bajo de N a N+1 → en Auditoría aparece la fila "Configuración · Edición" con el usuario, la fecha y el cambio `lowStockThreshold`: N → N+1. (CA-3, el recorrido de la spec)
  - Cambiar el precio de una variante y el estado de un producto → filas "Edición" con el precio antes y después, y "Cambio de estado". "Ver historial" desde la variante lleva a la lista filtrada. (CA-3, HU-2)
  - Filtrar por entidad, por usuario y por fecha → solo las filas que corresponden. (CA-4)
  - El detalle no tiene botón de guardar ni de borrar; `PATCH` y `DELETE` a `/api/audit-log/:id` con la sesión del administrador → 403; `POST /api/audit-log` → 403. (CA-4)
  - Sin sesión, `GET /api/audit-log` → 401/403. (constitución VI)
  - Ninguna fila de la respuesta de `/api/audit-log` contiene las claves `password`, `hash`, `salt` ni `token`. La garantía de verdad es la prueba unitaria de `diffDocs`; no se cambia la contraseña del administrador de prueba para no romper las demás E2E. (CA-5)
- **Trigger (CA-4, CA-6)**: en `ci.yml`, después de aplicar las migraciones sobre el Postgres de CI, un paso con `psql` inserta una fila y comprueba que `UPDATE` y `DELETE` sobre `audit_log` fallan. Sin dependencias nuevas.
- **Lighthouse**: F-018 no cambia ninguna plantilla pública; Lighthouse CI sigue corriendo sobre las URLs actuales y debe seguir ≥ 90 × 4.

## Dependencias nuevas
Ninguna.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** no se toca la tienda. `getSettings()` es solo servidor y cacheado; cuando F-014/F-031 lo usen en la tienda no añade JavaScript. Lighthouse CI se ejecuta como siempre en el preview.
- [x] **II. Accesibilidad AA:** filtros con controles nativos y etiquetas, cambios como tabla con `caption` y cabeceras, errores visibles en el móvil, axe en Configuración, lista y detalle de la auditoría.
- [x] **III. SEO e i18n:** sin textos nuevos en la tienda. El panel en español (constitución VIII). `/admin` sigue con `noindex`.
- [x] **IV. Integridad del dominio:** no se toca el stock ni el dinero. El registro se escribe en la misma transacción que el cambio y es de solo inserción, igual que `stock_movement`. El umbral de envío solo se guarda aquí; el cálculo es de F-031, en el servidor.
- [x] **V. Pruebas unitarias + E2E:** ver "Pruebas". Lógica pura al 100 % de ramas. Cada prueba cita su `CA-n`.
- [x] **VI. Seguridad y privacidad:** autorización en el servidor (acceso de Payload, no solo la interfaz) y trigger en la base de datos. Sin contraseñas ni tokens en el registro. Dato personal mínimo (email del administrador), justificado arriba. Ningún valor por defecto contiene datos reales (repositorio público).
- [x] **VII. Simplicidad:** global y colección de Payload, hooks reutilizables, sin dependencias, sin cola, sin purga. Solo dos componentes propios del panel (filtros y tabla de cambios), justificados por accesibilidad y legibilidad.

## Dudas
- **D-1 (propuesta: sin valor por defecto):** `contactEmail` e `impressumAddress` no pueden tener un valor por defecto real porque el repositorio es público. Propuesta: vacíos, con la descripción "Obligatorio antes del lanzamiento", y F-053 / F-072 comprueban que estén rellenos. Alternativa: hacerlos obligatorios ya (el primer guardado de la configuración exigiría tenerlos).
- **D-2 (propuesta: 30 días):** días de antelación para pasar a oferta (F-014 CA-1). Propuesta: 30, igual que el aviso de caducidad. La clienta lo puede cambiar en cuanto esté desplegado.
- **D-3 (propuesta: vacío = sin envío gratis):** el umbral real depende de N-08 / TA-01, que sigue abierta. Propuesta: vacío hasta que la clienta lo decida, y F-031 trata el vacío como "no hay envío gratis". Alternativa: un valor provisional (p. ej. 80 CHF).
- **D-4 (propuesta: solo las entidades que ya existen):** se auditan `products`, `variants` y `settings`; categorías, fotos y usuarios no los pide CA-3 y quedan fuera. Alternativa: auditarlos también (es una línea por colección).

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| `previousDoc` de Payload llega con otra profundidad que `doc` y genera cambios falsos en relaciones | `diffDocs` normaliza las relaciones a id; prueba unitaria del caso |
| En un guardado con `locale: "all"` (seed) llegan todos los idiomas a la vez | `diffDocs` aplana `{ es, en, de }` como rutas `name.de`; `locale` queda vacío |
| El trigger rompe algo de Payload que actualice filas por su cuenta (p. ej. `updatedAt`) | `timestamps: false` y sin relaciones en la colección. Se comprueba en la E2E y en el paso de CI |
| El filtro propio no se entiende con la lista de Payload 3.93 (nombres de los parámetros `where`) | Se prueba al empezar. Alternativa: una vista propia de la lista con la API local |
| Los avisos de error del global no se ven en el móvil (como en F-010) | Mismo patrón de error visible que `NativeSelect` |
| Perder el registro si se pierde la base de datos (PITR de pocos días) | Exportación periódica fuera de Neon, anotada en F-072 |
| Una feature futura olvida auditar su colección | Contrato escrito arriba y prueba de la lista de entidades; se revisa en cada plan |
