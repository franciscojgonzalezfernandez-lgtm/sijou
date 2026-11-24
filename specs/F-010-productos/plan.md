# F-010 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Aprobado (24-11-2026) · En curso |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-010-productos` |

## Resumen técnico
Se activa la **localización de Payload** (es, en, de; contenido por defecto en español) y se crea la colección `products` con sus campos traducibles, un campo `status` propio (`borrador`, `publicado`, `oculto`, `archivado`) y una regla de publicación en el servidor: al guardar con `publicado`, un hook lee el producto en los 3 idiomas y, si falta algo, bloquea el guardado con la lista de campos e idiomas que faltan (CA-4). La regla es una función pura en `src/domain/products/`, cubierta al 100 %.

CA-2 exige categoría, variante con precio y SKU, y foto, que son de F-011 y F-012. Para que la publicación funcione de verdad desde F-010 (y la E2E pueda publicar), se crean **versiones mínimas** de `categories`, `variants` y `media`, que F-011 y F-012 amplían sin cambiar su forma (ver D-1).

En la tienda se añade una **página de producto mínima** (`/en/products/[slug]`, `/de/produkte/[slug]`, `/es/productos/[slug]`), con estilos sencillos y provisionales hasta F-004 y F-022, para cumplir "verlo en la tienda en los 3 idiomas".

## Modelo de datos

### Localización (`payload.config.ts`)
- `localization: { locales: ["es", "en", "de"], defaultLocale: "es", fallback: false }`. Español por defecto porque la administradora escribe primero en español (HU-1, CA-3). La tienda sigue teniendo EN como idioma por defecto (F-003): son cosas distintas.
- `fallback: false`: un texto que falta en alemán no se rellena con el español, ni en la tienda ni en la comprobación de publicación.
- Los idiomas salen de `src/i18n/locales.ts` (una sola lista para la tienda y el panel).

### `products` (nueva)
| Campo | Tipo | Idiomas | Notas |
|---|---|---|---|
| `name` | text | sí | Obligatorio en el idioma que se guarda |
| `slug` | text | sí | Se genera desde `name` si está vacío. Editable. Único por idioma (CA-6) |
| `shortDescription` | textarea | sí | |
| `description` | richText (Lexical) | sí | |
| `inci` | textarea | sí | Ingredientes INCI |
| `usage` | textarea | sí | Modo de uso |
| `warnings` | textarea | sí | |
| `allergens` | textarea | sí | |
| `certifications` | textarea | sí | Texto (CA-1) |
| `pao` | text | sí | Caducidad tras abrir, p. ej. "12 meses" |
| `status` | select | no | `draft`, `published`, `hidden`, `archived` (etiquetas en español). Por defecto `draft`. En la barra lateral |
| `restockType` | select | no | `replenishable`, `limited` (CA-7). Obligatorio, por defecto `replenishable` |
| `categories` | relationship → `categories`, hasMany | no | |
| `images` | upload → `media`, hasMany | no | El orden de la lista es el orden de las fotos; la primera es la principal. F-011 añade el límite de 10 y la asignación a variantes |
| `variants` | join ← `variants.product` | — | Lista y alta de variantes desde la ficha del producto |

Los valores de `status` y `restockType` se guardan en inglés (código) y se muestran en español en el panel.

### `variants` (nueva, mínima)
`product` (relación obligatoria), `sku` (text, obligatorio, único en toda la tienda), `price` (number, CHF, > 0, máximo 2 decimales), `active` (checkbox, por defecto sí). Es una colección propia y no un array dentro del producto porque el stock (F-013), los pedidos (F-033) y las reservas (F-060) necesitan apuntar a una variante con una clave estable. F-011 añade atributos, EAN, precio de referencia, peso y cantidad neta.

### `categories` (nueva, mínima)
`name` y `slug` traducibles. F-012 añade el árbol, textos, banner, SEO y estados.

### `media` (nueva, mínima)
Colección de subida con `alt` traducible. Tamaños generados por Payload con sharp al subir (WebP, 480, 960 y 1440 px de ancho) (ver D-2). Almacenamiento: **Vercel Blob** con `@payloadcms/storage-vercel-blob` en Vercel (prefijo distinto para previews y producción), y disco local (`media/`, en `.gitignore`) en desarrollo y CI cuando no hay `BLOB_READ_WRITE_TOKEN`. Las URLs de Blob son públicas y se sirven directamente (`disablePayloadAccessControl`).

