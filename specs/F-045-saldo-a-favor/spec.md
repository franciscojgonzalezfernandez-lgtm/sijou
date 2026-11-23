# F-045 — Saldo a favor

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CHK-09; TA-05 (resuelto) |
| Depende de | F-034, F-032 |

## Contexto
Cuando la edición de un pedido lo deja más barato, la diferencia no se devuelve a la tarjeta: queda como saldo a favor del cliente para su siguiente compra (decisión TA-05).

## Historias de usuario
- **HU-1** Como cliente, quiero ver mi saldo a favor y que se descuente solo en mi próxima compra.
- **HU-2** Como administradora, quiero ver y ajustar el saldo de un cliente, y que quede registrado.

## Criterios de aceptación
- **CA-0** El saldo no caduca.
- **CA-1** El saldo de un cliente es la suma de sus movimientos de saldo (abonos y consumos). Los movimientos no se editan ni se borran. Una corrección es un movimiento nuevo.
- **CA-2** Cada movimiento guarda el importe en CHF (+ o −), el motivo (`edición de pedido`, `ajuste manual`, `uso en compra`, `devolución de uso`), el pedido relacionado, el autor y la fecha.
- **CA-3** F-042 crea un abono automáticamente cuando una edición abarata un pedido, y se avisa al cliente por email con el saldo resultante.
- **CA-4** En el checkout, si el cliente tiene sesión y saldo, se aplica automáticamente hasta cubrir el total (se puede desmarcar). El descuento aparece como una línea "Saldo a favor" y la sesión de Stripe se crea por el importe restante.
- **CA-5** El consumo de saldo se registra en la misma transacción que crea el pedido (F-033). Si el pago falla, no se consume nada.
- **CA-6** El saldo está vinculado al email. Si el pedido editado era de un invitado, el email le indica que cree una cuenta con ese mismo email para usarlo, y el saldo aparece al verificar la cuenta.
- **CA-7** Si el saldo cubre el pedido entero, el pedido se confirma sin pasar por Stripe.
- **CA-8** La cuenta del cliente muestra el saldo actual y el historial de movimientos.
- **CA-9** El panel muestra el saldo en la ficha del cliente y permite ajustes manuales con motivo obligatorio (auditados).
- **CA-10** Si se reembolsa un pedido que se pagó en parte con saldo, la parte pagada con saldo vuelve como saldo y la parte pagada con dinero vuelve por Stripe.
- **CA-11** Consumidores de la UE: si piden el reembolso en dinero en lugar de saldo (derecho de desistimiento), se hace por Stripe (F-043).

## Estrategia de pruebas
- Unitarias (100 % de ramas): cálculo del saldo, aplicación en el checkout (parcial y total), reparto del reembolso entre saldo y dinero.
- Integración: un pago fallido no consume saldo; dos checkouts simultáneos no pueden gastar el mismo saldo dos veces.
- E2E: editar un pedido a la baja → email con el saldo → el cliente compra de nuevo → el saldo se aplica → Stripe cobra el resto en modo test.

## Casos límite y errores
- El saldo nunca puede quedar en negativo.
- Si un cliente borra su cuenta con saldo pendiente, se le avisa de que lo perderá. El saldo desaparece salvo que lo use antes en un pedido.

## Fuera de alcance
- Tarjetas regalo y transferir saldo a otra persona.

## Dudas
- Ninguna.
