# F-044 — Cambios y devoluciones

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-PED-06; L-04; TA-14 (resuelto) |
| Depende de | F-040, F-013 |

## Contexto
La política de la tienda es de cambio: el cliente devuelve el producto (la tienda paga ese envío) y recibe uno nuevo. Además, los consumidores de la UE tienen derecho a desistir en 14 días con reembolso (decisión TA-14).

## Historias de usuario
- **HU-1** Como administradora, quiero registrar un cambio y enviar el producto de sustitución.
- **HU-2** Como cliente, quiero avisar de un problema con mi envío fácilmente.

## Criterios de aceptación
- **CA-1** En un pedido entregado, la administradora crea un cambio indicando las líneas, las cantidades y el motivo (defectuoso, error de envío, otro).
- **CA-2** Estados del cambio: `Solicitado` → `Recibido` → `Sustitución enviada` → `Cerrado`.
- **CA-3** Al marcar el cambio como `Recibido`, se elige si la unidad devuelta vuelve al stock (con su lote) o se da de baja como `devolución dañada`.
- **CA-4** La sustitución descuenta stock (FEFO) y crea un envío pagado por la tienda con su seguimiento, que se notifica por email (F-041).
- **CA-5** El coste del envío de vuelta queda registrado como gasto de la tienda (importe a mano).
- **CA-6** Hay una página pública con la política de cambios (F-050/F-053) y un enlace desde la cuenta del cliente.
- **CA-7** Desistimiento UE: en pedidos con dirección de envío en la UE, el cliente puede desistir en los 14 días siguientes a la entrega. Se registra como `desistimiento` y se reembolsa por Stripe (F-043) el precio y el envío inicial estándar en un máximo de 14 días. El reembolso puede esperar a recibir el producto.
- **CA-8** Excepción por higiene: los cosméticos precintados que se han abierto quedan excluidos del desistimiento. La administradora marca "precinto abierto" al recibir el producto, y entonces no hay reembolso de esa línea.
- **CA-9** El panel muestra si un pedido sigue dentro del plazo de desistimiento (país UE y menos de 14 días desde la entrega).

## Estrategia de pruebas
- Unitarias: estados del cambio y cálculo del plazo de desistimiento (país UE, 14 días desde la entrega).
- E2E: crear un cambio → recibir (vuelve al stock) → enviar la sustitución → email capturado → cerrar; desistimiento UE dentro de plazo → reembolso en modo test; fuera de plazo o con precinto abierto → bloqueado.

## Casos límite y errores
- Si no hay stock para la sustitución, se ofrece un reembolso (F-043) o una reserva.

## Fuera de alcance
- Formulario de autoservicio de cambios. El cliente declara el problema por email (o desde "¿Problema con tu envío?" en Mis pedidos, F-034) y la tienda se pone en contacto con él.

## Dudas
- Ninguna.
