# F-020 — Tareas

Rama `feat/F-020-estructura-publica`. Pendiente de aprobar el plan.

- [ ] T1 `buildMenu` en `src/domain/catalog/menu.ts` y `src/lib/cart-count.ts`, con pruebas (100 % en el dominio). (CA-3, CA-8)
- [ ] T2 Comprobar al empezar el 404 de `/de/no-existe` en el primer acceso sin caché (D-5) y medir el JavaScript inicial actual del inicio.
- [ ] T3 Rutas nuevas en `routing.ts` (productos, destacados, ofertas, búsqueda, cuenta, carrito) y mensajes en es, en, de.
- [ ] T4 Casilla `showInMenu` en colecciones, `featuredCollection` en Configuración y migración `…_public_structure`. (CA-3, D-1, D-2)
- [ ] T5 `getMenu(locale)` en caché y `PageShell` con cabecera y pie; todas las páginas públicas lo usan. (CA-1, CA-4, CA-6)
- [ ] T6 [P] `MobileMenu` (panel sobre `Dialog`) y desplegables de escritorio con Popover API. (CA-2, CA-3, HU-1)
- [ ] T7 [P] `CartCount` con región viva. (CA-8)
- [ ] T8 Páginas mínimas: todos los productos, destacados, ofertas, búsqueda, cuenta y carrito (`noindex` las tres últimas). (D-1, D-4)
- [ ] T9 404 con búsqueda, `error.tsx`, `global-error.tsx` y `/catalog/error`. (CA-5)
- [ ] T10 E2E `e2e/layout.spec.ts` en escritorio y móvil, con axe. (CA-1…CA-8)
- [ ] T11 Lighthouse: URLs nuevas en los 3 idiomas y aserción `resource-summary:script:size`. (CA-7)
- [ ] T12 Al terminar: spec y plan a "Hecha"/"Implementado", BACKLOG ✅.
