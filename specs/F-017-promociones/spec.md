# F-017 — Promociones automáticas y esquema de códigos

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CHK-06, RF-CHK-07 |
| Depende de | F-012 |

## Contexto
La administradora crea rebajas que se aplican solas (sin código) a productos, categorías o colecciones. Los códigos de descuento llegarán después, pero su modelo de datos se crea ya.

## Historias de usuario
- **HU-1** Como administradora, quiero poner un 20 % de descuento en una categoría durante una semana.
- **HU-2** Como cliente, quiero ver el precio rebajado y el original tachado.

## Criterios de aceptación
- **CA-1** Una promoción tiene: nombre interno, tipo (`porcentaje` o `importe fijo`), valor, alcance (productos, categorías o colecciones concretas), fecha y hora de inicio y de fin (zona horaria Europe/Zurich) y estado activo o inactivo.
- **CA-2** Solo se aplica entre su inicio y su fin, y solo si está activa.
- **CA-3** Si a una variante le afectan varias promociones, se aplica la que da el precio más bajo. No se acumulan.
- **CA-4** El precio final nunca baja de 0,00 CHF y se redondea a 0,05 CHF.
- **CA-5** La tienda muestra el precio rebajado, el precio original tachado y el porcentaje (en ficha, listado y carrito), con texto accesible ("antes X, ahora Y").
- **CA-6** El servidor recalcula la promoción al crear el checkout. Si ha caducado entre medias, el cliente ve el precio actualizado antes de pagar.
- **CA-7** El pedido guarda, por línea, el precio original, el descuento y la promoción aplicada.
- **CA-8** Se crea el modelo de los códigos de descuento: código, tipo, valor, alcance, máximo de usos, usos por cliente, solo primera compra, caducidad y registro de usos. No hay interfaz ni lógica para usarlos en el MVP.
- **CA-9** Si hay precio "antes" manual (F-011) y además una promoción, el precio tachado es el más alto de los dos.

## Estrategia de pruebas
- Unitarias (100 % de ramas): selección de la mejor promoción, fechas límite (zona horaria), redondeo, mínimo 0.
- E2E: crear un 20 % en una categoría que empieza en 1 minuto → precio normal → precio rebajado → checkout con el precio rebajado.

## Casos límite y errores
- Una promoción con fin anterior al inicio se rechaza.
- Si un producto archivado está dentro del alcance, se ignora.

## Fuera de alcance
- Interfaz de códigos (F-101), regalos por compra y 2×1.

## Dudas
- Ninguna.
