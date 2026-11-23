# F-022 — Ficha de producto

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CAT-02, 05, 09, 10; L-05 |
| Depende de | F-011, F-017, F-020 |

## Contexto
Es la página que vende: tiene que ser rápida, clara y completa, e incluir los ingredientes.

## Historias de usuario
- **HU-1** Como cliente, quiero elegir tamaño y aroma y ver al momento el precio, la foto y la disponibilidad.
- **HU-2** Como cliente, quiero ver las fotos en grande.
- **HU-3** Como cliente con alergias, quiero leer los ingredientes y los alérgenos.

## Criterios de aceptación
- **CA-1** URL: `/{locale}/p/{slug}`.
- **CA-2** Muestra nombre, descripción corta, precio (y precio rebajado), precio por unidad (por 100 ml o 100 g) si hay cantidad neta, selector de variantes, cantidad, botón de compra y descripción larga.
- **CA-3** Los apartados opcionales (ingredientes INCI, modo de uso, advertencias, alérgenos, PAO, certificaciones) solo aparecen si tienen contenido, en secciones desplegables accesibles.
- **CA-4** Al cambiar de variante se actualizan el precio, el SKU, el stock, la galería (fotos de esa variante) y la URL (`?v=sku`), sin recargar la página. Las variantes sin stock se muestran como no disponibles, pero se pueden elegir.
- **CA-5** El botón cambia según el estado: "Añadir al carrito", "Agotado" (desactivado, en edición limitada), o "Reservar" y "Avísame" (en reponibles, F-060 y F-063).
- **CA-6** Si quedan 5 unidades o menos, se muestra "Solo quedan X".
- **CA-7** Galería: la foto principal se carga con prioridad. Hay miniaturas, se puede deslizar en móvil y el zoom se abre en un diálogo accesible con la imagen grande, cargada solo al pedirla.
- **CA-8** Al añadir al carrito hay una confirmación anunciada a los lectores de pantalla y se actualiza el número del carrito.
- **CA-9** Los packs muestran su contenido, con enlaces a cada componente.
- **CA-10** El LCP es la foto principal. La página saca ≥ 90 en las 4 categorías de Lighthouse en móvil.

## Estrategia de pruebas
- Unitarias: precio por unidad, selección del estado del botón y fotos por variante.
- E2E: cambiar de variante (precio, foto, URL), zoom con teclado, añadir al carrito, estado "Agotado" de una edición limitada y axe.

## Casos límite y errores
- Si `?v=` trae un SKU que no existe, se muestra la variante por defecto.
- Un producto oculto devuelve 404. Un producto archivado redirige (301) a su categoría principal.

## Fuera de alcance
- Reseñas y productos relacionados.

## Dudas
- Ninguna.
