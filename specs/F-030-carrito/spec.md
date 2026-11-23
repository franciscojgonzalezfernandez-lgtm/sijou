# F-030 — Carrito

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CHK-02, RF-CHK-03; constitución IV |
| Depende de | F-022 |

## Contexto
El carrito guarda lo que el cliente quiere comprar y calcula los totales en el servidor, sin reservar stock.

## Historias de usuario
- **HU-1** Como cliente, quiero añadir, cambiar cantidades y quitar productos.
- **HU-2** Como cliente, quiero ver cuánto costará el envío a mi país antes de pagar.
- **HU-3** Como cliente que inicia sesión, quiero conservar lo que tenía en el carrito como invitado.

## Criterios de aceptación
- **CA-1** El carrito funciona sin cuenta (cookie) y con cuenta. Al iniciar sesión se fusionan los dos y se suman las cantidades.
- **CA-2** Línea: foto, nombre, variante, precio unitario (con promoción), cantidad editable y subtotal. Se puede eliminar.
- **CA-3** La cantidad está limitada al stock disponible (salvo en reserva, F-060). Si el stock baja después, la línea se marca y se ajusta al entrar en el carrito.
- **CA-4** El cliente elige el país de envío en el carrito, y se muestran el coste de envío (F-031) y lo que falta para el envío gratis.
- **CA-5** Resumen: subtotal, descuentos, packaging, envío y total, en CHF y calculados en el servidor.
- **CA-6** Los productos despublicados o las variantes desactivadas se marcan como no disponibles y no cuentan para el total.
- **CA-7** El carrito no retiene stock.
- **CA-8** Un carrito de invitado caduca a los 30 días.
- **CA-9** Los cambios en el carrito se anuncian a los lectores de pantalla y funcionan con teclado.

## Estrategia de pruebas
- Unitarias (100 % de ramas): cálculo de totales, fusión de carritos, límite por stock.
- E2E: añadir 2 productos, cambiar la cantidad, cambiar de país (cambia el envío), iniciar sesión (se fusiona), producto despublicado (se marca); axe.

## Casos límite y errores
- Si el precio cambia mientras el producto está en el carrito, se muestra el precio nuevo con un aviso.

## Fuera de alcance
- Carrito abandonado (F-102) y guardar para más tarde.

## Dudas
- Ninguna.
