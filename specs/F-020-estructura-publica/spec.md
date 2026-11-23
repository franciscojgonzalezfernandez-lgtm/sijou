# F-020 — Estructura pública

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-NAV, RF-I18N, RNF-02, RNF-03 |
| Depende de | F-003, F-004 |

## Contexto
El marco común de todas las páginas públicas: cabecera, navegación, pie y páginas de error, pensado primero para móvil (80 % del tráfico).

## Historias de usuario
- **HU-1** Como visitante en el móvil, quiero llegar a cualquier categoría en 2 toques.
- **HU-2** Como usuario de lector de pantalla, quiero saltar directamente al contenido.

## Criterios de aceptación
- **CA-1** Cabecera: logo (enlace al inicio), menú de categorías, búsqueda, cuenta, carrito con número de artículos y selector de idioma.
- **CA-2** En móvil, el menú se abre en un panel accesible: guarda el foco dentro, se cierra con Escape y devuelve el foco al botón que lo abrió.
- **CA-3** El menú muestra siempre **Todos los productos**, **Destacados** y **Ofertas**, además del árbol de categorías publicadas (hasta 3 niveles) y las colecciones destacadas.
- **CA-4** Pie: enlaces a las páginas del CMS y a las legales, datos de contacto y selector de idioma.
- **CA-5** Hay páginas 404 y 500 en los 3 idiomas, con enlace al inicio y a la búsqueda. La 404 devuelve el código HTTP 404.
- **CA-6** Hay un enlace "Saltar al contenido" y landmarks semánticos (`header`, `nav`, `main`, `footer`).
- **CA-7** La estructura pública no supera el presupuesto de JavaScript de la constitución. La página inicial vacía saca ≥ 90 en las 4 categorías de Lighthouse.
- **CA-8** El número de artículos del carrito se actualiza sin recargar y se anuncia a los lectores de pantalla.

## Estrategia de pruebas
- Unitarias: construcción del menú desde el árbol de categorías.
- E2E: menú en móvil con teclado, Escape y foco; 404 en `/de/no-existe`; axe en la página inicial, la 404 y el menú abierto.

## Casos límite y errores
- Si no hay categorías publicadas, el menú muestra solo los enlaces fijos.

## Fuera de alcance
- Mega-menú con imágenes.

## Dudas
- Ninguna.
