# F-072 — Puesta en producción

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | — |
| Depende de | F-071, N-01, N-02, N-03 |

## Contexto
El paso a producción del 1 de febrero de 2027.

## Historias de usuario
- **HU-1** Como responsable de la tienda, quiero que la tienda esté en mi dominio, cobrando de verdad y visible en Google.

## Criterios de aceptación
- **CA-1** El dominio apunta a Vercel con HTTPS. Las variantes con `www` y sin `www` redirigen a una sola versión canónica.
- **CA-2** Stripe en modo live, con el webhook de producción registrado y verificado, y TWINT activo.
- **CA-3** El dominio de envío de emails está verificado y se han enviado emails de prueba a Gmail, Outlook y Proton sin que caigan en spam.
- **CA-4** Search Console verificado, con los sitemaps de los 3 idiomas enviados.
- **CA-5** Las alertas de Sentry y de los webhooks llegan a los dos administradores.
- **CA-6** Se han borrado los datos de prueba de producción y se han creado las cuentas de los dos administradores.
- **CA-7** Hay un plan de vuelta atrás documentado (volver al deploy anterior y restaurar la base de datos).
- **CA-8** Hay una guía breve en español para la administradora: alta de producto, lotes, pedidos, envíos, reembolsos y contenido.

## Estrategia de pruebas
- Prueba de humo en producción después del despliegue (lectura y una compra de prueba con reembolso).

## Casos límite y errores
- Si la prueba de humo falla, se vuelve al deploy anterior.

## Fuera de alcance
- Campañas de marketing de lanzamiento.

## Dudas
- Ninguna.
