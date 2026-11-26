# F-011 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Aprobado (26-11-2026), con D-1…D-4 como se propusieron |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-011-variantes-imagenes` |

## Resumen técnico
F-010 dejó tres colecciones mínimas: `variants` (producto, SKU, precio, activa), `media` (foto con `alt` traducible y tamaños WebP) y el campo `images` del producto. F-011 las amplía:

1. **Atributos y valores en el producto** (tamaño, aroma, color; de 0 a 3). Con ellos, un botón **«Generar variantes»** crea las combinaciones que falten (2 × 2 = 4).
2. **Variantes completas**: valores de atributo, EAN, precio de referencia, peso, cantidad neta con unidad.
3. **Galería**: el campo `images` pasa a ser una lista de filas `{ foto, variantes }`, como mucho 10, que se reordena arrastrando; la primera es la principal.
4. **Subida directa** del navegador a Vercel Blob, con barra de progreso y un límite de 10 MB.

Toda la lógica nueva es pura y está en `src/domain/products/`, cubierta al 100 %: combinaciones, SKU sugerido, coherencia variante–atributos, precio por unidad y validaciones.

La tienda no cambia de aspecto: el selector de variantes y la galería son de F-022. Solo se adapta la lectura de la foto principal a la galería nueva.

## Modelo de datos

### `products` (cambios)
| Campo | Tipo | Idiomas | Notas |
|---|---|---|---|
| `options` | array, `maxRows: 3` | — | Atributos de variante del producto (CA-1). Sin filas = producto sin atributos |
| `options[].attribute` | select `size`, `scent`, `color` | no | Etiquetas en español: Tamaño, Aroma, Color. No se repite dentro del producto |
| `options[].values` | array, `minRows: 1` | — | Valores posibles del atributo |
| `options[].values[].code` | text | no | Clave estable: se genera desde la etiqueta en español con `slugify` (p. ej. `50-ml`, `lavanda`). No se puede cambiar si alguna variante lo usa |
| `options[].values[].label` | text | **sí** | Lo que verá el cliente: «Lavanda» / «Lavender» / «Lavendel». Obligatorio en los 3 idiomas para publicar |
| `gallery` | array, `maxRows: 10` | — | **Sustituye a `images`** (ver D-1). El orden es el de la tienda; la primera fila es la principal (CA-5) |
| `gallery[].image` | upload → `media` | no | Obligatorio |
| `gallery[].variants` | relationship → `variants`, hasMany | no | Ninguna, una o varias variantes de **este** producto (`filterOptions`). Se muestra con el componente de casillas que ya existe (`CheckboxRelationship`) |

El atributo `size` lleva etiquetas traducibles como los demás, aunque «50 ml» se escriba igual en los tres idiomas: así no hay un caso especial.

### `variants` (cambios)
| Campo | Tipo | Notas |
|---|---|---|
| `size`, `scent`, `color` | text | El `code` del valor elegido, o vacío. En el panel es un `<select>` nativo (el `NativeSelect` de F-010) con los valores del producto |
| `ean` | text | Opcional. GTIN-8, 12, 13 o 14 con dígito de control válido |
| `compareAtPrice` | number | Precio de referencia «antes», en CHF. Opcional; si existe, mayor que `price` (CA-2) |
| `weightGrams` | number, entero | Peso con envase, en gramos. Opcional (ver D-3) |
| `netQuantity` | number | Cantidad neta. Va junto con `netUnit`: o las dos o ninguna |
| `netUnit` | select `ml`, `g` | |
| `sku`, `price`, `active` | ya existen | `active` cubre CA-3 |

**Índice único** `(product, size, scent, color)`: dos variantes del mismo producto no pueden tener la misma combinación. Postgres trata los `NULL` como distintos, así que se guarda `''` en lugar de `NULL` en los atributos que el producto no usa, o la regla se comprueba en el hook (lo que resulte más limpio en la migración).

### `media` (cambios)
- `upload.mimeTypes` ya limita a JPEG, PNG y WebP. Se añade la comprobación de **10 MB** en el navegador, antes de subir, y en un hook `beforeValidate` sobre `filesize`, por si se salta el navegador (CA-7).
- Tamaños: se añade `w240` (miniaturas del panel y de la futura galería) a los `w480`, `w960` y `w1440` actuales, todos en WebP (CA-8).

### Migración
Una migración generada con `payload migrate:create` y revisada a mano:
- tablas nuevas de los arrays (`products_options`, `products_options_values`, `products_options_values_locales`, `products_gallery`) y columnas nuevas en `variants`;
- **copia de datos**: cada fila de `products_rels` del campo `images` pasa a `products_gallery` con el mismo orden; después se borran esas filas. En producción la base está vacía, pero los previews y el local tienen el producto de prueba;
- índice único de la combinación.

