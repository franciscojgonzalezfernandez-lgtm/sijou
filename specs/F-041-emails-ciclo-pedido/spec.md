# F-041 — Emails del ciclo del pedido

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-PED-03, RF-PED-08 |
| Depende de | F-040, F-006 |

## Contexto
El cliente recibe un email cuando su pedido se envía (con el seguimiento) y cuando se entrega (pidiéndole su opinión).

## Historias de usuario
- **HU-1** Como cliente, quiero saber cuándo sale mi pedido y poder seguirlo.
- **HU-2** Como tienda, quiero pedir la opinión del cliente cuando ya tiene su pedido.

## Criterios de aceptación
- **CA-1** Al registrar un envío se envía el email "Tu pedido está en camino", con las líneas del envío, el transportista y el enlace de seguimiento.
- **CA-2** Al marcar el pedido como `Entregado` se envía el email de agradecimiento con la petición de opinión: el cliente simplemente responde al email.
- **CA-3** Todos los emails van en el idioma del pedido y enlazan a la cuenta (si la hay) o a una página de estado del pedido con un enlace seguro.
- **CA-4** El administrador recibe un email con cada pedido nuevo (resumen, packaging y enlace al panel).
- **CA-5** Un mismo cambio de estado no envía dos veces el mismo email.
- **CA-6** El panel muestra en el detalle del pedido los emails enviados de ese pedido.

## Estrategia de pruebas
- Unitarias: elección de la plantilla y el idioma según el evento.
- E2E: registrar un envío → email capturado con el seguimiento en el idioma correcto; marcar como entregado → email de opinión.

## Casos límite y errores
- Si se registra un envío sin URL de seguimiento, el email muestra solo el número.

## Fuera de alcance
- Reseñas en la web (F-106).

## Dudas
- Ninguna.
