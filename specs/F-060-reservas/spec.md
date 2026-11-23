# F-060 — Reservas con pago anticipado

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P1 |
| Requisitos PRD | RF-RES-01…05, RF-CHK-03; TA-07 (resuelto) |
| Depende de | F-033, F-013 |

## Contexto
Los productos reponibles sin stock se pueden reservar pagando el 100 % por adelantado, con una cuenta verificada. La tienda se compromete a una fecha máxima de reposición y sirve las reservas por orden de llegada. Una reserva genera su propio pedido, separado del de los productos disponibles.

## Historias de usuario
- **HU-1** Como cliente con cuenta, quiero reservar un producto agotado y asegurarme de recibirlo cuando vuelva.
- **HU-2** Como cliente, quiero comprar en un solo pago productos en stock y reservados, sin pagar dos envíos.
- **HU-3** Como administradora, quiero que, al dar de alta un lote, las reservas se sirvan solas por orden.

## Criterios de aceptación
- **CA-1** Solo se pueden reservar las variantes de productos `reponibles` sin stock normal y con una **fecha máxima de reposición** definida **por producto**. Ni los packs ni las ediciones limitadas se pueden reservar.
- **CA-2** La ficha muestra "Reservar" y la fecha máxima: "Te lo enviamos como muy tarde el {fecha}".
- **CA-3** No hay límite de unidades por reserva.
- **CA-4** Reservar exige una cuenta con el email verificado. Si el usuario pulsa "Reservar" sin haber iniciado sesión, se le explica que hace falta una cuenta y se le ofrece iniciar sesión o registrarse. Después vuelve a la ficha con la misma variante seleccionada.
- **CA-5** Un carrito con líneas para reservar exige haber iniciado sesión antes del checkout, con el mismo mensaje.
- **CA-6** **Dos pedidos, un pago:** si el carrito mezcla productos disponibles y reservas, se paga una sola vez, pero se generan **2 pedidos** vinculados al mismo pago: uno con lo disponible, que se envía ya y paga el envío normal, y otro de reserva, con envío gratis a cargo de la tienda. Cada pedido tiene su estado. Un carrito que solo tiene reservas genera un único pedido de reserva.
- **CA-7** El checkout explica, antes de pagar, que se generarán dos pedidos y que el segundo envío corre de cuenta de la tienda.
- **CA-8** El pedido de reserva queda en `Reservado / esperando stock`, con la fecha de la reserva, la fecha máxima y la posición en la cola de cada línea.
- **CA-9** Al dar de alta un lote de una variante con reservas, en la misma transacción se asignan las unidades por orden de reserva y se crean los movimientos. Lo que sobra queda a la venta.
- **CA-10** No se asignan líneas a medias: si el lote no alcanza para la línea entera, esa línea sigue esperando y se pasa a la siguiente que sí quepa. [Ver la nota de casos límite.]
- **CA-11** Cuando un pedido de reserva tiene todas sus líneas asignadas, pasa a `En preparación` y se avisa al cliente por email.
- **CA-12** El cliente no puede cancelar mientras no haya pasado la fecha máxima (F-061).
- **CA-13** Cambiar la fecha máxima de un producto no afecta a las reservas ya hechas, que conservan su fecha.
- **CA-14** El JSON-LD muestra `BackOrder` para las variantes que se pueden reservar.

## Estrategia de pruebas
- Unitarias (100 % de ramas): elegibilidad (sin packs ni ediciones limitadas), orden de la cola, asignación sin partir líneas, separación en 2 pedidos.
- Integración: un lote de 3 unidades con reservas de 2 y 2 → la primera se asigna y la segunda espera; concurrencia con una venta normal.
- E2E: reservar sin sesión → se pide login → reservar → pedido de reserva → alta de lote → asignado → email capturado; carrito mixto → 2 pedidos y un solo pago.

## Casos límite y errores
- Con CA-10, una reserva grande puede quedar esperando mientras otras posteriores y más pequeñas se sirven. El panel (F-062) lo hace visible.
- Si se archiva un producto con reservas, estas siguen activas hasta que se sirvan o se reembolsen, y el panel lo avisa.

## Fuera de alcance
- Pago parcial o señal.

## Dudas
- [DUDA: CA-10, ¿se salta a la siguiente reserva que cabe o se espera a poder servir la primera? Se propone saltar.]
