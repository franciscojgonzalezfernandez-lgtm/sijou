# F-010 — Tareas

Estado al 25-11-2026. Rama `feat/F-010-productos`.

- [x] Plan aprobado (D-1, D-2, D-3 como se propusieron).
- [x] Reglas de dominio en `src/domain/products/` (publicación, slug, precio, estados, imágenes) con 100 % de cobertura.
- [x] Localización de Payload (es, en, de; español por defecto; sin fallback).
- [x] Colecciones `products`, `variants`, `categories`, `media` y migración `20261124_021434_products`.
- [x] Regla de publicación en el servidor con la lista de lo que falta (CA-2, CA-4). Slug por idioma generado, editable y único (CA-6). Archivados fuera de la lista por defecto (CA-5). Borrado con sus variantes (CA-8).
- [x] Vercel Blob para las fotos en Vercel; disco en local. Tamaños WebP generados por Payload (D-2).
- [x] Página de producto mínima en `/en/products`, `/de/produkte`, `/es/productos` con canonical, hreflang y caché invalidada por hooks.
- [x] Datos de prueba: producto de ejemplo publicado (`scripts/seed-data.ts`).
- [x] Lighthouse: páginas del producto de ejemplo en previews y en local.
- [x] Contraste y tamaño de botones del panel corregidos con CSS.
- [x] E2E de la tienda (3 idiomas × 3 dispositivos) en verde en local.
- [x] Decisión: arreglar los problemas de accesibilidad del panel sin excepciones (campos propios, funcionalidad de Lexical, parches de Payload, CSS).
- [x] Recorrido completo del panel en verde en escritorio (3 de 3 repeticiones).
- [x] **Móvil en paralelo:** tras el guardado bloqueado (400), el panel a veces no mostraba el error en el campo Estado. Solución: bloque "Para publicar" en la barra lateral, que pide al servidor (`GET /api/products/:id/readiness`, solo usuarios del panel) la lista de lo que falta y se actualiza tras cada guardado. La E2E comprueba la lista en ese bloque.
- [x] Secretos `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en GitHub.
- [x] PR #16 (borrador): CI en verde; Lighthouse 97–100 en las 6 URLs del preview (Perf 99 en producto: LCP simulado de la foto, explicado en plan.md).
- [ ] Merge.
- [ ] Al terminar: spec y plan a "Hecha"/"Implementado", BACKLOG ✅.
