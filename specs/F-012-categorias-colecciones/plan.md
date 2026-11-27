# F-012 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Implementado (27-11-2026); aprobado el 27-11-2026 con D-1…D-3 como se propusieron |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-012-categorias-colecciones` |

## Resumen técnico
Se amplía la colección mínima `categories` de F-010 (sin cambiar su forma: `name` y `slug` siguen igual) con un campo `parent` (árbol), un campo `position` (orden entre hermanas), un `status` propio (`draft`, `published`, `hidden`), texto descriptivo, imagen de cabecera y SEO por idioma. Se crea una colección nueva, `product-collections` ("Colecciones" en el panel), con los mismos campos, la lista ordenada de sus productos y fechas opcionales de visibilidad.

Todas las reglas (profundidad del árbol, ciclos, breadcrumbs, publicación, visibilidad por fechas, productos que se quedan sin categoría) son funciones puras en `src/domain/catalog/`, cubiertas al 100 %. Los hooks de Payload solo leen los datos y las llaman.

Como hizo F-010 con la ficha de producto, se crean **páginas mínimas** de categoría y de colección en la tienda, con las URLs que fija F-021, para que las E2E puedan comprobar de verdad los breadcrumbs, la ocultación y el fin de visibilidad de una colección (ver D-1). F-021 las amplía con la rejilla, la agregación de subcategorías, la paginación y el estado de stock.

## Modelo de datos

### `categories` (se amplía)
| Campo | Tipo | Idiomas | Notas |
|---|---|---|---|
| `name` | text | sí | Ya existe. Obligatorio en el idioma que se guarda |
| `slug` | text | sí | Ya existe (`slugField`). Único por idioma en toda la colección. Además no puede coincidir con un segmento reservado de la tienda (ver "Slugs reservados") |
| `parent` | relationship → `categories` | no | Opcional. Vacío = categoría raíz. En la barra lateral |
| `position` | number | no | Orden entre hermanas, menor primero. Entero ≥ 0, por defecto 0 (ver D-2) |
| `status` | select | no | `draft`, `published`, `hidden` (etiquetas en español, con `NativeSelect` de F-010). Por defecto `draft` |
| `description` | richText (Lexical) | sí | Texto descriptivo. Con `AccessibleNameFeature` como en productos |
| `headerImage` | upload → `media` | no | Imagen de cabecera. Su texto alternativo es el `alt` traducible de `media` (F-010) |
| `seo.title` | text | sí | Grupo `seo`. Si está vacío, la tienda usa `name` |
| `seo.description` | textarea | sí | Si está vacío, la tienda no pone meta descripción inventada: usa el primer párrafo de `description` |
| `breadcrumb` | text, virtual | — | Solo lectura en el panel ("Rostro › Cremas › Noche"), calculado en `afterRead`. Columna de la lista |

Columnas por defecto en la lista: `breadcrumb`, `status`, `position`. Orden por defecto: `position`.

Las categorías que ya existen (la del seed) pasan a `published` en la migración, para que el producto publicado de ejemplo no cambie.

### `product-collections` (nueva)
Mismos campos que `categories`, salvo `parent`, `position` y `breadcrumb`, y además:

| Campo | Tipo | Idiomas | Notas |
|---|---|---|---|
| `products` | relationship → `products`, hasMany | no | El orden de la lista es el orden manual (CA-4). Payload guarda el orden en la columna `order` de la tabla `_rels` |
| `visibleFrom` | date (fecha y hora) | no | Opcional. Inicio de visibilidad, incluido |
| `visibleUntil` | date (fecha y hora) | no | Opcional. Fin de visibilidad, excluido. Si hay las dos, `visibleUntil` > `visibleFrom` |

Las fechas se guardan en UTC y se muestran en el panel en hora de Zúrich (`timezone` de Payload con `Europe/Zurich` como única opción y por defecto).

El slug de Payload es `product-collections` y no `collections` para no confundirlo con las colecciones de Payload en el código, los tipos generados y la API (`/api/product-collections`).

### Productos
No se toca `src/collections/Products.ts`: ya tiene `categories` como relación hasMany (CA-2). La pertenencia a colecciones se guarda en la colección, no en el producto, para conservar el orden manual. Así se evita además pisar los cambios de F-011, que se está planificando en paralelo sobre ese mismo fichero.

### Migración
Una migración nueva generada con `payload migrate:create` (`…_categories_collections`): columnas nuevas de `categories` y `categories_locales`, tablas `product_collections`, `product_collections_locales` y `product_collections_rels`, y una sentencia añadida a mano que pone `status = 'published'` en las categorías existentes. Se revisa antes de aplicarla y se aplica en el build de Vercel como siempre (`scripts/vercel-build.sh`). Si F-011 se fusiona antes, se regenera encima de la suya.

