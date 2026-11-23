# F-051 — Blog

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CMS-03; L-07 |
| Depende de | F-050, F-025 |

## Contexto
Artículos sobre las propiedades de los ingredientes, el uso de los productos y los rituales de bienestar. Es la principal fuente de tráfico SEO.

## Historias de usuario
- **HU-1** Como administradora, quiero publicar artículos en 3 idiomas y enlazarlos a productos.
- **HU-2** Como lector, quiero descubrir artículos por tema y llegar a los productos que se mencionan.

## Criterios de aceptación
- **CA-1** Artículo: título, slug, extracto, contenido enriquecido (el de F-050), imagen destacada con texto alternativo, categorías del blog, productos relacionados, fecha de publicación (se puede programar), autor y SEO, todo traducible.
- **CA-2** Para publicar hacen falta los 3 idiomas.
- **CA-3** Se pueden programar: un artículo con fecha futura se publica solo a esa hora.
- **CA-4** Hay un índice del blog con paginación y páginas por categoría del blog (Ingredientes, Uso, Rituales).
- **CA-5** El artículo muestra los productos relacionados como tarjetas con su precio y estado.
- **CA-6** JSON-LD `Article`, breadcrumbs, Open Graph y tiempo de lectura.
- **CA-7** No hay lista automática de palabras de riesgo. Las alegaciones de salud (L-07) se controlan en la revisión editorial.
- **CA-8** Cada artículo saca ≥ 90 en las 4 categorías de Lighthouse.

## Estrategia de pruebas
- Unitarias: tiempo de lectura y publicación programada.
- E2E: programar un artículo → se publica a su hora → aparece en el índice, la categoría y el sitemap; tarjeta de producto relacionado; axe.

## Casos límite y errores
- Si un producto relacionado se archiva, la tarjeta desaparece sin romper el artículo.

## Fuera de alcance
- Comentarios en los artículos.

## Dudas
- Ninguna.
