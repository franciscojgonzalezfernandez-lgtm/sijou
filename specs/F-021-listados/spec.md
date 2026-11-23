# F-021 — Listados de categoría y colección

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-NAV-02, 03, 04; RF-CAT-09 |
| Depende de | F-012, F-020 |

## Contexto
Cada categoría y colección tiene su página, que lista sus productos con su estado de stock.

## Historias de usuario
- **HU-1** Como visitante, quiero ver los productos de una categoría y saber cuáles están disponibles.
- **HU-2** Como visitante, quiero entrar en las subcategorías desde la categoría padre.

## Criterios de aceptación
- **CA-1** URL: `/{locale}/{slug-categoría-traducido}` (con sus subniveles). Colecciones: `/{locale}/{coleccion}/{slug}`, con el segmento traducido.
- **CA-2** La página muestra breadcrumbs, título, banner (si lo hay), texto descriptivo, enlaces a las subcategorías y la rejilla de productos.
- **CA-3** Una categoría incluye los productos publicados de esa categoría y de todas sus subcategorías.
- **CA-4** Tarjeta de producto: foto principal, nombre, precio "desde X" si las variantes tienen precios distintos, precio rebajado si hay promoción, y una etiqueta de estado: "Agotado", "Se puede reservar" (si está activa F-060) o "Solo quedan X" (≤ 5).
- **CA-5** Orden por defecto: novedades primero. En las colecciones, el orden manual.
- **CA-5b** Listados fijos además de las categorías: **Todos los productos**, **Destacados** (colección gestionada desde el panel) y **Ofertas** (unidades en oferta por caducidad próxima, F-014, con su fecha de caducidad en la tarjeta).
- **CA-6** Paginación con enlaces reales (no scroll infinito), indexable, de 24 productos por página.
- **CA-7** Una categoría vacía muestra un mensaje y enlaces útiles, y lleva `noindex`.
- **CA-8** La página está cacheada y se revalida cuando cambian un producto, la categoría o el stock de alguno de sus productos.

## Estrategia de pruebas
- Unitarias: precio "desde", selección de la etiqueta de estado y agregación con las subcategorías.
- E2E: categoría padre con productos de una hija, paginación, etiqueta "Agotado" y axe.

## Casos límite y errores
- Una categoría oculta devuelve 404.

## Fuera de alcance
- Filtros y selector de orden (F-105).

## Dudas
- Ninguna.