## Reglas de dominio (`src/domain/products/`)
- **`variant-combinations.ts`**
  - `combinations(options)` → todas las combinaciones de valores (producto cartesiano). Sin atributos → una sola combinación vacía (CA-1).
  - `missingCombinations(options, variants)` → las que aún no tienen variante.
  - `variantMatchesOptions(variant, options)` → la variante tiene un valor válido para cada atributo del producto y ninguno para los que no usa.
  - `affectedByRemoval(before, after, variants)` → variantes que se quedan con un valor o atributo que ya no existe (caso límite «se borra un atributo»).
- **`sku.ts`**: `suggestSku(baseSlug, codes, taken)` → `CREMA-ROSA-50-ML`, en mayúsculas, sin acentos, con `-2`, `-3`… si ya existe. `normalizeSku` (mayúsculas, sin espacios) antes de guardar, para que la unicidad no dependa de mayúsculas (CA-2).
- **`ean.ts`**: `isValidGtin(code)`, con dígito de control.
- **`unit-price.ts`**: `unitPrice(price, netQuantity, netUnit)` → precio por 100 ml o por 100 g, en céntimos, redondeado al céntimo (ver D-2). `null` si falta la cantidad.
- **`gallery.ts`**: `mainImage(gallery)` (la primera), `imagesForVariant(gallery, variantId)` (las asignadas a la variante y, si no tiene ninguna, todas), `MAX_PHOTOS = 10`.
- **`readiness.ts`** (amplía F-010): para publicar, cada valor de atributo tiene etiqueta en es, en y de; cada variante activa coincide con los atributos del producto; si hay atributos, hay al menos una variante activa con todos los valores. El texto alternativo en los 3 idiomas (CA-6) ya lo exige F-010; pasa a leerse de `gallery`.

## Comportamiento en el panel
- **Atributos (CA-1)**: bloque «Variantes» del producto con la lista `options`. Un hook `beforeChange` del producto rechaza atributos repetidos y genera `code` desde la etiqueta en español si está vacío.
- **Generar variantes (HU-1)**: botón «Generar variantes» bajo la lista de variantes (componente propio en `src/components/admin/GenerateVariants.tsx`). Pide un **precio inicial** (prellenado con el de la primera variante, si hay) y llama a `POST /api/products/:id/generate-variants` (solo usuarios del panel). El servidor crea, en una transacción, las combinaciones que falten con un SKU sugerido y ese precio, y devuelve cuántas creó. Las existentes no se tocan. Si el producto no tiene atributos y ya tiene una variante, no hace nada.
- **Coherencia de variantes**: un hook `beforeChange` de `variants` rechaza:
  - una combinación que no encaja con los atributos del producto;
  - una combinación repetida;
  - una segunda variante en un producto sin atributos: «Añade un atributo para tener más de una variante».
  - Los mensajes salen en español.
- **Borrar un atributo o un valor (caso límite)**: al guardar el producto, las variantes afectadas **se desactivan, nunca se borran**, y el panel avisa: «Se han desactivado 2 variantes que usaban "Rosa"». F-013 aún no tiene stock; cuando lo tenga, la regla es la misma, así que no hay que cambiarla.
- **Galería (CA-4, CA-5)**:
  - La fila 11 no se puede añadir (`maxRows`). Además, una validación en el servidor da el mensaje «Máximo 10 fotos por producto», también si llegan por la API.
  - Las filas se reordenan arrastrando o con «Mover arriba» y «Mover abajo» del menú de cada fila (teclado). La descripción del campo dice que la primera es la principal.
  - Al borrar una variante, un hook la quita de las filas de la galería.
- **Subida (CA-7)**: `vercelBlobStorage({ clientUploads: { access: soloUsuariosDelPanel } })`. El navegador sube el fichero directamente a Blob con un token de corta duración, sin pasar por la función, que tiene un límite de 4,5 MB. Payload crea el documento `media` solo cuando la subida termina: una subida interrumpida no deja ningún documento (caso límite). En local y CI, sin token, la subida sigue pasando por el servidor.
- **Barra de progreso (CA-7)**: el panel de Payload solo muestra un indicador de carga. Se añade un `<progress>` con etiqueta y porcentaje (anunciado con `aria-live="polite"` cada 25 %), alimentado por `onUploadProgress` de `@vercel/blob/client`. Hay que engancharlo al gestor de subida del plugin; ver riesgos.

## Tienda
- `getPublishedProduct` lee la foto principal de `gallery` en lugar de `images`. La página de producto se ve igual.
- El precio mostrado sigue siendo el de la primera variante activa, hasta F-022.
- `scripts/seed-data.ts`: el producto de prueba pasa a tener la galería y un atributo «Tamaño» con una variante, para que las E2E y Lighthouse de F-010 sigan valiendo.

