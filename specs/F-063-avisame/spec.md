# F-063 — Avísame cuando vuelva

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P1 |
| Requisitos PRD | RF-AVI-01…03 |
| Depende de | F-007, F-013, F-006 |

## Contexto
Los clientes con cuenta verificada se suscriben a un producto reponible agotado y reciben un email cuando vuelve a haber stock.

## Historias de usuario
- **HU-1** Como cliente, quiero que me avisen cuando vuelva un producto.
- **HU-2** Como cliente, quiero ver y cancelar mis avisos.

## Criterios de aceptación
- **CA-1** El botón "Avísame" aparece en las variantes de productos reponibles sin stock (no en packs). Si el cliente no ha iniciado sesión, se le pide entrar o registrarse y luego vuelve a la ficha.
- **CA-2** Solo pueden suscribirse las cuentas con el email verificado.
- **CA-3** Una suscripción por cliente y variante. Si ya está suscrito, el botón dice "Te avisaremos" y permite cancelar.
- **CA-4** Cuando una variante pasa de 0 a más de 0 unidades disponibles (lote nuevo o ajuste, después de servir las reservas), se envía un email a todos los suscritos, en su idioma, con el enlace a la variante.
- **CA-5** El aviso es único: después de avisar, la suscripción se marca como avisada y termina.
- **CA-6** En la cuenta del cliente hay un listado de sus avisos, con opción de cancelarlos.
- **CA-7** Si se reciben muchos avisos a la vez, se envían en lotes sin superar los límites del proveedor de email.
- **CA-8** El panel muestra el número de suscriptores por variante (F-062).

## Estrategia de pruebas
- Unitarias: detección de la transición de 0 a más de 0 y deduplicación.
- Integración: un lote que se consume entero en reservas → no se avisa.
- E2E: suscribirse → alta de lote → email capturado → el aviso aparece como avisado en la cuenta.

## Casos límite y errores
- Si el stock vuelve y se agota en minutos, los avisos ya enviados se mantienen. La ficha mostrará "Agotado" otra vez.

## Fuera de alcance
- Avisos por SMS o push.

## Dudas
- Ninguna.
