# F-071 — Auditoría final antes del lanzamiento

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RNF-01, RNF-03, RNF-04, RNF-15, RNF-16 |
| Depende de | todas las P0 |

## Contexto
Comprobar todo de punta a punta en un entorno igual a producción antes de abrir.

## Historias de usuario
- **HU-1** Como responsable de la tienda, quiero abrir con la garantía de que todo funciona y cumple los requisitos de calidad.

## Criterios de aceptación
- **CA-1** Lighthouse ≥ 90 en las 4 categorías, con perfil móvil, en inicio, categoría, colección, ficha, búsqueda, carrito, blog, artículo, página CMS y 404, en es, en y de. Se adjunta el informe.
- **CA-2** Las métricas reales de Speed Insights no muestran ninguna página en rojo.
- **CA-3** Auditoría manual de WCAG 2.2 AA con VoiceOver (iOS y macOS) y NVDA (Windows) en el recorrido completo de compra, con los hallazgos resueltos.
- **CA-4** Prueba en navegadores reales: Safari iOS, Chrome Android, y Chrome, Firefox, Safari y Edge de escritorio, en sus últimas 2 versiones.
- **CA-5** Compra real con una tarjeta y con TWINT en modo live por importe mínimo, y reembolso de ambas.
- **CA-6** Todas las pruebas unitarias y E2E pasan contra la rama de lanzamiento.
- **CA-7** Rich Results Test y Search Console sin errores en una ficha, un artículo y las preguntas frecuentes.
- **CA-8** Lista de comprobación del contenido: 3 productos completos en 3 idiomas, páginas legales publicadas y emails revisados en 3 idiomas.

## Estrategia de pruebas
- Es en sí misma una feature de verificación. El resultado es un informe en `docs/launch-audit.md`.

## Casos límite y errores
- Si algún CA falla, se bloquea F-072.

## Fuera de alcance
- Pruebas de carga.

## Dudas
- Ninguna.
