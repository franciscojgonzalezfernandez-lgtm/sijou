# F-006 — Infraestructura de emails transaccionales

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RNF-13, RF-I18N-04; ADR-07 |
| Depende de | F-002, N-01 |

## Contexto
Muchas features envían emails (pedidos, alertas, avisos de stock). Hace falta una base común fiable: ningún email se pierde, todos llegan en el idioma del destinatario y no acaban en spam.

## Historias de usuario
- **HU-1** Como cliente, quiero recibir los emails en mi idioma y que no lleguen a spam.
- **HU-2** Como desarrollador, quiero encolar un email desde cualquier acción y olvidarme de los reintentos.

## Criterios de aceptación
- **CA-1** El dominio de envío tiene SPF, DKIM y DMARC configurados y verificados.
- **CA-2** Un email se encola dentro de la misma transacción que la acción de negocio. Si la transacción falla, el email no se envía.
- **CA-3** Los emails encolados se envían en segundo plano. Si el envío falla, se reintenta con espera creciente hasta 5 veces. Después se marcan como fallidos y se avisa (F-005).
- **CA-4** Un mismo email no se envía dos veces (clave de idempotencia).
- **CA-5** Hay plantillas base de cabecera y pie en es, en y de, con versión en texto plano, accesibles y legibles en móvil.
- **CA-6** El panel muestra el registro de emails enviados y fallidos (destinatario, plantilla, estado, fecha), con opción de reenviar.
- **CA-7** En local y en los previews, los emails no salen a destinatarios reales: se capturan.
- **CA-8** El remitente es `hello@<dominio>` (p. ej. `hello@sijoukosmetik.ch`, se fija con N-01). Las respuestas llegan al buzón de la tienda.

## Estrategia de pruebas
- Unitarias: cálculo de la espera entre reintentos, idempotencia, plantilla según el idioma.
- E2E: una acción que encola un email; se comprueba que aparece en la captura con el idioma correcto.

## Casos límite y errores
- Si el email del destinatario rebota, se marca como rebotado y no se reintenta.

## Fuera de alcance
- Newsletter y emails de marketing.

## Dudas
- Ninguna.
