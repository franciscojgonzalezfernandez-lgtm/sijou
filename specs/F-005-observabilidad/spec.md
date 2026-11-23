# F-005 — Observabilidad y analítica

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RNF-12, RF-MET-02; ADR-12 |
| Depende de | F-002 |

## Contexto
Enterarnos de los errores antes que los clientes y medir el rendimiento real, sin cookies de seguimiento.

## Historias de usuario
- **HU-1** Como desarrollador, quiero recibir un aviso cuando falle algo en producción, con el contexto necesario para arreglarlo.
- **HU-2** Como responsable de la tienda, quiero saber cuántas visitas hay y desde qué países, sin molestar con banners de cookies.

## Criterios de aceptación
- **CA-1** Los errores del servidor y del navegador llegan a Sentry (región UE) con entorno, versión y ruta.
- **CA-2** Sentry no recibe datos personales: los emails, direcciones y tokens se ocultan antes de enviarse.
- **CA-3** Hay una alerta por email cuando falla un webhook de Stripe o cuando un email se reintenta 3 veces sin éxito.
- **CA-4** Vercel Web Analytics y Speed Insights están activos solo en producción y no ponen cookies.
- **CA-5** El script de Sentry en el navegador no baja Lighthouse de 90. Se carga de forma diferida si hace falta.

## Estrategia de pruebas
- Unitarias: la función que oculta datos personales.
- E2E: una ruta de prueba, solo en preview, que lanza un error; se comprueba que se captura (con un transporte de prueba).

## Casos límite y errores
- Si Sentry no responde, la aplicación sigue funcionando con normalidad.

## Fuera de alcance
- Panel de métricas de negocio (F-100).

## Dudas
- Ninguna.
