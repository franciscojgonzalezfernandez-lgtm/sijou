# F-052 — Contacto

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CMS-02 |
| Depende de | F-050, F-006 |

## Contexto
Que el cliente pueda escribir a la tienda fácilmente, sin que llegue spam.

## Historias de usuario
- **HU-1** Como cliente, quiero mandar una consulta desde la web.

## Criterios de aceptación
- **CA-1** Página de contacto con un formulario y el email de la tienda (`hello@<dominio>`). Más adelante se añadirá un teléfono.
- **CA-2** Formulario: nombre, email, número de pedido (opcional), asunto (lista) y mensaje, con un aviso de privacidad enlazado.
- **CA-3** Antispam sin CAPTCHA visual: un campo trampa oculto, un tiempo mínimo de envío y un límite de envíos por IP. Lighthouse no baja.
- **CA-4** El envío llega al email de la tienda con "responder a" el email del cliente, y el cliente recibe un acuse de recibo en su idioma.
- **CA-5** Los errores de validación son accesibles: van asociados a cada campo, se anuncian y llevan el foco al primer error.
- **CA-6** Los mensajes no se guardan en la base de datos más allá del registro de emails.

## Estrategia de pruebas
- Unitarias: validación y comprobaciones antispam.
- E2E: enviar → los 2 emails capturados; errores accesibles; envío de bot (campo trampa) rechazado sin decírselo; axe.

## Casos límite y errores
- Si el proveedor de email falla, el mensaje se encola y se reintenta (F-006). El cliente ve que se ha enviado.

## Fuera de alcance
- Chat en directo.

## Dudas
- Ninguna.