### Precios
El precio se guarda en CHF con 2 decimales como mucho. Cualquier cálculo en el dominio pasa a céntimos enteros (`toRappen`) para no arrastrar errores de coma flotante (constitución IV).

### Migraciones
Una migración nueva generada con `payload migrate:create`: tablas de las 4 colecciones, sus tablas `_locales` y `_rels`, y los índices únicos. Se aplica en el build de Vercel como ya hace `scripts/vercel-build.sh`.

## Reglas de dominio (`src/domain/products/`)
- **`publishReadiness(product)`** → `{ ready: boolean, missing: { field, locale? }[] }`. Comprueba, por idioma (es, en, de): `name`, `slug`, `shortDescription`, `description` (un Lexical vacío cuenta como vacío). Y además: ≥ 1 categoría, ≥ 1 variante activa con SKU y precio > 0, ≥ 1 foto, y texto alternativo en los 3 idiomas en cada foto (lo pide F-011 CA-6; se adelanta porque sin él la tienda pintaría imágenes sin `alt`). Función pura, 100 % de ramas. (CA-2)
- **`formatMissing(missing)`** → mensajes en español para el panel, agrupados por idioma: "Falta en alemán: nombre, descripción corta". (CA-4)
- **`slugify(text)`**: minúsculas, sin acentos (NFD), `ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`, todo lo que no sea letra o número pasa a `-`, sin guiones repetidos ni en los extremos. Sin dependencias. (CA-6)
- **`toRappen(price)`** y validación de "máximo 2 decimales".
- **`isVisibleInStore(status)`**: solo `published`. (CA-5)

## Comportamiento en el panel
- **Guardar como borrador** con solo el español: permitido (CA-3). La única validación de campo es `name` en el idioma que se guarda.
- **Publicar**: elegir `publicado` y guardar. Un hook `beforeChange` junta los datos que llegan (idioma actual) con el producto guardado en todos los idiomas (`locale: "all"`), lee sus variantes, categorías y fotos, y llama a `publishReadiness`. Si no está listo, lanza un `ValidationError` de Payload con la lista; el panel la muestra y no guarda nada (CA-4).
- **Slug único por idioma**: validación en el servidor que busca otro producto con el mismo slug en ese idioma. Se confirmará en la implementación si el índice único de Payload sobre un campo localizado ya es por idioma; si no, la validación es la que manda.
- **Archivados** (CA-5): `admin.baseFilter` oculta `archived` de la lista por defecto. Para verlos, la lista tiene un filtro por estado (comprobar en la implementación que el filtro explícito puede saltarse el base; si no, una vista "Archivados" aparte).
- **Borrar** (CA-8): Payload ya pide confirmación explícita al borrar. Todavía no hay pedidos: cuando F-033 cree las líneas de pedido, apuntarán a la variante con `ON DELETE RESTRICT` y un hook `beforeDelete` del producto traducirá ese caso a "Tiene pedidos: archívalo en lugar de borrarlo". En F-010 se prueba el borrado con confirmación de un producto sin pedidos. Al borrar un producto se borran sus variantes.
- **Móvil** (CA-10): el panel de Payload es responsive. La E2E de edición corre también en el proyecto móvil.
- **Acceso**: todo el panel y la API REST siguen exigiendo sesión. La tienda lee con la API local de Payload en el servidor, filtrando por `published`.

## Rutas y caché de la tienda
- **Rutas traducidas** (`routing.ts`, `pathnames`): `/products/[slug]` → `/de/produkte/[slug]`, `/es/productos/[slug]`. El slug es el de cada idioma, sacado de la base de datos.
- **`src/app/(frontend)/[locale]/products/[slug]/page.tsx`**: nombre (h1), foto principal, precio de la primera variante activa (`formatPrice`), descripción corta y larga (Lexical → HTML en el servidor con el conversor de `@payloadcms/richtext-lexical`). Los campos opcionales (INCI, modo de uso…) se muestran solo si tienen texto. Si el producto no existe o no está publicado en ese idioma: `notFound()`.
- **Imágenes**: `<img>` con `srcset` y `sizes` a partir de los tamaños de Payload, `width`/`height` para evitar CLS, `fetchpriority="high"` en la principal. Sin optimización de imágenes de Vercel (ver D-2).
- **Metadatos**: título y descripción (la corta) por idioma, `canonical` y `hreflang` con `buildAlternates` usando los slugs de cada idioma. El selector de idioma usa esas mismas URLs. Los datos estructurados `Product` llegan en F-025.
- **Caché**: la consulta va en una función con `"use cache"` y `cacheTag("products")`. Un hook `afterChange`/`afterDelete` de `products`, `variants` y `media` invalida la etiqueta, así que publicar, ocultar o archivar se refleja en la tienda sin redesplegar.
- **`generateStaticParams`**: devuelve los productos publicados en cada idioma. Con Cache Components no puede devolver una lista vacía, así que si no hay ninguno devuelve un valor de relleno que acaba en `notFound()` (lo que indica la documentación de Next 16.4).
- **Estilos**: mínimos y provisionales (tipografía del sistema, una columna, contraste AA), hasta F-004 y F-022.
- Textos fijos de la página ("Precio", "Ingredientes", "Modo de uso"…) en `messages/{en,de,es}.json`, en el espacio de nombres `Product`.