## Reglas de dominio (`src/domain/catalog/`)
Trabajan sobre un árbol en memoria: `CategoryNode = { id, parent: id | null, position, status, names, slugs }`. El catálogo tiene decenas de categorías, así que se lee entero (una consulta) y se calcula todo en memoria.

- **`MAX_DEPTH = 3`**.
- **`depthOf(tree, id)`**: 1 para una raíz.
- **`subtreeHeight(tree, id)`**: 1 para una hoja.
- **`validateParent(tree, id, newParent)`** → `ok` o un motivo: `self` (ella misma), `descendant` (una de sus descendientes, caso límite de la spec), `tooDeep` (profundidad del nuevo padre + altura de su subárbol > 3: mover una categoría con hijas cuenta también las hijas), `notFound`. (CA-1)
- **`buildBreadcrumbs(tree, id, locale)`** → `[{ id, name, path }]` desde la raíz, donde `path` son los slugs de cada nivel en ese idioma. (CA-1, y la usa F-021)
- **`resolveCategoryPath(tree, locale, segments)`** → la categoría cuya ruta de slugs coincide exactamente, o `null`. Una ruta con un slug válido colocado en otro nivel no resuelve.
- **`isCategoryVisible(tree, id, locale)`**: `published` y con nombre y slug en ese idioma, y todas sus antecesoras también visibles. Ocultar una categoría oculta su rama en la tienda sin cambiar el estado de las hijas. (CA-6)
- **`childrenOf(tree, id)`**: hijas ordenadas por `position` y después por nombre.
- **`taxonomyReadiness(doc)`** → `{ ready, missing: { field, locale }[] }`: `name` y `slug` en es, en y de. Común a categorías y colecciones. (CA-3, CA-4)
- **`formatTaxonomyMissing(missing)`**: mensajes en español agrupados por idioma, como `formatMissing` de F-010.
- **`isCollectionVisible(collection, locale, now)`**: `published`, nombre y slug en ese idioma, `visibleFrom ≤ now` (si existe) y `now < visibleUntil` (si existe). (CA-4, CA-6)
- **`nextVisibilityChange(collection, now)`** → segundos hasta la siguiente fecha que cambia la visibilidad, o `null`. La usa la caché (ver "Caché").
- **`productsLeftWithoutCategory(products, categoryId)`**: los productos cuya única categoría es la que se va a borrar. (CA-5)
- **`isReservedSlug(slug, locale)`**: los primeros segmentos de `pathnames` de `routing.ts` en ese idioma (`products`, `produkte`, `productos`, `catalog`, `katalog`, `catalogo`, `collections`, `kollektionen`, `colecciones`…). Se lee de la configuración de rutas, no de una lista copiada.

## Comportamiento en el panel
- **Árbol y movimientos (CA-1):** mover una categoría es cambiar su `parent`. El selector de `parent` ya excluye la propia categoría y sus descendientes (`filterOptions`), pero la regla que manda es la validación del servidor: el hook `beforeValidate` lee el árbol y llama a `validateParent`. Los errores salen en español en el campo: "No puede estar dentro de sí misma ni de una de sus subcategorías." o "Máximo 3 niveles: con sus subcategorías quedaría en el nivel 4."
- **Reordenar (CA-1):** se cambia `position`. Es un campo de número normal, que se usa con teclado y sin arrastrar (WCAG 2.5.7) (ver D-2).
- **Publicar (CA-3):** elegir `publicado` y guardar. Igual que en productos: un hook `beforeChange` junta lo que llega con lo guardado en todos los idiomas y, si falta algo, lanza un `ValidationError` con la lista completa en el campo `status`. Si en el móvil vuelve a pasar que el panel no muestra el error (ver notas de F-010), se generaliza `PublishChecklist` para que reciba la colección.
- **Ocultar (CA-6):** estado `oculto`. No se borra nada; las hijas y los productos siguen enlazados.
- **Borrar (CA-5):**
  - Un hook `beforeDelete` cuenta las hijas. Si hay alguna, rechaza el borrado con "Tiene subcategorías: muévelas o bórralas antes." y no se borra nada.
  - Los productos no se borran: la fila de `products_rels` que los une a la categoría desaparece por la clave foránea con `ON DELETE CASCADE` que genera Payload (se comprueba en la migración; si no la hubiera, el hook la quita dentro de la misma transacción).
  - El aviso: en la barra lateral de la categoría, un bloque "Al borrarla" (componente propio, como `PublishChecklist`) pide al servidor `GET /api/categories/:id/delete-impact` (solo usuarios del panel) y muestra si tiene subcategorías y qué productos se quedarían sin ninguna categoría, con enlace a cada uno. Así el aviso se ve **antes** de confirmar el borrado en el modal de Payload.
  - Un producto publicado que se queda sin categoría sigue publicado (ver D-3).
