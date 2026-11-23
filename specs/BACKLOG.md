# Backlog de features

Fuente: [PRD](../docs/PRD.md) · [Arquitectura](../docs/ARCHITECTURE.md) · Proceso: [SDD](./README.md)

**Prioridades:**
- **P0:** imprescindible para el lanzamiento del 1-feb-2027.
- **P1:** en el lanzamiento si da tiempo, si no justo después.
- **Post:** después del MVP.

**Estados:** ⬜ Pendiente · 📝 Spec · 📐 Plan · 🔨 En curso · ✅ Hecha

**Regla común:** toda feature con interfaz pública cumple Lighthouse 100 × 4 y WCAG 2.2 AA antes de marcarse como Hecha.

---

## Tareas no técnicas (en paralelo, las lleva el negocio)

| ID | Tarea | Responsable | Bloquea a | Estado |
|---|---|---|---|---|
| N-01 | Comprar el dominio y configurar el DNS | Técnico | F-002, F-006 | ⬜ |
| N-02 | Cuenta de Stripe (CH), verificación y alta de TWINT | Clienta | F-032 | ⬜ |
| N-03 | Equipo Vercel Pro (propiedad de la clienta) e invitación al técnico | Clienta | F-002 | ⬜ |
| N-04 | Identidad de marca: logo, colores, tipografías, fotos | Clienta | F-004 | ⬜ |
| N-05 | Estudio de competidores y palabras clave por mercado (RF-SEO-08) | Técnico + clienta | F-025, F-051 | ⬜ |
| N-06 | Textos legales y revisión jurídica (PRD §7) | Clienta + asesor | F-053 | ⬜ |
| N-07 | Cerrar los temas abiertos del PRD (TA-01…TA-16) | Clienta + técnico | Según el TA | ⬜ |
| N-08 | Tarifas y países de envío (TA-01) | Clienta | F-031 | ⬜ |
| N-09 | Contenido inicial: 3 productos traducidos, páginas, primeros artículos | Clienta | Lanzamiento | ⬜ |

---

## Fase 0 — Plataforma

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-001 | **Repo y calidad**: TypeScript estricto, lint, formato, Vitest, Playwright + axe, CI en GitHub Actions, **Lighthouse CI con puerta 100 × 4** | RNF-11, RNF-15 | — | P0 | ⬜ |
| F-002 | **Esqueleto de la app**: Next.js + Payload 3 + Neon (Frankfurt) + Vercel (fra1), ramas de Neon por preview, variables de entorno | ADR-02/03 | F-001, N-03 | P0 | ⬜ |
| F-003 | **i18n base**: next-intl, rutas `/[locale]`, detección del idioma del navegador, EN por defecto, selector, mapa de slugs traducidos | RF-I18N | F-002 | P0 | ⬜ |
| F-004 | **Sistema de diseño accesible**: tokens, paleta AA/AAA, tipografía, componentes base (botón, campo, diálogo, toast, skeleton) | RNF-03 | F-002, N-04 | P0 | ⬜ |
| F-005 | **Observabilidad**: Sentry (UE), Vercel Analytics y Speed Insights | ADR-12 | F-002 | P0 | ⬜ |
| F-006 | **Emails transaccionales**: Resend, dominio autenticado (SPF, DKIM, DMARC), cola de envíos con reintentos (cron), plantillas React Email en 3 idiomas | RNF-13, ADR-07 | F-002, N-01 | P0 | ⬜ |
| F-007 | **Autenticación**: Better Auth (Google, Apple, email y contraseña, verificación, recuperación), roles cliente y admin, acceso al panel | RF-CLI-02, RF-ADM-01 | F-002, F-006 | P0 | ⬜ |