## Datos de prueba (`scripts/seed.ts`)
Solo en previews y en local, como ahora. Añade, de forma idempotente: una categoría, una foto de ejemplo (fichero en `e2e/fixtures/`, sin derechos de terceros) con `alt` en los 3 idiomas, y un producto **publicado** y completo en los 3 idiomas con una variante. Así Lighthouse y las E2E tienen una página de producto conocida en cada preview.

## Pruebas
- **Unitarias (Vitest)**:
  - `publishReadiness`: producto completo → listo; cada campo obligatorio vacío en cada idioma → aparece en la lista; Lexical vacío; sin categoría, sin variante, variante inactiva, precio 0, sin SKU, sin foto, foto sin `alt` en un idioma. (CA-2, CA-4)
  - `slugify`: acentos, umlauts, `ß`, símbolos, espacios y guiones repetidos. (CA-6)
  - `toRappen` y decimales; `isVisibleInStore` con los 4 estados. (CA-5)
  - Mensajes: las claves nuevas de `Product` en los 3 idiomas (la prueba de paridad de F-003 ya lo cubre).
- **E2E (Playwright, en el preview, axe en cada `visit`)**, con sesión del administrador de prueba:
  - Crear un producto solo en español → se guarda como borrador. (CA-3, CA-1)
  - Intentar publicarlo → se bloquea y la lista nombra los campos que faltan en inglés y alemán, la categoría, la variante y la foto. (CA-2, CA-4)
  - Completar en y de, el slug se genera solo (CA-6), añadir categoría, variante y foto → publicar. (CA-2)
  - Verlo en `/en/products/…`, `/de/produkte/…`, `/es/productos/…` con su `lang`, `canonical` y `hreflang`. (CA-9: sin stock todavía, se ve igual)
  - Ocultar → 404 en la tienda. Archivar → 404 y desaparece de la lista por defecto del panel. (CA-5)
  - Tipo de reposición guardado. (CA-7)
  - Borrar un producto sin pedidos tras la confirmación. (CA-8)
  - El recorrido de edición también en el proyecto móvil. (CA-10)
  - Slug repetido en el mismo idioma → error; el mismo slug en otro idioma → permitido. (CA-6)
- **Lighthouse**: se añade la página del producto de prueba en los 3 idiomas a `lighthouserc.cjs` (6 URLs en total).

## Dependencias nuevas
| Paquete | Para qué | Impacto en el bundle |
|---|---|---|
| `@payloadcms/storage-vercel-blob` 3.93.0 | Guardar las fotos en Vercel Blob | Solo servidor y panel. Nada en la tienda |

Infraestructura: un **store de Vercel Blob** (`sijou-media`, región fra1) conectado al proyecto, que crea `BLOB_READ_WRITE_TOKEN`. El conversor de Lexical a HTML ya viene en `@payloadcms/richtext-lexical`.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** la página de producto es estática y cacheada, sin JavaScript propio, con imágenes de tamaño fijo y `srcset`. Se audita en los 3 idiomas en cada preview.
- [x] **II. Accesibilidad AA:** HTML semántico, `alt` obligatorio en los 3 idiomas para publicar, axe en la tienda y en las pantallas del panel que se visitan (ver riesgos).
- [x] **III. SEO e i18n:** slugs y rutas traducidas, `canonical`, `hreflang`, `lang`, textos fijos en mensajes y contenido en la base de datos.
- [x] **IV. Integridad del dominio:** sin stock ni dinero todavía. Precios en el servidor y cálculos en céntimos. Las variantes quedan listas para que el stock y los pedidos las referencien.
- [x] **V. Pruebas unitarias + E2E:** ver "Pruebas". Cada prueba cita su `CA-n`.
- [x] **VI. Seguridad y privacidad:** el panel y la API REST exigen sesión. El token de Blob solo en variables de entorno. Sin datos personales.
- [x] **VII. Simplicidad:** sin librerías nuevas en la tienda; las colecciones mínimas se crean una vez y se amplían, sin reescribirlas.