- **Colecciones (CA-4):** la lista de productos se ordena en el propio campo. Se comprueba al empezar que el campo de relación de Payload permite reordenar con teclado; si no, se usa un campo propio `OrderedRelationship` en `src/components/admin/` con botones "Subir", "Bajar" y "Quitar" con nombre accesible (ver riesgos).
- **Fechas (CA-4):** validación en el servidor de que el fin es posterior al inicio: "La fecha de fin debe ser posterior a la de inicio."
- **Acceso:** el panel y la API REST siguen exigiendo sesión. La tienda lee con la API local de Payload en el servidor.

## Rutas y caché de la tienda
### Páginas mínimas (D-1)
Con estilos de F-004, sin rejilla ni paginación (llegan en F-021):
- **Colección:** `/en/collections/[slug]`, `/de/kollektionen/[slug]`, `/es/colecciones/[slug]` (`pathnames` en `routing.ts`). Muestra nombre (h1), imagen de cabecera con su `alt`, texto descriptivo y la lista de productos publicados en el orden manual, con enlace a su ficha. Si no es visible ahora en ese idioma: `notFound()`.
- **Categoría:** `src/app/(frontend)/[locale]/[...path]/page.tsx`, con la URL de F-021 CA-1 (`/{locale}/rostro/cremas/noche`). Muestra breadcrumbs (`<nav aria-label>` con `<ol>` y `aria-current="page"` en el último), nombre (h1), imagen de cabecera, texto descriptivo, enlaces a las subcategorías visibles y los productos publicados que están directamente en ella. Si la ruta no resuelve o la categoría no es visible: `notFound()`. Las rutas fijas (`/products/…`, `/catalog`…) tienen prioridad sobre el comodín en Next, y los slugs reservados impiden que una categoría las tape.
- **Metadatos:** `seo.title` o el nombre; `seo.description` o el primer párrafo; `canonical` y `hreflang` con `buildAlternates` usando las rutas de cada idioma. El selector de idioma usa esas mismas URLs. Los datos estructurados `BreadcrumbList` llegan en F-025.
- Textos fijos ("Subcategorías", "Productos", "Ruta de navegación", "Todavía no hay productos") en `messages/{en,de,es}.json`, espacios de nombres `Category` y `Collection`.

### Caché
- Las lecturas van en `src/lib/navigation.ts` (fichero nuevo, para no chocar con los cambios de F-011 en `src/lib/catalog.ts`), con `"use cache"` y `cacheTag(CATALOG_TAG)`. Los hooks `afterChange`/`afterDelete` de `categories` y `product-collections` llaman a `expireCatalog()`, como ya hacen productos, variantes y fotos.
- **Fechas de visibilidad:** una invalidación por etiqueta no salta sola cuando llega una fecha. Por eso la función que lee una colección calcula `nextVisibilityChange` y, si hay una fecha futura, fija `cacheLife({ revalidate: s, expire: s })` con esos segundos. Al pasar la fecha la entrada ha caducado y la siguiente visita la vuelve a calcular. Sin fechas futuras, `cacheLife("max")`.
- **`generateStaticParams`:** categorías y colecciones visibles en cada idioma; con Cache Components no puede ser una lista vacía, así que, igual que en productos, un valor de relleno que acaba en `notFound()`.

## Datos de prueba (`scripts/seed-data.ts`)
Solo en previews y en local, idempotente. La categoría de ejemplo ("Cuidado facial") pasa a `published`, con texto descriptivo e imagen de cabecera, y una subcategoría publicada ("Cremas"). Una colección publicada sin fechas ("Favoritos") con el producto de ejemplo. Así Lighthouse y las E2E tienen páginas conocidas en cada preview.

## Pruebas
- **Unitarias (Vitest), 100 % de ramas en `src/domain/catalog/`:**
  - `validateParent`: raíz, nivel 2 y 3 válidos; nivel 4 rechazado; mover una rama de 2 niveles bajo un nivel 2 rechazado; ella misma; una descendiente directa y una nieta; padre inexistente. (CA-1)
  - `buildBreadcrumbs` y `resolveCategoryPath` en los 3 idiomas; ruta parcial, slug de otro nivel y slug de otro idioma no resuelven. (CA-1)
  - `taxonomyReadiness` y sus mensajes: completo; falta nombre o slug en cada idioma. (CA-3, CA-4)
  - `isCategoryVisible`: los 3 estados, antecesora oculta, falta el idioma. (CA-6)
  - `isCollectionVisible` y `nextVisibilityChange`: sin fechas, solo inicio, solo fin, las dos, justo en cada límite (inicio incluido, fin excluido). (CA-4, CA-6)
  - `productsLeftWithoutCategory`. (CA-5)
  - `isReservedSlug` en los 3 idiomas.
  - Mensajes: la prueba de paridad de F-003 cubre las claves nuevas.
