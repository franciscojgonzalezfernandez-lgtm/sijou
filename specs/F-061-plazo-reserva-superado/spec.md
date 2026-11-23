# F-061 — Fecha máxima de reserva superada

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P1 |
| Requisitos PRD | RF-RES-05, RF-RES-06 |
| Depende de | F-060, F-043 |

## Contexto
Si la tienda no repone antes de la fecha máxima, el cliente decide si sigue esperando o cancela y recupera su dinero.

## Historias de usuario
- **HU-1** Como cliente, quiero poder cancelar y recuperar mi dinero si no se cumple la fecha prometida.
- **HU-2** Como administradora, quiero enterarme antes de que se pase la fecha.

## Criterios de aceptación
- **CA-1** X días antes de la fecha máxima (configurable, 7 por defecto), el administrador recibe un aviso con las reservas en riesgo.
- **CA-2** Al día siguiente de la fecha máxima, si la línea sigue reservada, el cliente recibe un email en su idioma con dos opciones: **seguir esperando** o **cancelar con reembolso total** de esa línea.
- **CA-3** Las opciones son enlaces firmados y de un solo uso, y también están en la cuenta del cliente. Para elegir hay que confirmar en una página.
- **CA-4** Si el cliente cancela, esa línea se reembolsa entera por Stripe (F-043), pasa a `reembolsada` y sale de la cola. El email confirma el reembolso.
- **CA-5** Si el cliente decide esperar, se registra la elección, la reserva mantiene su posición en la cola, y la administradora fija una nueva fecha máxima. Al llegar esa fecha se repite el proceso.
- **CA-6** No hay recordatorios automáticos: se envía un solo email. Si el cliente no responde, la reserva sigue esperando.
- **CA-7** El panel de reservas (F-062) muestra las elecciones y las reservas vencidas.
- **CA-8** El proceso diario es idempotente: no envía dos veces el mismo email por la misma línea y la misma fecha.

## Estrategia de pruebas
- Unitarias: detección de reservas vencidas y en riesgo, validación del token.
- E2E: reserva con fecha de ayer → cron → email → clic en "cancelar" → reembolso en modo test → línea reembolsada; enlace reutilizado → rechazado.

## Casos límite y errores
- Si el stock entra justo cuando el cliente está cancelando, gana lo que ocurra primero en la base de datos (transacción). La otra acción ve el estado actualizado.

## Fuera de alcance
- Compensaciones (cupones) por el retraso.

## Dudas
- Ninguna.
