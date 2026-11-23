# F-016 — Opciones de packaging

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CAT-08, RF-CHK-04 |
| Depende de | F-010 |

## Contexto
Al terminar la compra, el cliente puede elegir cómo presentar todo el pedido (cesta, caja de regalo…).

## Historias de usuario
- **HU-1** Como administradora, quiero definir las opciones de packaging con su foto y su precio.
- **HU-2** Como cliente, quiero elegir un packaging para mi pedido antes de pagar.

## Criterios de aceptación
- **CA-1** Una opción de packaging tiene nombre y descripción traducibles, una foto con texto alternativo, un precio en CHF (puede ser 0) y un estado activo o inactivo.
- **CA-2** En el carrito o el checkout, el cliente elige ninguna o una opción para todo el pedido. Por defecto, ninguna.
- **CA-3** El precio del packaging aparece como una línea aparte en el resumen y en Stripe.
- **CA-4** El pedido guarda qué packaging se eligió y su precio en ese momento, y el panel lo muestra destacado para la preparación.
- **CA-5** El packaging tiene stock propio, gestionado con lotes y movimientos como el resto. Se descuenta al confirmarse el pago. Si una opción no tiene stock, no aparece.
- **CA-6** Es uno por pedido, porque envuelve el pedido entero.

## Estrategia de pruebas
- Unitarias: cálculo del total con packaging.
- E2E: elegir una caja de regalo → la línea aparece en el resumen → el pedido muestra el packaging en el panel.

## Casos límite y errores
- Si una opción se desactiva mientras está en un carrito, se quita y se avisa al cliente.

## Fuera de alcance
- Mensaje de regalo (el PRD dice que no).

## Dudas
- Ninguna.