- **E2E (Playwright, en el preview, axe en cada `visit`)**, `e2e/categories.spec.ts`, con la sesión del administrador de prueba, en escritorio y móvil. Los datos llevan un sufijo único y se borran al terminar:
  - Crear Rostro › Cremas › Noche desde el panel, completas en los 3 idiomas, y publicarlas. La página `/es/rostro/cremas/noche` muestra los breadcrumbs. (CA-1, CA-3)
  - Intentar publicar una categoría solo en español → bloqueado con la lista de lo que falta en inglés y alemán. (CA-3)
  - Intentar crear un cuarto nivel bajo Noche → error. Intentar mover Rostro dentro de Noche → error. (CA-1, caso límite)
  - Mover Noche directamente bajo Rostro → la página está en `/es/rostro/noche`, la antigua da 404. Cambiar `position` de dos hermanas → se ve el nuevo orden en los enlaces de subcategorías. (CA-1)
  - Asignar el producto de prueba a Noche y a otra categoría, y a dos colecciones → aparece en las 4 páginas. (CA-2)
  - Crear una colección con dos productos, invertir su orden con el teclado → la página los muestra en el nuevo orden. (CA-4)
  - Colección con fecha de fin unos 30 s en el futuro → se ve; tras esa hora → 404 (comprobando la página 404 y el `noindex`, por el comportamiento en streaming descrito en las notas de F-010). (CA-4)
  - Ocultar una categoría → su página y la de sus hijas dan 404; ocultar una colección → 404. Volver a publicarlas → se ven. (CA-6)
  - Intentar borrar Rostro (tiene hijas) → rechazado. Borrar Noche, con un producto que solo está en ella → el bloque "Al borrarla" lo nombra antes de confirmar, el producto sigue existiendo y ya no tiene esa categoría. (CA-5)
- **Lighthouse:** se añaden a `lighthouserc.cjs` la categoría y la colección de ejemplo en los 3 idiomas (12 URLs en total).

## Dependencias nuevas
Ninguna. No se usa `@payloadcms/plugin-nested-docs`: guarda los breadcrumbs copiados en cada documento y los reescribe en las descendientes en cada cambio, y con decenas de categorías es más simple calcularlos en memoria con funciones puras que se prueban al 100 %.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** páginas estáticas y cacheadas, sin JavaScript propio, imagen de cabecera con `srcset` y tamaño fijo. Se auditan en los 3 idiomas en cada preview.
- [x] **II. Accesibilidad AA:** breadcrumbs semánticos (`nav` + `ol` + `aria-current`), `alt` de la imagen de cabecera, orden y movimientos sin arrastrar (2.5.7), campos propios accesibles como en F-010, axe en la tienda y en las pantallas del panel visitadas.
- [x] **III. SEO e i18n:** slug, título y descripción SEO por idioma, segmento de colección traducido, `canonical`, `hreflang` y `lang`. Textos fijos en mensajes; contenido en la base de datos.
- [x] **IV. Integridad del dominio:** sin stock ni dinero. Borrar una categoría no borra productos; los cambios del árbol se validan en el servidor.
- [x] **V. Pruebas unitarias + E2E:** ver "Pruebas". Cada prueba cita su `CA-n`.
- [x] **VI. Seguridad y privacidad:** panel, API REST y el endpoint `delete-impact` exigen sesión. Sin datos personales ni secretos nuevos.
- [x] **VII. Simplicidad:** sin dependencias nuevas; reglas puras sobre un árbol en memoria; `position` numérico en lugar de un árbol arrastrable.

