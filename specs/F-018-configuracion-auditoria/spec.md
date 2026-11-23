# F-018 — Configuración general y auditoría

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-ADM-03, RF-ADM-04 |
| Depende de | F-002 |

## Contexto
Los parámetros del negocio se cambian desde el panel, sin tocar código, y queda registro de quién cambió qué.

## Historias de usuario
- **HU-1** Como administradora, quiero cambiar el umbral de stock bajo sin pedírselo al técnico.
- **HU-2** Como webadmin, quiero saber quién cambió un precio y cuándo.

## Criterios de aceptación
- **CA-1** Pantalla de configuración con: datos de la tienda (nombre, email de contacto, dirección para el Impressum), umbral de stock bajo, días de antelación para la caducidad, días para el aviso de lotes a punto de caducar, emails que reciben los avisos y umbral de envío gratis (lo usa F-031).
- **CA-2** Los valores se validan (números ≥ 0, emails válidos) y tienen valores por defecto razonables.
- **CA-3** Se registra en auditoría cada creación, edición, borrado y cambio de estado de productos, variantes, stock, precios, promociones, pedidos y configuración: quién, cuándo, qué entidad y qué cambió (antes y después).
- **CA-4** El registro de auditoría solo se puede leer: se puede filtrar por entidad, usuario y fecha, y no se puede editar.
- **CA-5** El registro de auditoría no guarda contraseñas ni tokens.
- **CA-6** La auditoría se conserva 10 años.

## Estrategia de pruebas
- Unitarias: cálculo de las diferencias entre antes y después, exclusión de campos sensibles.
- E2E: cambiar el umbral → aparece en la auditoría con el valor anterior y el nuevo.

## Casos límite y errores
- No se contemplan ediciones simultáneas: son 2 administradores y no se dará el caso. Si ocurre, gana el último guardado.

## Fuera de alcance
- Roles con permisos distintos.

## Dudas
- Ninguna.
