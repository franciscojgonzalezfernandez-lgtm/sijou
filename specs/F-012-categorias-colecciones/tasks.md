# F-012 — Tareas

Rama `feat/F-012-categorias-colecciones`. Pendiente de aprobar el plan (D-1, D-2, D-3).

- [ ] T1 Reglas de dominio en `src/domain/catalog/`: árbol (`depthOf`, `subtreeHeight`, `validateParent`, `childrenOf`), breadcrumbs y rutas, publicación, visibilidad de categorías y colecciones, `nextVisibilityChange`, productos sin categoría y slugs reservados. 100 % de ramas. (CA-1, CA-3, CA-4, CA-5, CA-6)
- [ ] T2 Comprobar al empezar: reordenar con teclado en el campo de relación hasMany, axe en las pantallas nuevas del panel y cascada de `products_rels` al borrar. (CA-4, CA-5)
- [ ] T3 Ampliar `categories`: `parent`, `position`, `status`, `description`, `headerImage`, `seo`, `breadcrumb` virtual; validación del padre, regla de publicación, slugs reservados y bloqueo del borrado con hijas. (CA-1, CA-3, CA-5, CA-6)
- [ ] T4 [P] Colección `product-collections` con sus campos, productos ordenados, fechas con validación y regla de publicación. (CA-2, CA-4, CA-6)
- [ ] T5 Migración `…_categories_collections` (con las categorías existentes a `published`), revisada antes de aplicarla.
- [ ] T6 Bloque "Al borrarla" y endpoint `GET /api/categories/:id/delete-impact`. (CA-5)
- [ ] T7 [P] `OrderedRelationship` solo si T2 lo pide. (CA-4)
- [ ] T8 `src/lib/navigation.ts` con caché, etiqueta `catalog` y `cacheLife` por fechas; `expireCatalog` en los hooks. (CA-4, CA-6)
- [ ] T9 Páginas mínimas de categoría (`[...path]`) y colección (`/collections`, `/kollektionen`, `/colecciones`), metadatos y mensajes en es, en, de. (CA-1, CA-4, CA-6)
- [ ] T10 Seed: categoría y subcategoría de ejemplo publicadas, colección "Favoritos".
- [ ] T11 E2E `e2e/categories.spec.ts` en escritorio y móvil, con axe. (CA-1…CA-6)
- [ ] T12 Lighthouse: categoría y colección de ejemplo en los 3 idiomas en `lighthouserc.cjs`; ≥ 90 × 4 en el preview.
- [ ] T13 Al terminar: spec y plan a "Hecha"/"Implementado", BACKLOG ✅.
