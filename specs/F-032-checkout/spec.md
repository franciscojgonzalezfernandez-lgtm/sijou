# F-032 — Checkout con Stripe

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CHK-01, 04, 05; RF-CLI-01, 04; ADR-05 |
| Depende de | F-030, F-031, F-016, N-02 |

## Contexto
El pago se hace con Stripe Checkout integrado en la web, con tarjeta, TWINT, Apple Pay y Google Pay, como invitado o con cuenta.

## Historias de usuario
- **HU-1** Como cliente, quiero pagar con TWINT o con tarjeta sin salir de la web.
- **HU-2** Como cliente sin cuenta, quiero comprar sin registrarme.
- **HU-3** Como empresa, quiero indicar mi razón social y mi número de IVA.

## Criterios de aceptación
- **CA-1** El servidor revalida el carrito antes de crear la sesión de pago: precios, promociones, stock, país y packaging. Si algo ha cambiado, el cliente vuelve al carrito con un aviso.
- **CA-2** La sesión de Stripe se crea en CHF con las líneas, el packaging y el envío calculados por el servidor, el email del cliente (si tiene sesión) y el idioma activo.
- **CA-3** Métodos de pago: tarjeta, TWINT, Apple Pay y Google Pay como mínimo, más los que active la clienta en Stripe.
- **CA-4** Se pide la dirección de envío, limitada a los países con zona de envío. El teléfono es opcional.
- **CA-5** Campos opcionales de empresa: razón social y número de IVA/UID.
- **CA-6** La compra como invitado está permitida. Al terminar, se ofrece crear una cuenta con el mismo email.
- **CA-7** La página de confirmación muestra el número de pedido y el resumen cuando el pago está confirmado. Si el pago está pendiente, dice que se está procesando.
- **CA-8** Si el pago se cancela o falla, el cliente vuelve al carrito intacto.
- **CA-9** En la página de checkout, todo lo que no es el iframe de Stripe cumple WCAG AA y Lighthouse ≥ 90.
- **CA-10** En preview y en local se usa siempre el modo test de Stripe.

## Estrategia de pruebas
- Unitarias: construcción del payload de la sesión de Stripe a partir del carrito.
- E2E: carrito → checkout → pagar con una tarjeta de prueba en modo test → confirmación; cancelar → carrito intacto; cambio de precio entre medias → vuelta con aviso.

## Casos límite y errores
- Dos pestañas pagando el mismo carrito: el webhook (F-033) evita crear el pedido dos veces.
- Si el importe supera 5000 CHF, TWINT no aparece (límite de Stripe).

## Fuera de alcance
- Códigos de descuento en el checkout (F-101) y facturas (F-103).

## Dudas
- Ninguna.
