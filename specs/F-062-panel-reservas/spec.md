# F-062 — Panel de reservas

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P1 |
| Requisitos PRD | RF-RES-07, RF-AVI-03 |
| Depende de | F-060 |

## Contexto
Ver qué productos se piden aunque no haya stock, para decidir qué reponer y en qué orden.

## Historias de usuario
- **HU-1** Como administradora, quiero ver qué productos tienen más reservas.
- **HU-2** Como administradora, quiero ver qué reservas llevan más tiempo esperando.

## Criterios de aceptación
- **CA-1** Listado por variante: producto, variante, unidades reservadas, número de reservas, reserva más antigua, fecha máxima más próxima y número de suscriptores a "Avísame" (F-063).
- **CA-2** Se puede ordenar por número de reservas, unidades o antigüedad.
- **CA-3** El detalle de una variante muestra la cola (cliente, pedido, unidades, fecha, fecha máxima y elección si la hay), con enlace a cada pedido.
- **CA-4** Las reservas vencidas o en riesgo se destacan visualmente, y no solo con color (también con texto o icono).
- **CA-5** Hay un acceso directo para dar de alta un lote de esa variante, que dispara la asignación de F-060.
- **CA-6** Se puede usar en móvil.

## Estrategia de pruebas
- Unitarias: agregación y ordenación.
- E2E: varias reservas → orden por número y por antigüedad → detalle → alta de lote desde el panel → la cola se reduce.

## Casos límite y errores
- Si no hay reservas, se muestra un mensaje.

## Fuera de alcance
- Previsión de demanda.

## Dudas
- Ninguna.