## Dudas
- **D-1 (propuesta: páginas mínimas en F-012):** la E2E de la spec pide comprobar que una colección "deja de verse" y CA-6 que se pueda ocultar, y eso solo se ve en la tienda. Propuesta: crear aquí las páginas mínimas de categoría y colección con las URLs de F-021, que F-021 amplía. Alternativa: F-012 solo en el panel y en el dominio, y las E2E de tienda de CA-4 y CA-6 se cierran en F-021.
- **D-2 (propuesta: `position` numérico):** reordenar con un campo "Orden" entre hermanas, que se usa con teclado. Alternativa: `orderable: true` de Payload, que permite arrastrar en la lista, pero ordena la lista plana (mezclando niveles) y hay que comprobar que tiene alternativa sin arrastrar para cumplir WCAG 2.5.7.
- **D-3 (propuesta: avisar y no despublicar):** si al borrar una categoría un producto publicado se queda sin ninguna, la spec pide avisar. Propuesta: el producto sigue publicado (se ve en su ficha y en las colecciones, pero en ninguna categoría) y el aviso lo nombra antes del borrado. Alternativa: pasarlo a borrador automáticamente, porque publicar exige al menos una categoría (F-010 CA-2).

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| El campo de relación hasMany de Payload solo reordena arrastrando (WCAG 2.5.7) o tiene fallos de axe | Se comprueba al empezar. Si falla, campo propio `OrderedRelationship` con botones Subir/Bajar/Quitar |
| La clave foránea de `products_rels` no borra en cascada | El hook `beforeDelete` quita la relación en la misma transacción |
| La caché con `cacheLife` calculado no caduca a tiempo en Vercel | La E2E de la fecha de fin lo comprueba en el preview. Si falla, la página de colección lee las fechas fuera de la caché (`connection()`), con la colección cacheada y la comprobación de la fecha en cada petición |
| La ruta comodín `[...path]` interfiere con otras rutas o con F-020 | Las rutas fijas tienen prioridad en Next; los slugs reservados impiden choques. Si F-020 cambia la estructura, se ajusta allí |
| Conflictos con F-011 (migraciones, seed) | No se tocan `Products.ts` ni `catalog.ts`. La migración y el seed se rebasan sobre F-011 si se fusiona antes |
| Pasar de 6 a 12 URLs alarga Lighthouse CI | Se mide el tiempo en el primer PR; si molesta, se audita un idioma por plantilla nueva y los 3 en el producto |
| Fechas en el límite y zona horaria | UTC en la base de datos, Europe/Zurich en el panel; inicio incluido y fin excluido, con pruebas en cada límite |

## Notas de implementación (27-11-2026)
- **Selector de categoría superior:** `NativeRelationship`, un `<select>` nativo con etiqueta que muestra la ruta ("Rostro › Cremas") y deja fuera la propia categoría y sus subcategorías. El widget de Payload (react-select) deja su campo sin nombre accesible.
- **Productos de una colección:** el campo hasMany de Payload solo reordena arrastrando y su campo de búsqueda no tiene nombre accesible, así que se hizo `OrderedRelationship` (T7): lista con botones "Subir", "Bajar" y "Quitar" con nombre propio, un `<select>` para añadir y un aviso `aria-live` de cada movimiento.
- **Fechas de visibilidad:** `ZurichDateTime`, un `<input type="datetime-local">` con etiqueta que se escribe en hora de Zúrich y se guarda en UTC (`src/domain/catalog/zurich-time.ts`, probado también en el cambio de horario). No se usa el `timezone` de Payload: su selector de fecha tampoco tiene nombre accesible.
- **Árbol en memoria:** los hooks leen las categorías con el adaptador de la base de datos (`payload.db.find`), no con la API local. `find({ locale: "all", req })` cambia `req.locale` para el resto del guardado y los datos acababan en otro idioma. El breadcrumb virtual reutiliza el árbol dentro de una petición.
- **Borrado:** la clave foránea de `products_rels` ya borra en cascada (comprobado en la migración de F-010), así que el producto pierde la categoría sin código extra.
- **404 de la tienda:** con la ruta comodín, `/en/fr` llega a la página de categoría, cuyo 404 se envía en streaming con estado 200 la primera vez (como el de producto, ver F-010). Para no romper F-003, `src/proxy.ts` responde 404 directamente a un prefijo de idioma que no servimos (`/fr`, `/pt-br/…`), con los textos de `NotFound`.
- **Caducidad de colecciones:** la lectura fija `cacheLife` hasta la siguiente fecha. Una vida de menos de 5 minutos saca esa lectura del prerender (se resuelve en cada petición), así que el cuerpo de la página va dentro de `<Suspense>`; el título, los metadatos y el selector de idioma usan otra lectura cacheada sin fechas (`getCollectionHead`). La primera visita después puede ver todavía la página anterior (revalidación en segundo plano); la E2E lo tiene en cuenta reintentando unos segundos.
- **API REST:** una escritura sin `?locale=` falla con "Nombre: Este campo es obligatorio." en categorías, colecciones y también productos (comportamiento previo de Payload con campos localizados obligatorios). Las E2E siempre mandan el idioma.
