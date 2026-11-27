# F-053 — Cumplimiento legal en la web

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026). los textos dependen de N-06 |
| Prioridad | P0 |
| Requisitos PRD | PRD §7 (L-01…L-09) |
| Depende de | F-050, N-06 |

## Contexto
Lo que la ley exige ver en la web: identidad de la tienda, condiciones, privacidad, cambios y desistimiento. Los textos los aporta la asesoría legal. Esta feature los muestra y se asegura de que cumplen lo exigido.

## Historias de usuario
- **HU-1** Como cliente, quiero saber quién vende, en qué condiciones y qué se hace con mis datos.
- **HU-2** Como tienda, quiero cumplir la ley suiza y la de la UE si vendo allí.

## Criterios de aceptación
- **CA-1** Páginas en los 3 idiomas: Impressum / Aviso legal, Condiciones generales, Política de privacidad, Política de cambios y devoluciones (incluye el desistimiento de 14 días para consumidores de la UE, con el formulario modelo y la excepción por higiene) y Envíos.
- **CA-2** Las páginas legales están enlazadas desde el pie, y se puede llegar a ellas en 2 clics desde cualquier página.
- **CA-3** El checkout muestra antes de pagar los enlaces a las condiciones y a la privacidad. No hay casilla de aceptación, porque no es obligatoria.
- **CA-4** Las páginas legales guardan versión y fecha. El pedido registra qué versión de las condiciones estaba vigente al comprar.
- **CA-5** No hay banner de cookies si solo se usan cookies técnicas y analítica sin cookies. Si se añade algo no esencial, el banner va primero y sin nada marcado por defecto.
- **CA-6** El precio por unidad aparece donde se muestra el precio (F-022, F-021) para cumplir la PAngV alemana.
- **CA-7** La política de privacidad lista los encargados del tratamiento (Stripe, Vercel, Neon, Resend, Sentry, Google y Apple para el login) y la transferencia a la UE (Frankfurt).

## Estrategia de pruebas
- Unitarias: asociación de la versión de las condiciones al pedido.
- E2E: enlaces del pie en los 3 idiomas; enlaces legales en el checkout; ninguna cookie no esencial antes del consentimiento (inspección de cookies).

## Casos límite y errores
- Clientes de Alemania: el botón final de pago debe dejar claro que el pedido obliga a pagar ("zahlungspflichtig bestellen"). Hay que verificar el texto del botón de Stripe con la asesoría.
- Al publicar una nueva versión de las condiciones, los pedidos anteriores mantienen la suya.

## Fuera de alcance
- Redactar los textos legales (es tarea de la asesoría).

## Dudas
- Ninguna.

## Notas de otras features
- **F-018 (27-11-2026):** el registro de auditoría guarda el email del administrador que hizo cada cambio y se conserva 10 años. La política de privacidad lo menciona. El Impressum usa `impressumAddress` y `contactEmail` de la Configuración (`getSettings()`).
