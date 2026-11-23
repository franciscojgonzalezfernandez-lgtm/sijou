# F-003 — Internacionalización base

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-I18N-01…05, RF-SEO-03 |
| Depende de | F-002 |

## Contexto
La tienda pública funciona en inglés, alemán y español, con URLs propias para cada idioma. El panel solo está en español.

## Historias de usuario
- **HU-1** Como visitante, quiero ver la tienda en mi idioma automáticamente.
- **HU-2** Como visitante, quiero cambiar de idioma y que se recuerde mi elección.
- **HU-3** Como buscador (Google), quiero URLs distintas por idioma y relacionadas entre sí.

## Criterios de aceptación
- **CA-1** Todas las URLs públicas llevan el prefijo del idioma: `/en`, `/de` o `/es`.
- **CA-2** Al entrar en `/` sin cookie, se redirige al idioma del navegador si es es, en o de. Si no, a `/en`.
- **CA-3** Si hay cookie de idioma, se respeta por encima del idioma del navegador.
- **CA-4** El selector de idioma lleva a la misma página en el otro idioma (con su slug traducido) y guarda la elección.
- **CA-5** Todas las páginas incluyen `hreflang` para es, en, de y `x-default` (que apunta a en), y una URL canónica.
- **CA-6** El atributo `lang` del documento coincide con el idioma de la página.
- **CA-7** Los textos de la interfaz salen de archivos de mensajes. Si falta una clave en algún idioma, la comprobación de CI falla.
- **CA-8** Los formatos de precio (CHF) y de fecha se adaptan al idioma, p. ej. `CHF 24.90`.
- **CA-9** Un rastreador sin `Accept-Language` recibe EN sin bucles de redirección.

## Estrategia de pruebas
- Unitarias: negociación de idioma, construcción de las URLs alternativas, formato de precios.
- E2E: navegador en alemán → `/de`; cambio a español en una página de producto → URL traducida y cookie guardada.

## Casos límite y errores
- Si una URL tiene un prefijo de idioma no soportado, se devuelve 404 o se redirige a `/en`.
- Si un slug no existe en ese idioma, se devuelve 404 en ese idioma.

## Fuera de alcance
- Más idiomas. Otras monedas.

## Dudas
- Ninguna.
