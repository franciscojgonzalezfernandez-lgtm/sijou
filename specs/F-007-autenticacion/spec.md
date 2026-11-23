# F-007 — Autenticación

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CLI-02, RF-CLI-05, RF-ADM-01; ADR-04 |
| Depende de | F-002, F-006 |

## Contexto
Los clientes crean cuenta con Google, Apple o email. Los dos administradores entran al panel con Google o con email y contraseña.

## Historias de usuario
- **HU-1** Como cliente, quiero registrarme con Google o Apple en un clic.
- **HU-2** Como cliente, quiero registrarme con email y contraseña y verificar mi email.
- **HU-3** Como cliente, quiero recuperar mi contraseña si la olvido.
- **HU-4** Como administrador, quiero entrar al panel con mi cuenta. Nadie más debe poder hacerlo.

## Criterios de aceptación
- **CA-1** Registro e inicio de sesión con Google, Apple y email + contraseña.
- **CA-2** El registro con email envía un enlace de verificación (F-006) en el idioma activo. Hasta verificarlo, la cuenta tiene el estado `no verificada`.
- **CA-3** La recuperación de contraseña envía un enlace de un solo uso que caduca en 1 hora.
- **CA-4** Sin requisitos de longitud ni de complejidad en la contraseña, para reducir fricción (decisión de negocio). Solo se exige que no esté vacía. Se guarda con hash.
- **CA-5** Después de 5 intentos fallidos en 15 minutos, se limitan los intentos por IP y por cuenta.
- **CA-6** Hay dos roles: `customer` y `admin`. Solo `admin` puede entrar en `/admin` y en las acciones del panel. Esto se comprueba en el servidor.
- **CA-7** Los administradores no se pueden registrar desde la web. Se crean con un script o desde el panel.
- **CA-8** Si el email de Google o Apple coincide con una cuenta de email ya verificada, las cuentas se vinculan.
- **CA-9** La sesión se guarda en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`, y se puede cerrar desde cualquier página.
- **CA-10** Todas las pantallas de autenticación están en es, en y de, y cumplen WCAG AA (errores anunciados, autocompletado correcto).

## Estrategia de pruebas
- Unitarias: comprobación de permisos por rol.
- E2E: registro con email, verificación (enlace capturado), login, logout, recuperación de contraseña, y bloqueo de `/admin` para un `customer`. El login social se prueba con un proveedor simulado.

## Casos límite y errores
- Si un enlace de verificación caducado o ya usado se vuelve a abrir, se muestra un mensaje y la opción de reenviarlo.
- Si se registra un email que ya existe, el mensaje no revela si la cuenta existe.

## Fuera de alcance
- 2FA (decisión del negocio).

## Dudas
- Ninguna.
