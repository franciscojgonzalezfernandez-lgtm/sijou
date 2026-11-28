# F-020 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Propuesto (28-11-2026), pendiente de aprobación (D-1…D-5) |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-020-estructura-publica` |

## Resumen técnico
Se sustituye la cabecera provisional (`SiteHeader`: logo e idiomas) por el marco completo de la tienda: **cabecera**, **menú** (panel en móvil, barra con desplegables en escritorio), **pie** y páginas de **error 404 y 500** en es, en y de.

Todo se renderiza en el servidor. Los datos del menú (árbol de categorías publicadas y colecciones del menú) se leen con la caché que ya existe (`"use cache"`, etiqueta `catalog`), así que el marco no hace la página dinámica. Solo hay dos islas de cliente, pequeñas: el panel del menú en móvil (sobre el `Dialog` nativo de F-004) y el contador del carrito (CA-8). Los desplegables de escritorio usan la **Popover API** con `popovertarget`, sin JavaScript propio.

La construcción del menú (qué entra, en qué orden, con qué URL) es una función pura en `src/domain/catalog/menu.ts`, al 100 % de ramas.

Cada página pública envuelve su contenido en un componente **`PageShell`** (cabecera + `main#main` + pie), porque el selector de idioma necesita las URLs traducidas de cada página (slugs de la base de datos) y el layout no las conoce. `not-found` y `error` usan las URLs del inicio.

## Cabecera (CA-1)
Orden en el HTML (y de tabulación): enlace "Saltar al contenido" (ya existe, F-004), logo, menú, búsqueda, cuenta, carrito, idioma.

- **Móvil (< 1024 px):** botón "Menú" (icono + texto visible), logo centrado, y a la derecha búsqueda (icono que lleva a la página de búsqueda), cuenta y carrito con su número. El selector de idioma va dentro del panel y en el pie.
- **Escritorio (≥ 1024 px):** logo, barra de navegación (`nav` "Principal"), campo de búsqueda (formulario `GET` a la página de búsqueda, con `<label>` visible para lectores y `type="search"`), cuenta, carrito e idiomas.
- Todos los objetivos táctiles miden 44 × 44 px como mínimo (F-004 CA-4). Iconos SVG en línea, decorativos (`aria-hidden`), siempre con texto accesible.
- La cabecera no es fija (sticky) en esta feature: no tapa contenido al hacer zoom ni con el foco (WCAG 2.4.11) y no añade JS.

## Menú (CA-2, CA-3, HU-1)
- **Contenido (`buildMenu`):**
  1. Enlaces fijos, siempre: **Todos los productos**, **Destacados** y **Ofertas** (ver D-1).
  2. El árbol de categorías publicadas y visibles en ese idioma (`isCategoryVisible` de F-012), hasta 3 niveles, ordenado por `position` y nombre.
  3. Las **colecciones del menú**: colecciones visibles con la casilla nueva "Mostrar en el menú" (ver D-2), ordenadas por nombre.
  - Sin categorías publicadas: solo los enlaces fijos (y las colecciones, si hay) (caso límite de la spec).
- **Móvil:** el botón abre un panel lateral sobre `<dialog>` + `showModal()` (el `Dialog` de F-004): el navegador guarda el foco dentro y hace inerte el resto, Escape cierra y el foco vuelve al botón (CA-2). Dentro, el árbol entero como listas anidadas, **todo desplegado**: cualquier categoría está a 2 toques (abrir el menú y tocarla) (HU-1). Al final del panel, el selector de idioma.
- **Escritorio:** una barra con los enlaces fijos y cada categoría raíz. Las raíces con subcategorías son un botón con `popovertarget` que abre su panel (`popover="auto"`: se cierra con Escape, al hacer clic fuera y al abrir otro, y el foco vuelve al botón), con un enlace a la propia categoría y sus niveles 2 y 3. Las colecciones del menú van en un último desplegable "Colecciones".
- Los enlaces marcan la página actual con `aria-current="page"`.

