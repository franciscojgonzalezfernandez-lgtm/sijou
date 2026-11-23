# F-002 — Esqueleto de la aplicación y entornos

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RNF-05, RNF-06, RNF-07; ADR-02, ADR-03 |
| Depende de | F-001, N-03 |

## Contexto
Una única aplicación Next.js que contiene la tienda, el panel (Payload) y la API, desplegada en Vercel con la base de datos en Neon Frankfurt. Cada PR tiene su propio entorno de preview con su propia base de datos.

## Historias de usuario
- **HU-1** Como desarrollador, quiero un entorno de preview aislado por PR para probar sin tocar los datos reales.
- **HU-2** Como administradora, quiero entrar al panel en `/admin` desde el dominio de la tienda.

## Criterios de aceptación
- **CA-1** Hacer push a `main` despliega en producción. Abrir un PR crea un deploy de preview con su URL.
- **CA-2** Cada preview usa una rama de base de datos propia, creada a partir de producción (o de datos de prueba) y borrada al cerrar el PR.
- **CA-3** Las funciones se ejecutan en `fra1` y la base de datos está en `aws-eu-central-1`.
- **CA-4** `/admin` muestra el panel en español y pide iniciar sesión.
- **CA-5** Las migraciones de base de datos se aplican en el despliegue, de forma versionada y reproducible.
- **CA-6** Hay un `.env.example` con todas las variables necesarias y sin valores reales. La app no arranca si falta una variable obligatoria, y el error dice cuál falta.
- **CA-7** Un script carga datos de prueba (productos, categorías, usuarios de prueba) en local y en los previews.
- **CA-8** El panel no aparece en ningún índice de buscadores (`noindex` y excluido en `robots.txt`).

## Estrategia de pruebas
- Unitarias: validación de las variables de entorno.
- E2E: carga de la página inicial y del login del panel en el preview.

## Casos límite y errores
- Si falla una migración, el despliegue se cancela y producción no cambia.

## Fuera de alcance
- Dominio definitivo (F-072).

## Dudas
- Ninguna.