## Fase 1 — Catálogo y stock (panel)

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-010 | **Productos**: campos traducibles, estados (borrador, publicado, oculto, archivado), publicación solo con los 3 idiomas completos, archivar frente a borrar | RF-CAT-01/02/03/06/09 | F-002, F-003 | P0 | ⬜ |
| F-011 | **Variantes e imágenes**: atributos tamaño, aroma y color, SKU, EAN, peso, cantidad neta; hasta 10 fotos asignables a variantes, con texto alternativo por idioma y orden | RF-CAT-04/05, L-05 | F-010 | P0 | ⬜ |
| F-012 | **Categorías y colecciones**: árbol de varios niveles, varias categorías por producto, textos, banner y SEO por idioma | RF-NAV-01/02/03 | F-010 | P0 | ⬜ |
| F-013 | **Stock por lotes**: lotes con caducidad, consumo FEFO, historial de movimientos, ajustes manuales con motivo | RF-STK-01/02/05/06/08 | F-011 | P0 | ⬜ |
| F-014 | **Automatizaciones de stock**: retirada de lotes caducados (cron), aviso de lote a punto de caducar, alerta de stock bajo con umbral general | RF-STK-03/07, RF-PED-08 | F-013, F-006 | P0 | ⬜ |
| F-015 | **Packs predefinidos**: componentes, stock calculado, descuento de los componentes al vender | RF-CAT-07 | F-013 | P0 | ⬜ |
| F-016 | **Opciones de packaging** para el pedido | RF-CAT-08 | F-010 | P0 | ⬜ |
| F-017 | **Promociones automáticas** (%, importe fijo; producto, categoría o colección; fechas) y **esquema de códigos de descuento** (sin interfaz) | RF-CHK-06/07 | F-012 | P0 | ⬜ |
| F-018 | **Configuración y auditoría**: ajustes generales del panel, registro de auditoría | RF-ADM-03/04 | F-002 | P0 | ⬜ |

## Fase 2 — Tienda pública

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-020 | **Estructura pública**: cabecera, pie, navegación por categorías, selector de idioma, 404 y página de error por idioma | RF-NAV, RF-I18N | F-003, F-004 | P0 | ⬜ |
| F-021 | **Listados** de categoría y colección (orden por defecto según TA-11), estados de stock en la tarjeta | RF-NAV-02/03/04 | F-012, F-020 | P0 | ⬜ |
| F-022 | **Ficha de producto**: selector de variantes, galería con zoom, "Solo quedan X" (≤5), "Agotado", precio de promoción, precio por unidad | RF-CAT-05/09/10, L-05 | F-011, F-017, F-020 | P0 | ⬜ |
| F-023 | **Búsqueda** tolerante a errores en el idioma activo (Postgres FTS + trigram) | RF-NAV-05 | F-010 | P0 | ⬜ |
| F-024 | **Inicio editable**: banners, destacados y barra de avisos | RF-CMS-01 | F-020 | P0 | ⬜ |
| F-025 | **SEO técnico**: metadatos automáticos, canonical, hreflang, sitemaps por idioma, robots, datos estructurados (Product, Offer, Breadcrumb, Article, Organization, FAQ), Open Graph, redirecciones 301 al cambiar un slug | RF-SEO-01…07 | F-021, F-022 | P0 | ⬜ |

## Fase 3 — Compra

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-030 | **Carrito**: añadir y quitar, país de envío, recálculo en servidor de precios, promociones y stock | RF-CHK-02/03 | F-022 | P0 | ⬜ |
| F-031 | **Reglas de envío**: zonas, tramos por importe, umbral de envío gratis | RF-CHK-03 | F-018, N-08 | P0 | ⬜ |
| F-032 | **Checkout Stripe integrado** (tarjeta, TWINT, Apple Pay, Google Pay), packaging, compra como invitado y datos de empresa | RF-CHK-01/04/05, RF-CLI-01/04 | F-030, F-031, F-016, N-02 | P0 | ⬜ |
| F-033 | **Webhook de pago → pedido**: idempotente, descuento FEFO en transacción, gestión de stock insuficiente, email de confirmación | RF-STK-04, RF-CHK-05, ADR-06 | F-032, F-013, F-006 | P0 | ⬜ |
| F-034 | **Cuenta del cliente**: historial y seguimiento, direcciones, lista de deseos, repetir pedido, idioma, exportar y borrar datos | RF-CLI-03/05 | F-007, F-033 | P0 | ⬜ |