## Pie (CA-4)
- Datos de contacto de la configuración (F-018): nombre de la tienda, email de contacto (enlace `mailto:`) y dirección del Impressum.
- Selector de idioma (el mismo componente que la cabecera, F-003).
- Espacio para los enlaces a páginas del CMS y legales: lo rellenan F-050 (CA-7: qué páginas salen en el pie) y F-053 (CA-2). Hasta entonces no se pinta una lista vacía (ver D-3).
- Copyright con el año, en el idioma de la página.

## Búsqueda, cuenta y carrito (CA-1, CA-8)
Las páginas de destino llegan con F-023 (búsqueda), F-007/F-034 (cuenta) y F-030 (carrito). Para que la cabecera no tenga enlaces rotos, se crean ahora **páginas mínimas** con sus URLs definitivas, `noindex`, que esas features sustituyen (ver D-4):
- Búsqueda: `/en/search`, `/de/suche`, `/es/buscar`. Muestra el formulario y, si hay `q`, el texto "La búsqueda llega pronto" y enlaces a las categorías (lo mismo que pedirá F-023 CA-6 sin resultados).
- Cuenta: `/en/account`, `/de/konto`, `/es/cuenta`. Texto "Las cuentas de cliente llegan pronto".
- Carrito: `/en/cart`, `/de/warenkorb`, `/es/carrito`. "Tu carrito está vacío" y enlace a todos los productos.

**Contador del carrito (CA-8):** isla de cliente `CartCount` (< 1 kB). Lee el número de una cookie legible `cart_count`, que escribirá el servidor de F-030 cada vez que cambie el carrito, y escucha el evento `cart:change` del navegador para actualizarse sin recargar. El cambio se anuncia en una región `aria-live="polite"` ("Carrito: 3 artículos"). El enlace del carrito siempre lleva el número en su nombre accesible ("Carrito, 3 artículos"). Hasta F-030 el número es 0. El contrato (`src/lib/cart-count.ts`: nombre de la cookie, evento y `notifyCartChange(count)`) se prueba ya con Vitest y en la E2E disparando el evento.

## Errores (CA-5)
- **404:** `[locale]/not-found.tsx` (ya existe) con el marco completo, título, texto, enlace al inicio y **formulario de búsqueda**. Responde 404 (la URL de idioma no soportado ya responde 404 desde el proxy, F-012). `/de/no-existe` responde 404 en alemán.
  - Rutas con slugs de la base de datos (producto, categoría, colección) que no existen: con Cache Components, el primer acceso sin caché puede responder 200 + `noindex` mientras se transmite (ver notas de F-010/F-012). La E2E de CA-5 usa una ruta fija inexistente, que responde 404 siempre. Ver D-5.
- **500:** `[locale]/error.tsx` (componente de cliente que exige Next) con el marco reducido (logo y pie sin datos de la base de datos, para que no falle por la misma causa), texto, botón "Intentar de nuevo" (`reset()`), enlace al inicio y a la búsqueda. Más `app/global-error.tsx` para fallos en el propio layout, con sus textos en los 3 idiomas incluidos en el componente desde los mensajes (el layout que da los mensajes es lo que ha fallado).
- Para probar la 500 sin romper nada: la página interna del catálogo de componentes (F-004, `noindex`) gana una ruta `/catalog/error` que lanza un error a propósito.

## Accesibilidad (CA-6)
- Landmarks: `header` (banner), `nav` "Principal" (y `nav` "Idioma"), `main#main`, `footer` (contentinfo). Un solo `main` por página.
- "Saltar al contenido" es el primer elemento enfocable y lleva a `main`.
- Panel de menú: título visible "Menú", botón "Cerrar" con texto, foco atrapado por `<dialog>`, sin bloqueo del zoom.
- Contraste y tamaño según los tokens de F-004. axe sin violaciones en el inicio, la 404, la 500 y con el menú abierto (móvil y escritorio).

