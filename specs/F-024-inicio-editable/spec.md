# F-024 — Página de inicio editable

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CMS-01 |
| Depende de | F-020 |

## Contexto
La administradora cambia la portada (banners, destacados, avisos) sin ayuda técnica.

## Historias de usuario
- **HU-1** Como administradora, quiero cambiar el banner principal para una campaña.
- **HU-2** Como administradora, quiero mostrar un aviso arriba del todo ("Envío gratis desde X").

## Criterios de aceptación
- **CA-1** La portada se compone de bloques reordenables: banner principal (imagen, título, texto, botón con enlace), productos destacados (elegidos a mano), colección destacada, bloque de texto con imagen y artículos recientes del blog.
- **CA-2** Todos los textos y los textos alternativos están en los 3 idiomas, que son obligatorios para publicar.
- **CA-3** Barra de avisos: texto y enlace traducibles, fechas opcionales de inicio y fin, y activa o inactiva.
- **CA-4** Se puede previsualizar antes de publicar.
- **CA-5** La imagen del banner principal es el LCP y se carga con prioridad. La portada saca ≥ 90 en las 4 categorías de Lighthouse en móvil.
- **CA-6** Los banners rotan solos, y cada uno se configura con imagen y texto. Para cumplir WCAG 2.2.2: hay un botón visible de pausa y reproducción, la rotación se detiene con el ratón encima o el foco dentro, y no rota si el usuario tiene activado `prefers-reduced-motion`.
- **CA-7** La portada tendrá un diseño con efectos de scroll (parallax) para hacerla muy visual. Se define en la fase de diseño, respetando `prefers-reduced-motion` y Lighthouse ≥ 90.

## Estrategia de pruebas
- Unitarias: validación de los bloques y visibilidad por fechas de la barra de avisos.
- E2E: editar el banner → publicar → se ve en los 3 idiomas; la barra de avisos caduca a su hora; axe.

## Casos límite y errores
- Un producto destacado que se archiva desaparece del bloque sin romper la página.

## Fuera de alcance
- Pruebas A/B y personalización.

## Dudas
- Ninguna.
