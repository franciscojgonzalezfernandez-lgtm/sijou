# F-070 — Endurecimiento de seguridad

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RNF-07, RNF-08, RNF-09 |
| Depende de | todas las P0 |

## Contexto
Una revisión de seguridad completa antes de abrir la tienda.

## Historias de usuario
- **HU-1** Como responsable de la tienda, quiero lanzar sin vulnerabilidades conocidas y sabiendo que puedo recuperar los datos.

## Criterios de aceptación
- **CA-1** Cabeceras: CSP estricta (con nonces), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `frame-ancestors`. La CSP permite solo Stripe y los servicios aprobados.
- **CA-2** Límites de intentos en el login, el registro, la recuperación de contraseña, el contacto, la búsqueda y la creación de sesiones de checkout.
- **CA-3** Revisión de OWASP ASVS nivel 1 documentada, sin hallazgos altos abiertos.
- **CA-4** Todas las acciones del panel comprueban el rol en el servidor (una prueba automática recorre todas las acciones como `customer` y espera un 403).
- **CA-5** Sin dependencias con vulnerabilidades altas o críticas.
- **CA-6** Se ha probado una restauración de la base de datos a un momento concreto en una rama de Neon, y el procedimiento está documentado.
- **CA-7** Los secretos están solo en Vercel. El escaneo de secretos del repositorio está limpio.
- **CA-8** Los webhooks y los endpoints de cron están protegidos con firma o secreto.
- **CA-9** Análisis de seguridad exhaustivo asistido por modelos de IA (código, configuración, dependencias y flujos de pago y autenticación), con el informe y los hallazgos resueltos documentados.

## Estrategia de pruebas
- E2E: comprobación de las cabeceras, prueba de permisos sobre todas las acciones del panel y prueba de límites de intentos.

## Casos límite y errores
- La CSP no debe romper el checkout integrado de Stripe, el login con Google o Apple, ni Vercel Analytics.

## Fuera de alcance
- Pentest externo: no se contrata.

## Dudas
- Ninguna.