## Dudas
- **D-1 (resuelta: colecciones mínimas ya en F-010):** CA-2 depende de categorías, variantes y fotos, que son de F-011 y F-012. Propuesta: crear aquí sus versiones mínimas (las descritas arriba) para que la publicación funcione completa desde ya. Alternativa: en F-010 solo se comprueban los textos por idioma, y las comprobaciones de categoría, variante y foto se añaden en F-011 y F-012 (la E2E completa de CA-2 se cerraría en F-012).
- **D-2 (resuelta: tamaños generados por Payload):** las fotos se redimensionan a WebP al subirlas (sharp) y se sirven con `srcset`, sin usar la optimización de imágenes de Vercel, que cuenta contra la cuota de tu plan Pro. Alternativa: `next/image` con la optimización de Vercel (AVIF, menos trabajo, pero consume cuota en cada transformación).
- **D-3 (resuelta):** segmentos de la URL del producto: `/en/products/…`, `/de/produkte/…`, `/es/productos/…`.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| axe encuentra violaciones en pantallas del panel que son de Payload (no de nuestro código) | Se comprueba al empezar. Si las hay, se informa y se pide una excepción explícita (constitución II), limitada a esas reglas y a `/admin` |
| Activar la localización cambia el esquema de `users` | `users` no tiene campos traducibles; se revisa la migración generada antes de aplicarla |
| El índice único de un campo traducible no es por idioma | Validación propia en el servidor (ver "Slug único por idioma") |
| `baseFilter` impide ver los archivados | Vista "Archivados" aparte |
| Vercel Blob: coste y cuota en tu cuenta | El almacenamiento de unas decenas de fotos es mínimo. Previews y producción usan prefijos distintos para no mezclarse |
| Límite de 4,5 MB por petición en Vercel Functions | En F-010 las fotos se suben a través del servidor (las de prueba son pequeñas). F-011 activa la subida directa del navegador a Blob (CA-7 de F-011) |
| `generateStaticParams` sin productos publicados rompe el build | Valor de relleno que termina en `notFound()` |

## Notas de la implementación (25-11-2026)
- **axe en el panel (decidido 25-11-2026: arreglarlo de verdad, sin excepciones):** se corrige todo lo que fallaba en las pantallas que visitan las E2E:
  - Campos propios accesibles en `src/components/admin/`: `NativeSelect` (estado y tipo de reposición, `<select>` nativo con etiqueta y el error como texto visible enlazado con `aria-describedby`, porque el tooltip de Payload no se ve en el móvil) y `CheckboxRelationship` (categorías como casillas en un `fieldset`).
  - Editor Lexical: la funcionalidad `AccessibleNameFeature` enlaza la zona editable con la etiqueta del campo.
  - Parches de dependencias (`patches/`, con `pnpm patch`): en `@payloadcms/ui` (también en su bundle `dist/exports/client/index.js`, que es el que carga el panel) se pasa el `aria-label` de las casillas, se da nombre al botón "Más opciones", a los botones de editar, quitar y reordenar fotos, al botón de abrir en panel y a las flechas de paginación, y cada fila tiene la casilla "Seleccionar fila N". En `@payloadcms/next` las pestañas del documento dejan de ser un `<ul>` sin `<li>`.
  - CSS en `src/app/(payload)/custom.scss`: contraste, tamaño mínimo de 24 px y la barra de datos del documento sin scroll oculto en el móvil.
  - Pendiente: abrir incidencias en Payload con estos fallos (requiere tu permiso para publicar).
- **404 en streaming:** con Cache Components, la primera visita a un producto que no está en caché y no existe (o se acaba de ocultar) responde 200 con la página 404 y `<meta name="robots" content="noindex">`; las siguientes, 404. Lo mismo hace Next con cualquier `notFound()` dentro de contenido en streaming. La E2E comprueba la página y el `noindex`. Se revisa en F-025.
- **Vercel Blob:** store `sijou-media` (público, fra1) conectado a producción, preview y desarrollo. En local no se usa (`.env.local` sin token): las fotos van a `media/`.
- **Credenciales del administrador de prueba en GitHub:** las E2E del panel necesitan los secretos `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en GitHub (los mismos valores de prueba que en Vercel Preview). Sin ellos esas pruebas se saltan.
