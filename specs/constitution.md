# Constitución del proyecto

Reglas que **ninguna feature puede saltarse**. Cada `plan.md` debe declarar que las cumple, o justificar por escrito cualquier excepción. Una excepción necesita la aprobación explícita del responsable técnico.

## I. Calidad web: Lighthouse 100 × 4
- **Rendimiento, Accesibilidad, Buenas prácticas y SEO = 100** en Lighthouse, con el perfil móvil, en todas las plantillas públicas y en los 3 idiomas.
- Lo verifica **Lighthouse CI** sobre el deploy de preview de cada PR. Si una puntuación baja de 100, el PR no se puede fusionar.
- Presupuestos (p75, móvil): LCP < 2,5 s, INP < 200 ms, CLS < 0,1. JavaScript inicial por ruta pública < 100 kB gzip.
- **Ninguna librería de terceros en la parte pública** sin justificarlo en el plan y medirlo antes y después.
- **Excepción conocida:** la página de checkout incluye el iframe de Stripe. Si este impide llegar a 100, se documenta, y no se pierde puntuación por nada propio.

## II. Accesibilidad
- Mínimo WCAG 2.2 AA, con contraste AAA en texto siempre que se pueda.
- Todo se puede usar con teclado y con lector de pantalla. HTML semántico antes que ARIA.
- axe-core sin violaciones en las pruebas de Playwright.

## III. SEO e internacionalización
- Ningún texto visible al cliente está escrito en el código: todo sale de los mensajes de next-intl o de la base de datos.
- Toda página pública tiene título, meta descripción, canonical, `hreflang` (es, en, de, x-default) y los datos estructurados que le correspondan.
- El HTML completo se renderiza en el servidor.

## IV. Integridad del dominio
- **El stock solo se modifica en transacciones** y siempre deja un registro en `stock_movement`. Ese registro nunca se edita ni se borra.
- **El dinero solo se mueve a través de Stripe.** Los webhooks son idempotentes y se verifica su firma.
- Los precios y los totales se calculan siempre en el servidor. Lo que envía el cliente nunca se da por bueno.

## V. Pruebas
- La lógica de dominio (stock, FEFO, reservas, promociones, envío) tiene pruebas unitarias **antes** de darse por terminada.
- Cada criterio de aceptación de una spec tiene al menos una prueba automática (unitaria, de integración o E2E) que apunta a su ID.

## VI. Seguridad y privacidad
- Secretos solo en variables de entorno. Nunca se suben al repositorio, que es público.
- Mínimo de datos personales. Cumplimiento de nLPD y RGPD. No se guardan datos de tarjeta.
- Autorización en el servidor en cada acción del panel.

## VII. Simplicidad
- Se elige la solución más simple que cumpla la spec. Sin abstracciones "por si acaso".
- Cada dependencia nueva se justifica en el plan.

## VIII. Idioma
- Código, commits y PRs: inglés.
- Specs y documentación funcional: español.
- Panel: español. Tienda pública: es, en, de.
