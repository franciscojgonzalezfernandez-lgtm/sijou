# F-013 — Stock por lotes

| Campo | Valor |
|---|---|
| Estado | Hecha (28-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-STK-01, 02, 05, 06, 08 |
| Depende de | F-011 |

## Contexto
El stock de cada variante se gestiona por lotes, con número de lote y fecha de caducidad, para poder hacer retiradas y vender primero lo que caduca antes.

## Historias de usuario
- **HU-1** Como administradora, quiero registrar la entrada de un lote con su número, cantidad y caducidad.
- **HU-2** Como administradora, quiero corregir el stock indicando el motivo.
- **HU-3** Como administradora, quiero ver todo el historial de movimientos de una variante.

## Criterios de aceptación
- **CA-1** Un lote tiene: variante, código de lote, cantidad inicial, cantidad disponible, fecha de entrada y fecha de caducidad (opcional).
- **CA-1b** Una variante puede tener a la vez varios lotes con fechas de caducidad distintas (tandas distintas).
- **CA-2** El stock disponible de una variante es la suma de la cantidad disponible de sus lotes no caducados.
- **CA-3** Las salidas de stock consumen primero el lote con la caducidad más próxima. Los lotes sin caducidad se consumen al final, y entre ellos el más antiguo primero.
- **CA-4** Ajuste manual: cantidad positiva o negativa, lote, y un motivo de una lista (entrada de mercancía, rotura, regalo, corrección, otro). Si el motivo es "otro", el comentario es obligatorio.
- **CA-5** Ninguna operación deja un lote en negativo. Si se intenta, se rechaza.
- **CA-6** Todo cambio crea un movimiento con fecha, variante, lote, cantidad, motivo, referencia (pedido, ajuste, caducidad) y autor (usuario o "sistema"). Los movimientos no se pueden editar ni borrar.
- **CA-7** La ficha de la variante en el panel muestra el stock total, el desglose por lote y el historial filtrable.
- **CA-8** Dos operaciones simultáneas sobre la misma variante nunca dejan el stock en un estado incoherente.

## Estrategia de pruebas
- Unitarias (100 % de ramas): orden FEFO, cálculo del stock disponible, rechazo de negativos.
- Integración: concurrencia, con 2 transacciones simultáneas que intentan coger la última unidad.
- E2E: dar de alta 2 lotes con caducidades distintas, hacer un ajuste manual y revisar el historial.

## Casos límite y errores
- Un lote con caducidad ya pasada en el momento del alta: se avisa y no suma al stock disponible.

## Fuera de alcance
- Varios almacenes.

## Dudas
- Ninguna.
