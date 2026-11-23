# F-034 — Cuenta del cliente

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CLI-03, RF-CLI-05 |
| Depende de | F-007, F-033 |

## Contexto
Un área privada donde el cliente ve sus pedidos, gestiona sus datos y repite compras.

## Historias de usuario
- **HU-1** Como cliente, quiero ver mis pedidos y su seguimiento.
- **HU-2** Como cliente, quiero guardar direcciones y productos favoritos.
- **HU-3** Como cliente, quiero repetir un pedido en un clic.
- **HU-4** Como cliente, quiero descargar o borrar mis datos personales.

## Criterios de aceptación
- **CA-1** Historial de pedidos con número, fecha, estado, total y detalle, incluidos los envíos con enlace de seguimiento.
- **CA-2** Direcciones: crear, editar, borrar y elegir la predeterminada.
- **CA-3** Lista de deseos: añadir y quitar desde la ficha o el listado. Los productos no disponibles se marcan.
- **CA-4** "Repetir pedido" añade al carrito las líneas que siguen disponibles y avisa de las que no.
- **CA-5** Idioma preferido, que se usa en los emails.
- **CA-6** Gestión de reservas y avisos (cuando F-060 y F-063 estén activos).
- **CA-7** Exportar mis datos: descarga un JSON con el perfil, las direcciones y los pedidos.
- **CA-8** Borrar mi cuenta: se borran los datos personales. Los pedidos se conservan anonimizados por la obligación legal de 10 años. Hay que confirmarlo.
- **CA-9** Si un invitado crea una cuenta con el mismo email, sus pedidos como invitado pasan a la cuenta cuando verifica el email.
- **CA-10** Todo el área lleva `noindex`, requiere sesión y cumple WCAG AA.
- **CA-11** En "Mis pedidos" hay un apartado "¿Problema con tu envío? Escríbenos y te ayudaremos", que abre el email o el formulario de contacto con el número de pedido ya rellenado (F-044, F-052).
- **CA-12** Los pagos pendientes (diferencias por editar un pedido, F-042) aparecen con un botón **Pagar** y su fecha límite.
- **CA-13** Se muestra el saldo a favor y su historial (F-045).

## Estrategia de pruebas
- Unitarias: anonimización y repetición de un pedido con productos no disponibles.
- E2E: login → historial → seguimiento → repetir pedido → añadir dirección → lista de deseos → exportar → borrar cuenta.

## Casos límite y errores
- Un cliente no puede ver los pedidos de otro: cambiar el id en la URL da 404.

## Fuera de alcance
- Programa de puntos.

## Dudas
- Ninguna.