## Rendimiento (CA-7)
- Presupuesto de la constitución: JavaScript inicial por ruta pública < 100 kB gzip. Islas: `MobileMenu` (Dialog) y `CartCount`. Nada más del marco se hidrata.
- Se mide antes y después con el resumen de recursos de Lighthouse y se añade a `lighthouserc.cjs` una aserción `resource-summary:script:size` ≤ 100 kB en todas las URLs auditadas, para que el presupuesto deje de ser solo una norma escrita.
- La página inicial (todavía vacía) y las nuevas (búsqueda, carrito, cuenta, 404) entran en Lighthouse CI en los 3 idiomas: ≥ 90 × 4.

## Modelo de datos
- **`product-collections`**: casilla nueva `showInMenu` ("Mostrar en el menú", por defecto no). (D-2)
- **Configuración (F-018)**: relación nueva `featuredCollection` ("Colección de Destacados") en la pestaña Tienda. (D-1)
- Migración `…_public_structure` con las dos columnas.
- Ningún cambio de stock ni de dinero.

## Rutas y datos
- `src/i18n/routing.ts`: rutas nuevas `"/products"` (`/productos`, `/produkte`), `"/featured"` (`/destacados`, `/highlights`… ver D-1), `"/offers"` (`/ofertas`, `/angebote`), `"/search"`, `"/account"`, `"/cart"`. Sus primeros segmentos pasan a ser slugs reservados para categorías raíz (F-012 ya los lee de `pathnames`).
- `src/lib/navigation.ts`: `getMenu(locale)` con `"use cache"`, `cacheTag(CATALOG_TAG)` y `cacheLife("max")`; la fecha de visibilidad de las colecciones ajusta la vida de la caché como en F-012 (`nextVisibilityChange`).
- `src/domain/catalog/menu.ts`: `buildMenu(tree, collections, locale, now)` → `{ fixed, categories: MenuNode[], collections }`, con `MenuNode = { id, name, href, children }`. Reutiliza `isCategoryVisible`, `childrenOf`, `buildBreadcrumbs` (para el `href` de cada nivel) e `isCollectionVisible`.
- Mensajes nuevos en `messages/{es,en,de}.json`: `Header`, `Menu`, `Footer`, `Search`, `Cart`, `Account`, `Error`, y `NotFound.search`.

## Pruebas
- **Unitarias (100 % en `src/domain/catalog/menu.ts`):** árbol vacío (solo fijos), 3 niveles en orden, rama oculta que se quita entera, categoría sin traducción en ese idioma, colecciones fuera de fecha o sin `showInMenu`, `href` por idioma. `src/lib/cart-count.ts`: lectura de la cookie (vacía, no numérica, negativa) y evento.
- **E2E (`e2e/layout.spec.ts`, escritorio y móvil, axe en cada estado):**
  - CA-1: cabecera con logo (lleva al inicio), menú, búsqueda, cuenta, carrito con "0 artículos" e idiomas.
  - CA-2 / HU-1: en móvil, abrir con teclado, el foco queda dentro (Tab y Mayús+Tab), Escape cierra y el foco vuelve al botón; la subcategoría de ejemplo se alcanza con 2 toques.
  - CA-3: enlaces fijos y árbol de ejemplo en los 3 idiomas; una colección con "Mostrar en el menú" aparece y sin la casilla no.
  - CA-4: pie con los datos de contacto de la configuración e idiomas.
  - CA-5: `/de/no-existe` → 404 en alemán con enlace al inicio y búsqueda; `/es/catalogo/error` → página de error en español con "Intentar de nuevo".
  - CA-6: "Saltar al contenido" es el primer Tab y lleva el foco a `main`; un solo `main`, `header`, `nav`, `footer`.
  - CA-8: disparar `cart:change` con 3 → el enlace dice "Carrito, 3 artículos" sin recargar y la región viva lo anuncia.
  - Desplegables de escritorio: abrir con Enter, Escape cierra y devuelve el foco.
- **Lighthouse:** CA-7 con las URLs nuevas y la aserción de JavaScript.