## Pruebas
- **Unitarias (Vitest, 100 % de ramas en `src/domain/products/`)**:
  - `combinations`: 0, 1, 2 y 3 atributos; 2 × 2 = 4; sin atributos, una variante por defecto. (CA-1)
  - `missingCombinations` y `variantMatchesOptions`; `affectedByRemoval` al quitar un atributo o un valor. (CA-1, caso límite)
  - `suggestSku` con colisiones y acentos; `normalizeSku`. (CA-2)
  - `isValidGtin`: GTIN-8, 12, 13 y 14 válidos e inválidos. (CA-2)
  - Validación de `compareAtPrice` mayor que `price`; cantidad y unidad juntas. (CA-2)
  - `unitPrice`: ml y g, redondeo, cantidad que falta. (CA-2)
  - `mainImage`, `imagesForVariant`; límite de 10. (CA-4, CA-5)
  - `publishReadiness`: valor sin etiqueta en un idioma, variante que no encaja, foto sin `alt` en la galería. (CA-6)
- **E2E (Playwright, axe en cada pantalla, escritorio y móvil)**, con la sesión del administrador de prueba:
  - Crear un producto con Tamaño (50 ml, 100 ml) × Aroma (lavanda, rosa) → «Generar variantes» crea 4 con SKU sugerido; un SKU repetido da error. (CA-1, CA-2)
  - Rellenar EAN, precio de referencia, peso y cantidad neta en una variante; un EAN inválido y un precio de referencia menor que el precio dan error. (CA-2)
  - Desactivar una variante y comprobar que sigue en la lista. (CA-3)
  - Subir 3 fotos y ver la barra de progreso; asignar dos a «lavanda»; reordenarlas con el teclado y comprobar que la principal cambia. (CA-5, CA-7)
  - Llegar a 10 fotos: no se puede añadir la 11 y la API la rechaza con el mensaje. (CA-4)
  - Un fichero GIF y uno de más de 10 MB se rechazan. (CA-7)
  - Publicar falla si una foto no tiene `alt` en alemán. (CA-6)
  - Quitar el valor «rosa» → sus variantes quedan desactivadas, no borradas, con aviso. (caso límite)
  - La página de producto sirve `srcset` en WebP con varios anchos. (CA-8)
- **Lighthouse**: las mismas 6 URLs de producto de F-010; la página no cambia.

## Dependencias nuevas
Ninguna. `@vercel/blob` ya viene con `@payloadcms/storage-vercel-blob`. Si hace falta un parche para la barra de progreso, va en `patches/` como los de F-010.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** la tienda no añade JavaScript; la foto principal sigue con `srcset` y `fetchpriority`. Se mide en las 6 URLs de producto.
- [x] **II. Accesibilidad AA:**
  - En el panel: `<select>` y casillas nativos (componentes de F-010), reordenar también con teclado, y barra de progreso con etiqueta y anuncios moderados.
  - En la tienda: `alt` obligatorio en los 3 idiomas.
  - axe en todas las pantallas de las E2E.
- [x] **III. SEO e i18n:**
  - Etiquetas de los valores traducibles y obligatorias en los 3 idiomas para publicar.
  - Los textos del panel van en español, que es la norma del panel.
  - Los textos de la tienda no cambian.
- [x] **IV. Integridad del dominio:**
  - Precios en el servidor, en céntimos.
  - Las variantes nunca se borran por un cambio de atributos, así que el stock de F-013 y los pedidos de F-033 siempre encuentran su variante.
  - Generar variantes se hace en una transacción.
- [x] **V. Pruebas unitarias + E2E:** ver «Pruebas». Cada prueba cita su `CA-n`.
- [x] **VI. Seguridad y privacidad:**
  - El endpoint de generar variantes y el token de subida solo se dan a usuarios del panel.
  - El token de Blob queda en el servidor y el navegador recibe uno de un solo uso.
- [x] **VII. Simplicidad:**
  - Sin dependencias nuevas.
  - Los atributos son tres fijos, sin un sistema de atributos genérico.
  - La galería es un array de Payload y no una colección nueva.

## Dudas (resueltas el 26-11-2026: todas como se propusieron)
- **D-1: dónde se asigna una foto a sus variantes.**
  - *Propuesta:* en la galería del producto. Cada fila es una foto con casillas de variantes. Se ve todo en un sitio y se reordena en el mismo lugar (HU-2). El coste es cambiar `images` por `gallery`, con una migración que copia los datos.
  - *Alternativa:* cada variante elige sus fotos de entre las del producto. No hace falta migración, pero hay que abrir cada variante para asignar.
