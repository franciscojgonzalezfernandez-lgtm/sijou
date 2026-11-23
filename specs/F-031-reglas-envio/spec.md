# F-031 — Envíos: zonas, tarifas fijas y países

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026). Valores bloqueados por N-08 |
| Prioridad | P0 |
| Requisitos PRD | RF-CHK-03 |
| Depende de | F-018, N-08 |

## Contexto
La tienda cobra tarifas de envío fijas por zona, ajustadas a sus márgenes, con un umbral de envío gratis. Todo se gestiona desde una sección **Envíos** del panel, que permite también bloquear países.

## Historias de usuario
- **HU-1** Como administradora, quiero definir zonas con una tarifa fija y decidir a qué países no se envía.
- **HU-2** Como cliente, quiero saber si mi país tiene envío y cuánto cuesta.

## Criterios de aceptación
- **CA-1** El panel tiene una sección **Envíos** con las zonas, sus países, su tarifa, el umbral de envío gratis y la lista de países bloqueados.
- **CA-2** Una zona tiene nombre, lista de países (ISO 3166) y una **tarifa fija** en CHF. Un país pertenece como máximo a una zona.
- **CA-3** Umbral de envío gratis, general o por zona. Si el subtotal lo supera, el envío cuesta 0.
- **CA-4** **Países bloqueados:** la administradora puede bloquear cualquier país. Un país bloqueado, o que no está en ninguna zona, no aparece en el selector y no admite pedidos.
- **CA-5** El segundo envío de una reserva (F-060) no se cobra al cliente y se registra como pagado por la tienda.
- **CA-6** El envío de vuelta de un cambio (F-044) corre a cargo de la tienda.
- **CA-7** Suiza tiene que estar siempre en una zona (es requisito para usar TWINT). El panel impide bloquearla.
- **CA-8** El cálculo es una función pura: dados el país, el subtotal y la configuración, devuelve el precio.

## Estrategia de pruebas
- Unitarias (100 % de ramas): tarifa por zona, umbral (límite exacto), país bloqueado, país sin zona.
- E2E: crear una zona → el carrito muestra la tarifa → al superar el umbral, el envío sale gratis → bloquear un país → desaparece del selector.

## Casos límite y errores
- Si se bloquea un país con carritos abiertos que lo usan, esos carritos piden elegir otro país.

## Fuera de alcance
- Tarifas por peso o por tramos, y tarifas en tiempo real del transportista.

## Dudas
- [DUDA TA-01: valores concretos de países, tarifas y umbral, y aduanas (DAP o DDP).]
