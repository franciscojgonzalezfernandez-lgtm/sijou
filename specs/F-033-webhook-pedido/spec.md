# F-033 — Pago confirmado → pedido y stock

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-STK-04, RF-CHK-05, RF-PED-01; ADR-06 |
| Depende de | F-032, F-013, F-006 |

## Contexto
Es el núcleo del dominio: cuando Stripe confirma el pago, se crea el pedido y se descuenta el stock de forma atómica, sin duplicados y sin vender más de lo que hay.

## Historias de usuario
- **HU-1** Como cliente, quiero recibir la confirmación de mi pedido en cuanto pago.
- **HU-2** Como administradora, quiero que el stock sea siempre exacto, aunque dos personas compren la última unidad a la vez.

## Criterios de aceptación
- **CA-1** Solo se procesan webhooks con la firma verificada. Los demás se rechazan con un 400.
- **CA-2** Cada evento se procesa una sola vez (se guarda el id del evento). Si Stripe lo reenvía, se responde 200 sin hacer nada.
- **CA-3** Con el pago confirmado (`checkout.session.completed` con pago hecho, o `async_payment_succeeded`), en una sola transacción: se crea el pedido en estado `Pagado` con un número de pedido legible y correlativo, y se guardan las líneas con su precio y su promoción en ese momento, la dirección, el packaging y el envío.
- **CA-4** En la misma transacción se descuenta el stock en orden FEFO (incluidos los componentes de los packs) y se registran los movimientos con la referencia al pedido.
- **CA-5** Si al confirmarse el pago falta stock en una línea (dos personas pagando la última unidad): esa línea se reembolsa automáticamente por Stripe, se quita del carrito y se avisa al cliente de que el artículo se ha agotado. Si el producto se puede reservar, se le ofrece hacerlo, pero él decide y lo hace a mano. No se convierte en reserva de forma automática.
- **CA-5b** Si el carrito incluye líneas para reservar, se crean 2 pedidos vinculados al mismo pago: el de lo disponible y el de reserva (F-060).
- **CA-6** Se encolan el email de confirmación al cliente (en el idioma del pedido) y el aviso de pedido nuevo al administrador.
- **CA-7** Un pago asíncrono fallido no crea pedido, o, si ya estaba creado, lo cancela y devuelve el stock.
- **CA-8** El endpoint responde en menos de 10 s. Si la transacción falla, responde con un 5xx para que Stripe lo reintente.
- **CA-9** Tras el pedido, el carrito del cliente se vacía.

## Estrategia de pruebas
- Unitarias (100 % de ramas): reparto de las líneas entre asignadas y reembolsadas, y separación en pedido normal y pedido de reserva.
- Integración: el mismo evento dos veces → un solo pedido; 2 pagos simultáneos por la última unidad → uno asignado y el otro reembolsado, con aviso; firma inválida → 400.
- E2E: compra completa con Stripe CLI reenviando el webhook → pedido en el panel, stock descontado, email capturado.

## Casos límite y errores
- Si el webhook llega antes de que el cliente vuelva a la página de confirmación, esa página espera y consulta el pedido.

## Fuera de alcance
- Facturas.

## Dudas
- Ninguna. (Formato del número de pedido aprobado: `SJ-2027-000123`.)