- **D-2: base del precio por unidad.**
  - *Propuesta:* por 100 ml o por 100 g, que es lo habitual en cosmética en Suiza y en la UE.
  - *Alternativa:* por litro o por kilo.
  - Aquí solo se calcula; dónde y cómo se muestra lo decide F-022.
- **D-3: peso obligatorio o no.**
  - *Propuesta:* opcional. El envío es por zonas con tarifa fija (F-031), así que el peso solo hará falta para etiquetas o aduanas.
  - *Alternativa:* obligatorio para publicar.
- **D-4: generar variantes.**
  - *Propuesta:* botón que crea las combinaciones que falten con un SKU sugerido y un precio inicial común, que luego se ajusta en cada variante.
  - *Alternativa:* sin generador. Se crean las variantes una a una eligiendo los valores.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| Con `clientUploads`, Payload podría no generar los tamaños WebP, porque el fichero no pasa por el servidor | Se prueba lo primero (T1). Si no los genera, un hook `afterChange` de `media` descarga el original de Blob y los genera con sharp en el servidor |
| El plugin no ofrece progreso de subida | T1 lo confirma. Si no, se añade con un parche mínimo en el gestor de subida del cliente (`pnpm patch`, como en F-010), que pasa `onUploadProgress` a un componente `UploadProgress` |
| Un fichero subido a Blob cuyo documento no llega a crearse queda huérfano | No es visible ni enlazado. Se deja anotado para una limpieza programada si llega a haber muchos; no compensa ahora (constitución VII) |
| La migración de `images` a `gallery` pierde el orden | Se copia con la columna `order` de `products_rels`, y una prueba de la migración en local compara el antes y el después con el producto de prueba |
| El índice único con atributos vacíos (`NULL`) no detecta duplicados | Valores vacíos como `''` o, si no encaja, la comprobación del hook es la que manda |
| axe en las pantallas nuevas del panel (arrays anidados de Payload) | Mismo criterio que en F-010: se arreglan, con componentes propios, CSS o parches, sin excepciones |

## Notas de la implementación (26-11-2026)
- **Combinación única:** no hay índice único en la base de datos. Postgres trata los vacíos como distintos y el hook de `variants` ya rechaza combinaciones repetidas, así que la regla vive solo en el servidor.
- **Aviso al quitar un atributo o un valor:** las variantes afectadas se desactivan en el `afterChange` del producto. El aviso sale en el bloque «Para publicar» («Variantes desactivadas (n): SKU…»), porque Payload no tiene avisos tras guardar.
- **Generar variantes:** tras crearlas, la página se recarga para que la lista de variantes y las casillas de cada foto las incluyan. El mensaje de resultado se guarda en `sessionStorage` y se muestra después de recargar.
- **Límite de 10 fotos:** el panel oculta «Añadir Foto» al llegar a 10 (`maxRows`). La API lo rechaza con su propio mensaje («Máximo 10 fotos por producto.») desde un hook `beforeValidate`, porque el error de un campo solo diría que «Fotos» no es válido.
- **10 MB:** el navegador lo comprueba antes de subir (parche del gestor de subida del plugin de Blob). Las subidas que pasan por el servidor (local, API) se comprueban en `beforeOperation` sobre el fichero original, antes de convertirlo a WebP.
- **Barra de progreso:** parche mínimo de `@payloadcms/storage-vercel-blob` que pasa `onUploadProgress` y emite el evento `sijou:upload-progress`; el campo `UploadProgress` de `media` lo muestra con `<progress>` y un anuncio cada 25 %. Solo existe en Vercel (subida directa); en local la subida pasa por el servidor sin progreso.
- **Accesibilidad del panel (sin excepciones, como en F-010):**
  - Campos propios: `VariantValueSelect` (atributos de la variante), `ProductReference` (producto de la variante, en lugar del react-select sin etiqueta).
  - `CheckboxRelationship` gana `admin.custom.sameDocument` para listar solo las variantes del producto.
  - Parche de `@payloadcms/ui`: nombre accesible para el menú de cada fila de un array, el menú copiar/pegar del array y el asa de arrastre («Mover»).
  - CSS: contraste de «Añadir …» y de los metadatos de la foto, y 24 px en esos botones y en el desplegable de la navegación.
- **Datos de prueba:** el producto de ejemplo pasa a la galería, sin atributos (una variante por defecto). La E2E crea su propio producto con 2 × 2 atributos.
- **Error de EAN en el panel:** Payload devuelve el error del campo como «El siguiente campo es inválido: EAN». La E2E comprueba ese rechazo por la API; la edición correcta de la variante se prueba en el formulario.