## Fase 4 — Operaciones (panel)

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-040 | **Gestión de pedidos**: listado con filtros, detalle, estados, varios envíos con seguimiento, notas, exportación CSV, uso cómodo en móvil | RF-PED-01/02/07, RF-ADM-02 | F-033 | P0 | ⬜ |
| F-041 | **Emails del ciclo del pedido**: enviado (con seguimiento) y entregado (con petición de opinión, TA-12); avisos al admin de pedidos nuevos | RF-PED-03/08 | F-040, F-006 | P0 | ⬜ |
| F-042 | **Edición del pedido antes del envío**: dirección, añadir, quitar o sustituir líneas; recálculo del stock y de la diferencia de precio (TA-05) | RF-PED-04 | F-040 | P0 | ⬜ |
| F-043 | **Reembolsos** totales y parciales vía Stripe, con devolución opcional al stock | RF-PED-05 | F-040 | P0 | ⬜ |
| F-044 | **Cambios y devoluciones**: registro, envío de sustitución, envío de vuelta a cargo de la tienda | RF-PED-06 | F-040, F-013 | P0 | ⬜ |

## Fase 5 — Contenido

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-050 | **Páginas del CMS**: Sobre nosotros, Nuestra filosofía de vida, Preguntas frecuentes, Glosario de ingredientes, páginas legales | RF-CMS-02/04 | F-020 | P0 | ⬜ |
| F-051 | **Blog**: artículos en 3 idiomas, categorías, productos enlazados, SEO | RF-CMS-03 | F-050, F-025 | P0 | ⬜ |
| F-052 | **Contacto**: página y formulario con protección antispam (TA-15) | RF-CMS-02 | F-050, F-006 | P0 | ⬜ |
| F-053 | **Cumplimiento legal en la web**: Impressum, condiciones, privacidad, política de cambios y desistimiento, banner de cookies solo si hace falta | PRD §7 | F-050, N-06 | P0 | ⬜ |

## Fase 6 — Demanda (P1)

| ID | Feature | PRD | Depende de | Prio | Estado |
|---|---|---|---|---|---|
| F-060 | **Reservas con pago anticipado**: fecha máxima, carrito mixto, segundo envío gratis, asignación por orden de llegada al entrar un lote | RF-RES-01…05 | F-033, F-013 | P1 | ⬜ |
| F-061 | **Fecha máxima superada**: email para elegir entre esperar o cancelar con reembolso | RF-RES-06 | F-060, F-043 | P1 | ⬜ |
| F-062 | **Panel de reservas**, ordenable por número de reservas o antigüedad | RF-RES-07 | F-060 | P1 | ⬜ |
| F-063 | **Avísame cuando vuelva**: suscripción (cuenta verificada), envío a todos al reponer, gestión en la cuenta | RF-AVI | F-007, F-013, F-006 | P1 | ⬜ |

## Fase 7 — Lanzamiento

| ID | Feature | Depende de | Prio | Estado |
|---|---|---|---|---|
| F-070 | **Endurecimiento**: límites de intentos, cabeceras de seguridad y CSP, prueba de restauración de copia, revisión OWASP | todas las P0 | P0 | ⬜ |
| F-071 | **Auditoría final**: Lighthouse 100 × 4 en producción en los 3 idiomas, WCAG manual con lector de pantalla, compra real de prueba con TWINT y tarjeta | todas las P0 | P0 | ⬜ |
| F-072 | **Puesta en producción**: dominio, Stripe en modo live, Search Console y envío de sitemaps, alertas | F-071, N-01 | P0 | ⬜ |

## Post-MVP

| ID | Feature | PRD |
|---|---|---|
| F-100 | Panel de métricas (pedidos, facturación, ticket medio, más vendidos, demanda de productos agotados, conversión) | RF-MET |
| F-101 | Interfaz de códigos de descuento (el esquema ya está listo) | RF-CHK-07 |
| F-102 | Emails de carrito abandonado | — |
| F-103 | Facturas en PDF (si se confirma TA-03) | RF-CHK-08 |
| F-104 | Productos relacionados | — |
| F-105 | Filtros por atributos y selector de orden | RF-NAV-04 |
| F-106 | Reseñas y valoraciones | — |
| F-107 | Newsletter | — |
| F-108 | Etiquetas de envío integradas con un transportista | — |
| F-109 | Precios para empresas (si se confirma TA-02) | RF-CLI-04 |

---

## Camino crítico propuesto

F-001 → F-002 → F-003 → F-010 → F-011 → F-013 → F-022 → F-030 → F-032 → F-033 → F-040 → F-071 → F-072

Las features de diseño (F-004) y contenido (F-050…F-053) avanzan en paralelo en cuanto lleguen N-04 y N-06.
