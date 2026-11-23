# F-042 — Edición del pedido antes del envío

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-PED-04; TA-05 (resuelto) |
| Depende de | F-040, F-045 |

## Contexto
Mientras un pedido no se ha enviado, la administradora puede cambiar la dirección y las líneas. Si la edición encarece el pedido, la diferencia se cobra por Stripe. Si lo abarata, la diferencia queda como saldo a favor.

## Historias de usuario
- **HU-1** Como administradora, quiero cambiar la dirección de un pedido no enviado.
- **HU-2** Como administradora, quiero añadir, quitar o cambiar un producto de un pedido no enviado.
- **HU-3** Como cliente, quiero pagar la diferencia desde mi cuenta.

## Criterios de aceptación
- **CA-1** Solo se puede editar en los estados `Pagado`, `En preparación` y `Reservado`, y solo las líneas que no se han enviado.
- **CA-2** Al cambiar la dirección, el nuevo país tiene que estar en una zona y no estar bloqueado. Si el envío cuesta distinto, se muestra la diferencia.
- **CA-3** Añadir, quitar o sustituir líneas recalcula el stock (devuelve lo que se quita y descuenta lo que se añade, FEFO) en una transacción, con sus movimientos.
- **CA-4** **Si la edición encarece el pedido:**
  - Se crea un **pago pendiente** por la diferencia, con un enlace de pago de Stripe, y se envía un email al cliente.
  - Mientras no se pague, ese pago pendiente **no aparece como pedido** en el listado principal del panel: aparece en la pestaña **Pendientes de pago** (F-040). En la base de datos sí queda registrado como `pendiente de pago`.
  - El cliente lo ve en su cuenta con un botón **Pagar** (F-034).
  - El pedido no se envía hasta que se pague la diferencia. Si el cliente tiene saldo a favor, se descuenta primero.
  - El enlace es válido 7 días. Si no se paga a tiempo, la edición se revierte (stock incluido) y se avisa al cliente y al administrador.
- **CA-5** **Si la edición abarata el pedido:** la diferencia se abona como saldo a favor (F-045), no se devuelve a la tarjeta. Si el cliente es consumidor de la UE y pide expresamente el reembolso en dinero, se hace por Stripe (F-043).
- **CA-6** Cada edición queda en la auditoría y en el historial del pedido, y el cliente recibe un email con el pedido actualizado.

## Estrategia de pruebas
- Unitarias: cálculo de la diferencia (líneas y envío) y caducidad del enlace a los 7 días.
- Integración: sustituir una línea → movimientos de stock correctos; reversión a los 7 días.
- E2E: quitar una línea → saldo a favor en la cuenta; añadir una línea → pago pendiente visible en "Pendientes de pago" y en la cuenta del cliente → pagar en modo test → el pedido vuelve a su estado; un pedido enviado no se puede editar.

## Casos límite y errores
- Si el pedido era de un invitado y recibe saldo a favor, se aplica F-045 CA-6.
- Si el producto que se añade no tiene stock, no se permite añadirlo.

## Fuera de alcance
- Que el cliente edite el pedido él mismo.

## Dudas
- Ninguna.
