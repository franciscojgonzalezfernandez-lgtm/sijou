# F-025 — SEO técnico

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-SEO-01…07 |
| Depende de | F-021, F-022 |

## Contexto
Google debe entender cada página en cada idioma y mostrar resultados enriquecidos, como el precio y la disponibilidad.

## Historias de usuario
- **HU-1** Como responsable de la tienda, quiero que mis productos aparezcan en Google con su precio y su disponibilidad.
- **HU-2** Como administradora, quiero que el título y la descripción para Google se generen solos.

## Criterios de aceptación
- **CA-1** Título y meta descripción automáticos para cada producto, categoría, colección, artículo y página: título = nombre + marca, de 60 caracteres como máximo; descripción = descripción corta, de 155 caracteres como máximo, cortada en una palabra completa. El panel ofrece campos opcionales para sobrescribirlos a mano y posicionar mejor.
- **CA-2** URL canónica en todas las páginas. La paginación usa su propia URL canónica. Los parámetros (`?v=`, `?q=`) no generan URLs duplicadas indexables.
- **CA-3** `hreflang` es, en, de y `x-default` en todas las páginas indexables. Si una página no existe en algún idioma, no se enlaza a ese idioma.
- **CA-4** Sitemap XML por idioma, con un índice de sitemaps y `lastmod` reales. Incluye solo contenido publicado e indexable.
- **CA-5** `robots.txt`: permite la tienda y bloquea `/admin`, `/api`, la cuenta, el carrito, el checkout y la búsqueda. Enlaza al índice de sitemaps.
- **CA-6** JSON-LD: `Product` + `Offer` (precio en CHF; disponibilidad `InStock`, `OutOfStock` o `BackOrder`; `priceValidUntil` si hay promoción), `BreadcrumbList`, `Organization` + `WebSite` (con buscador), `Article` en el blog y `FAQPage` en las preguntas frecuentes. Todo pasa la validación de Rich Results.
- **CA-7** Open Graph y Twitter Card con una imagen de 1200×630 por producto (generada a partir de la foto principal).
- **CA-8** Cambiar un slug crea una redirección 301 de la URL antigua a la nueva. Las cadenas de redirecciones se acortan para que haya un solo salto.
- **CA-9** Las páginas no indexables (búsqueda, carrito, cuenta, categorías vacías, previews) llevan `noindex`, y todo el entorno de preview también.
- **CA-10** La categoría SEO de Lighthouse es ≥ 90 en todas las plantillas públicas.

## Estrategia de pruebas
- Unitarias: generación del título y la descripción (cortes y límites), construcción del JSON-LD y de los `hreflang`.
- E2E: validar el JSON-LD de una ficha con un esquema, sitemap de `/de`, 301 tras cambiar un slug, `noindex` en la búsqueda.

## Casos límite y errores
- Si un producto no tiene stock en ninguna variante, la disponibilidad es `OutOfStock`, o `BackOrder` si se puede reservar.

## Fuera de alcance
- Estudio de palabras clave (N-05). Google Shopping: por ahora no, quizá más adelante.

## Dudas
- Ninguna.
