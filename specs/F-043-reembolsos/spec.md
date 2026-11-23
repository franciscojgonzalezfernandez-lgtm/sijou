# F-043 — Reembolsos

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-PED-05 |
| Depende de | F-040 |

## Contexto
Devolver todo o parte del dinero de un pedido desde el panel, sin entrar en Stripe.

## Historias de usuario
- **HU-1** Como administradora, quiero reembolsar un pedido entero o solo algunas líneas.
- **HU-2** Como cliente, quiero recibir la confirmación del reembolso.

## Criterios de aceptación
- **CA-1** Reembolso total o parcial (por líneas y cantidades, y opcionalmente el envío), con importe calculado y editable hasta el máximo que queda por reembolsar.
- **CA-2** Opción de devolver al stock las unidades reembolsadas, eligiendo el lote; si se marca, se crean los movimientos.
- **CA-3** El reembolso se hace por la API de Stripe con una clave de idempotencia y se registra con su id de Stripe, importe, líneas, motivo y autor.
- **CA-4** El pedido pasa a `Reembolsado` si se ha devuelto todo. Si no, mantiene su estado y queda marcado como reembolsado parcialmente.
- **CA-5** Se envía un email al cliente con el importe y el plazo aproximado.
- **CA-6** Si Stripe falla, no se registra nada y se muestra el error.
- **CA-7** Los reembolsos hechos directamente en Stripe se reflejan en el pedido a través del webhook `charge.refunded`.

## Estrategia de pruebas
- Unitarias: cálculo del máximo reembolsable y validaciones.
- Integración: idempotencia (doble clic → un solo reembolso).
- E2E (Stripe en modo test): reembolso parcial de una línea con devolución al stock → stock actualizado y email capturado.

## Casos límite y errores
- Pedido pagado con TWINT: Stripe admite reembolsos parciales. Se verifica en las pruebas.

## Fuera de alcance
- Notas de crédito y facturas.

## Dudas
- Ninguna.
