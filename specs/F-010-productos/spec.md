# F-010 — Gestión de productos

| Campo | Valor |
|---|---|
| Estado | Hecha (24-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CAT-01, 02, 03, 06, 09 |
| Depende de | F-002, F-003 |

## Contexto
La administradora da de alta y mantiene los productos desde el panel, en tres idiomas, sin ayuda técnica. Un producto solo se publica cuando está completo en los tres idiomas.

## Historias de usuario
- **HU-1** Como administradora, quiero crear un producto empezando en español y traducirlo después.
- **HU-2** Como administradora, quiero que no se pueda publicar un producto incompleto.
- **HU-3** Como administradora, quiero ocultar o archivar un producto sin perder su historial de pedidos.

## Criterios de aceptación
- **CA-1** Campos traducibles por idioma: nombre, slug, descripción corta, descripción larga, ingredientes INCI, modo de uso, advertencias, alérgenos, certificaciones (texto) y caducidad tras abrir (PAO).
- **CA-2** Campos obligatorios para publicar, en es, en y de: nombre, slug, descripción corta y descripción larga. Además: al menos una categoría, al menos una variante con precio y SKU, y al menos una foto. Los demás campos son opcionales.
- **CA-3** El producto se puede guardar como `borrador` aunque solo tenga el español.
- **CA-4** Al intentar publicar un producto incompleto, la acción se bloquea y se muestra la lista de campos e idiomas que faltan.
- **CA-5** Estados: `borrador`, `publicado`, `oculto`, `archivado`. Solo `publicado` aparece en la tienda. `archivado` no aparece en el listado por defecto del panel.
- **CA-6** El slug se genera a partir del nombre en cada idioma, se puede editar y es único por idioma.
- **CA-7** Cada producto tiene un tipo de reposición: `reponible` o `edición limitada`.
- **CA-8** Un producto con pedidos asociados no se puede borrar definitivamente, solo archivar. Uno sin pedidos sí, con una confirmación explícita.
- **CA-9** Los productos publicados se ven en la tienda tengan stock o no.
- **CA-10** El panel funciona en móvil: la administradora puede editar un producto desde el teléfono.

## Estrategia de pruebas
- Unitarias: validación de "listo para publicar" por idioma y generación del slug.
- E2E: crear un borrador en español → intentar publicar (se bloquea) → completar en/de → publicar → verlo en la tienda en los 3 idiomas → archivar → deja de verse.

## Casos límite y errores
- Si se cambia el slug de un producto publicado, se crea una redirección 301 (F-025).
- Si un producto despublicado está en carritos abiertos, el carrito lo marca como no disponible (F-030).

## Fuera de alcance
- Productos relacionados. Vídeo. Insignias.

## Dudas
- Ninguna.
