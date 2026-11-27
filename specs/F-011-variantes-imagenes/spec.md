# F-011 — Variantes e imágenes

| Campo | Valor |
|---|---|
| Estado | Hecha (27-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CAT-04, RF-CAT-05; L-05 |
| Depende de | F-010 |

## Contexto
Un producto puede tener variantes por tamaño, aroma y color, cada una con su precio y sus fotos.

## Historias de usuario
- **HU-1** Como administradora, quiero definir las variantes de un producto (p. ej. 50 ml / 100 ml × lavanda / rosa).
- **HU-2** Como administradora, quiero subir fotos y decir a qué variante pertenece cada una.

## Criterios de aceptación
- **CA-1** Atributos de variante: tamaño, aroma y color. Se pueden usar de 0 a 3 a la vez. Un producto sin atributos tiene una única variante por defecto.
- **CA-2** Por variante: SKU (obligatorio y único en toda la tienda), EAN (opcional), precio en CHF (obligatorio, > 0), precio de referencia "antes" (opcional y mayor que el precio), peso en gramos, y cantidad neta con su unidad (ml o g) para calcular el precio por unidad.
- **CA-3** Una variante se puede desactivar sin borrarla.
- **CA-4** Máximo 10 fotos por producto. Si se intenta subir la número 11, se rechaza con un mensaje.
- **CA-5** Cada foto se puede asignar a ninguna, una o varias variantes. Se pueden reordenar arrastrando y una de ellas es la principal.
- **CA-6** El texto alternativo de cada foto es obligatorio en es, en y de para poder publicar.
- **CA-7** Formatos: JPEG, PNG y WebP, hasta 10 MB. La subida va directa al almacenamiento, con barra de progreso.
- **CA-8** Las imágenes se sirven optimizadas (AVIF o WebP, tamaños responsive) sin intervención manual.

## Estrategia de pruebas
- Unitarias: generación de las combinaciones de variantes, unicidad del SKU, cálculo del precio por unidad.
- E2E: crear un producto con 2×2 variantes, subir 3 fotos, asignarlas, reordenarlas, y comprobar el límite de 10.

## Casos límite y errores
- Si se borra un atributo con variantes que tienen stock, se avisa y la variante se desactiva en lugar de borrarse.
- Si una foto se sube a medias, no queda guardada.

## Fuera de alcance
- Vídeo.

## Dudas
- Ninguna.
