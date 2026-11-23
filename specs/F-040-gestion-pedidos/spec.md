# F-040 — Gestión de pedidos

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-PED-01, 02, 07; RF-ADM-02 |
| Depende de | F-033 |

## Contexto
La administradora prepara y envía los pedidos a mano, y lleva su estado desde el panel, también desde el móvil.

## Historias de usuario
- **HU-1** Como administradora, quiero ver los pedidos pendientes de preparar.
- **HU-2** Como administradora, quiero marcar un pedido como enviado e introducir el número de seguimiento.
- **HU-3** Como administradora, quiero exportar los pedidos a CSV.

## Criterios de aceptación
- **CA-1** Listado con número, fecha, cliente, total, estado y país. Se puede filtrar por estado, rango de fechas y búsqueda (número, email o nombre). Ordenado por fecha, de más reciente a más antiguo.
- **CA-2** Estados: `Pagado`, `Reservado / esperando stock`, `En preparación`, `Enviado`, `Entregado`, `Cancelado`, `Reembolsado`, `Cambio / devolución`. Solo se permiten las transiciones válidas (máquina de estados documentada en el plan).
- **CA-3** El detalle muestra las líneas (con su estado: asignada, reservada o reembolsada), el packaging destacado, la dirección, los datos de empresa, el método de pago, los envíos, las notas internas y el historial de estados (quién y cuándo).
- **CA-4** Envíos: uno o varios por pedido (normalmente uno). Cada uno con transportista, número de seguimiento, URL de seguimiento, las líneas que incluye y si lo paga la tienda. Registrar un envío pasa esas líneas a `Enviado`.
- **CA-5** El pedido pasa a `Entregado` a mano cuando todos sus envíos están entregados.
- **CA-6** Notas internas con autor y fecha, que el cliente no ve.
- **CA-7** Exportar a CSV los pedidos filtrados (una fila por línea, en UTF-8 con BOM para que Excel lo abra bien).
- **CA-8** Todo es usable en un móvil de 375 px de ancho.
- **CA-9** Pestaña separada **Pendientes de pago**: pagos pendientes de diferencias (F-042), que no aparecen en el listado principal hasta que se pagan.
- **CA-10** Albarán imprimible por pedido, con líneas, packaging y dirección.
- **CA-11** Un pedido con reservas son en realidad 2 pedidos distintos (disponible y reserva) vinculados al mismo pago, cada uno con su estado. El detalle de cada uno enlaza al otro.

## Estrategia de pruebas
- Unitarias (100 % de ramas): máquina de estados y generación del CSV.
- E2E: pedido pagado → En preparación → envío con seguimiento → Enviado → Entregado; transición inválida bloqueada; exportar CSV; en el viewport móvil.

## Casos límite y errores
- No hay pedidos mixtos: la parte reservada es otro pedido (CA-11).

## Fuera de alcance
- Etiquetas de transportista (F-108).

## Dudas
- Ninguna.