## Dependencias nuevas
Ninguna.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** URLs nuevas en Lighthouse CI en los 3 idiomas, y aserción nueva del presupuesto de JavaScript.
- [x] **II. Accesibilidad AA:** landmarks, salto al contenido, `<dialog>` nativo para el panel, Popover API para los desplegables, objetivos de 44 px, axe en cada estado.
- [x] **III. SEO e i18n:** todos los textos en mensajes de next-intl o en la base de datos; rutas traducidas; páginas mínimas `noindex`; 404 real.
- [x] **IV. Integridad del dominio:** no toca stock ni dinero. El contador del carrito solo muestra un número; F-030 lo calcula en el servidor.
- [x] **V. Pruebas:** unitarias del menú al 100 %, E2E de CA-1…CA-8 en móvil y escritorio.
- [x] **VI. Seguridad y privacidad:** la cookie `cart_count` es solo un número, sin datos personales; sin terceros.
- [x] **VII. Simplicidad:** dos islas de cliente; desplegables sin JS propio; sin mega-menú (fuera de alcance).

## Dudas
- **D-1 (propuesta: rutas fijas, con páginas mínimas ahora):** los enlaces fijos llevan a `/es/productos`, `/es/destacados` y `/es/ofertas` (en: `/products`, `/featured`, `/offers`; de: `/produkte`, `/highlights`, `/angebote`). Ahora son páginas mínimas como las de F-012: todos los productos publicados; los productos de la colección elegida en Configuración como "Destacados" (F-021 CA-5b dice que es una colección gestionada desde el panel); y "Ofertas" con el texto "Ahora no hay ofertas" hasta F-014. F-021 las amplía con la rejilla y el orden. Alternativa: que los enlaces lleguen con F-021 y F-020 deje el menú sin ellos.
- **D-2 (propuesta: casilla "Mostrar en el menú" en la colección):** decide qué colecciones son "destacadas" para el menú (CA-3). Alternativa: una lista ordenada de colecciones en Configuración.
- **D-3 (propuesta: el pie deja el hueco de las páginas a F-050/F-053):** sin páginas CMS ni legales todavía, el pie muestra contacto, idiomas y copyright. F-050 (CA-7) y F-053 (CA-2) añaden sus enlaces. Alternativa: una lista de enlaces a mano en Configuración ahora, que luego habría que migrar.
- **D-4 (propuesta: páginas mínimas `noindex` de búsqueda, cuenta y carrito, y contador por cookie + evento):** la cabecera tiene sus enlaces definitivos desde ya, sin enlaces rotos. Alternativa: ocultar búsqueda, cuenta y carrito hasta que existan sus features (CA-1 quedaría a medias).
- **D-5 (propuesta: la E2E de 404 usa una ruta fija):** `/de/no-existe` no corresponde a ninguna categoría y la resuelve la ruta comodín de categorías (F-012), que con Cache Components puede contestar 200 + `noindex` en el primer acceso. Se comprueba al empezar; si pasa, `[...path]` comprueba la ruta antes de transmitir (la lista de rutas de categorías ya está en caché, `getCategoryPaths`) y llama a `notFound()` antes del primer byte, para que el 404 sea real también en el primer acceso.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| Popover API: en Safari antiguo no funciona | Safari ≥ 17 la tiene; en escritorio sin soporte la raíz sigue siendo un enlace a su página de categoría, que lista las subcategorías (F-012). En móvil se usa el panel, que no depende de ella |
| El marco hace dinámicas todas las páginas | Los datos del menú y del pie van en `"use cache"`; el contador lee la cookie en el cliente, no en el servidor |
| `error.tsx` no se puede renderizar con datos de la base de datos | Usa solo mensajes y el logo; `global-error.tsx` lleva sus textos incluidos |
| Lighthouse con más URLs tarda más | Se mide en el primer PR; si molesta, las páginas mínimas se auditan en un solo idioma |
| El menú crece con muchas categorías | El panel móvil hace scroll; el catálogo previsto tiene decenas de categorías (F-012) |
