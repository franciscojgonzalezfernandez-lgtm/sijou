# F-004 — Sistema de diseño accesible

| Campo | Valor |
|---|---|
| Estado | Hecha (25-11-2026). Verificada en producción: catálogo en 3 idiomas, logotipo «Rama», favicon e icono de app |
| Prioridad | P0 |
| Requisitos PRD | RNF-02, RNF-03 |
| Depende de | F-002, N-04 |

## Contexto
Un conjunto de tokens y componentes base, accesibles y pensados primero para móvil, que usan todas las pantallas públicas. Se construye a partir de la identidad de marca de la clienta.

## Historias de usuario
- **HU-1** Como visitante con baja visión, quiero un contraste suficiente y textos que se puedan ampliar.
- **HU-2** Como usuario de teclado, quiero ver siempre dónde está el foco.
- **HU-3** Como desarrollador, quiero componentes reutilizables para no repetir estilos.
- **HU-4** Como clienta, quiero un logotipo en vector, con su icono, que se vea nítido en la tienda, en la pestaña del navegador y en el móvil.

## Criterios de aceptación
- **CA-1** Hay tokens de color, tipografía, espaciado, radios y sombras definidos en un único lugar.
- **CA-2** Todas las combinaciones de texto y fondo cumplen al menos el contraste AA (4,5:1, o 3:1 en texto grande). El texto de cuerpo cumple AAA (7:1).
- **CA-3** El foco es visible en todos los elementos interactivos (WCAG 2.4.7 y 2.4.11).
- **CA-4** Las zonas táctiles miden al menos 24×24 px (WCAG 2.5.8), con 44×44 px como objetivo.
- **CA-5** Componentes base: botón, enlace, campo de texto, select, checkbox, radio, diálogo, menú desplegable, toast, skeleton, badge, breadcrumbs, paginación, y "saltar al contenido".
- **CA-6** Todo se ve bien a 200 % de zoom y con una ventana de 320 px de ancho, sin scroll horizontal (WCAG 1.4.10).
- **CA-7** Se respeta `prefers-reduced-motion`.
- **CA-8** Las fuentes son locales o servidas por nosotros, cargadas sin bloquear el renderizado y sin saltos de diseño (CLS).
- **CA-9** Hay una página interna de catálogo de componentes, no indexada, con las pruebas de axe.
- **CA-10** El logotipo es un SVG con nombre accesible «Sijôu», enlaza a la página de inicio desde la cabecera y tiene versión en verde bosque y en lino claro. Hay favicon e icono de app (`apple-touch-icon`) derivados de él.

## Estrategia de pruebas
- Unitarias: cálculo del contraste de los tokens (falla si un par baja del mínimo).
- E2E: catálogo de componentes con axe, navegación con teclado por cada componente y capturas de regresión visual.

## Casos límite y errores
- Modo de alto contraste del sistema (forced-colors): los controles siguen siendo visibles.

## Fuera de alcance
- Modo oscuro: ni en el MVP ni más adelante.

## Dudas
- Ninguna. La clienta eligió el logotipo «Rama» y el nombre definitivo «Sijôu», con ô (25-11-2026; sustituye a «Maison Natur»).
