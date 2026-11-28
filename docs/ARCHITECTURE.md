# Arquitectura — E-commerce de cosmética natural

| Campo | Valor |
|---|---|
| Versión | 0.1 (propuesta para discutir) |
| Fecha | 23-11-2026 |
| Basado en | [PRD v0.1](./PRD.md) |
| Estado | D-1 a D-6 aceptadas el 23-11-2026 |

---

## 1. Principios

1. **Un solo desarrollador y fecha fija (1-feb-2027).** Se prioriza comprar o usar componentes hechos frente a construir, siempre que no limite los requisitos del PRD.
2. **Todo en un único proyecto Next.js** (tienda, panel, API y webhooks) desplegado en Vercel. Sin microservicios.
3. **Postgres es la única fuente de verdad** de catálogo, stock, pedidos y contenido. Stripe es la fuente de verdad del dinero.
4. **SSR o estático cacheado para la parte pública** (SEO y Core Web Vitals). Renderizado dinámico solo donde haga falta (carrito, cuenta, checkout).
5. **Consistencia del stock en la base de datos**, con transacciones y bloqueos de fila, no en el cliente.
6. **Datos en Europa**, lo más cerca posible de Suiza.

## 2. Vista general

```
                ┌──────────────────────────── Vercel (fra1) ─────────────────────────────┐
 Navegador ───▶ │  Next.js App Router                                                     │
 (ES/EN/DE)     │   ├─ /[locale]/…        tienda pública (SSR + caché, next-intl)         │
                │   ├─ /[locale]/cuenta   área cliente (dinámico, con sesión)             │
                │   ├─ /admin             panel en español (ver ADR-03)                   │
                │   ├─ /api/webhooks/stripe   pago confirmado → pedido + stock            │
                │   └─ /api/cron/*        caducidades, plazos de reservas, reintentos     │
                └──────┬──────────────┬──────────────┬──────────────┬─────────────────────┘
                       │              │              │              │
                 Neon Postgres   Vercel Blob     Stripe          Resend
                 (Frankfurt)     (imágenes)   (Checkout,       (emails
                                              TWINT, refunds)   transaccionales)
```

## 3. Decisiones (ADR resumidas)

### ADR-01 — Plataforma: desarrollo propio frente a SaaS de e-commerce
- **Decisión:** desarrollo propio (lo decidió el equipo).
- **Alternativa descartada:** Shopify headless. Resuelve catálogo, carrito y checkout, pero no resuelve sin trabajo extra los lotes con caducidad, las reservas con fecha máxima y la cola de asignación, ni la publicación condicionada a 3 idiomas. Además tiene cuota mensual y comisiones.
- **Consecuencia:** asumimos construir catálogo, stock y pedidos. Stripe solo cobra.

### ADR-02 — Región de datos ⚠️ cambia el supuesto del PRD
- **Hecho:** Neon **no tiene región en Suiza**. En Europa ofrece Frankfurt (`aws-eu-central-1`) y Londres ([regiones de Neon](https://neon.com/docs/introduction/regions)).
- **ACEPTADA:** Neon en **Frankfurt** y funciones de Vercel en **`fra1`**, para que estén en la misma región y la latencia hacia la base de datos sea mínima.
- **Justificación legal:** Suiza reconoce a la UE como destino con protección adecuada (nLPD). Hay que declararlo en la política de privacidad.
- **Alternativa:** un Postgres gestionado en Suiza (p. ej. AWS RDS en `eu-central-2` Zúrich, o proveedores suizos). Se pierden las ramas de base de datos por preview de Neon y la integración nativa con Vercel. Además, las funciones de Vercel seguirían fuera de Suiza (hay que confirmar en la [lista de regiones de Vercel](https://vercel.com/docs/regions)), así que la residencia "100 % suiza" no se cumpliría igualmente.

### ADR-03 — Panel de administración y CMS
- **Opción A (ACEPTADA): Payload CMS 3** integrado en el mismo proyecto Next.js, con su adaptador de Postgres y su adaptador de Vercel Blob. Aporta de serie:
  - Interfaz del panel traducible al español.
  - Colecciones con campos traducidos por idioma, borradores y versiones.
  - Subida de imágenes con texto alternativo y redimensionado.
  - Editor de texto enriquecido para el blog y las páginas, control de acceso y auditoría básica.
  - Las pantallas propias (stock por lotes, reservas, cambios de estado de pedidos) se añaden como vistas y componentes a medida dentro de Payload.
  - **Beneficio:** ahorra semanas de CRUD y CMS. **Coste:** hay que aprender sus convenciones, y su ORM interno (Drizzle) fija parte del esquema.
- **Opción B:** panel a medida (shadcn/ui + Server Actions) con un ORM propio (Prisma o Drizzle) y un editor de texto propio (Tiptap). Da control total, pero hay que construirlo todo y es arriesgado para el 1 de febrero.

### ADR-04 — Autenticación
- **ACEPTADA: Better Auth**, con los datos en nuestra propia base de datos. Incluye Google, Apple, email y contraseña, verificación de email, recuperación de contraseña y roles (`customer` y `admin`). No tiene coste por usuario y los datos no salen de nuestra base de datos.
- Si se elige Payload: Payload gestiona el acceso de los administradores al panel y Better Auth el de los clientes, o se unifica todo con Better Auth y se conecta a Payload. Se decide al hacer una prueba de concepto.
- **Alternativa:** Clerk. Es más rápido de integrar, pero los datos van a un tercero (EE. UU.) y tiene coste por usuario activo.

### ADR-05 — Pagos
- **ACEPTADA: Stripe Checkout en modo integrado** (embedded) dentro de nuestro dominio.
  - Lo cumple Stripe por nosotros: el nivel mínimo de PCI (SAQ A), TWINT, Apple Pay y Google Pay sin código extra, y la interfaz en DE/EN/ES.
  - TWINT exige precios en CHF, Suiza como destino de envío y un importe máximo de 5000 CHF ([Stripe TWINT](https://docs.stripe.com/payments/twint)), todo compatible con el PRD.
- **Flujo:**
  1. El cliente elige el país en el carrito.
  2. El servidor recalcula los precios, las promociones, el envío y el stock.
  3. El servidor crea la sesión de Checkout con las líneas y la tarifa de envío.
  4. Al confirmarse el pago, el webhook `checkout.session.completed` crea el pedido.
  5. Métodos de pago lentos: `async_payment_succeeded` / `failed`.
- **Reembolsos totales y parciales:** con la Refunds API desde el panel.
- **Sin Stripe Tax por ahora:** no hay registro de IVA suizo hasta los 100 000 CHF. El modelo guarda el tipo de impuesto por si cambia.

### ADR-06 — Consistencia del stock (núcleo del dominio)
- Las unidades viven en `lot`. Cada movimiento se registra en `stock_movement`, que nunca se edita ni se borra.
- **Al confirmarse el pago**, en una sola transacción:
  1. Se bloquean los lotes de la variante (`SELECT … FOR UPDATE`) en orden FEFO.
  2. Si hay unidades suficientes, se descuentan y se registran los movimientos.
  3. Si no hay, la línea pasa a reserva (si el producto es reponible y tiene fecha máxima) o a reembolso automático.
- **Idempotencia:** se guarda el `event.id` de Stripe con restricción de unicidad, porque Stripe reintenta los webhooks.
- **Packs:** se descuentan los componentes en la misma transacción.
- **Entrada de un lote nuevo:** se asignan primero las reservas, por orden de llegada, en la misma transacción.

### ADR-07 — Trabajos programados y emails
- **Vercel Cron:**
  - Cada día: retirada de lotes caducados, avisos de lotes que van a caducar y reservas cuya fecha máxima ha pasado.
  - Cada 10 minutos: reintento de emails pendientes.
- **Emails:** se usa una tabla de envíos pendientes (patrón *outbox*). La transacción de negocio guarda el email que hay que mandar, y un proceso posterior lo envía con **Resend** + React Email, con reintentos. Así ningún email se pierde si falla el proveedor.
- Si la lógica crece (cadenas de reservas, devoluciones), se valora **Vercel Workflow** para procesos duraderos.

### ADR-08 — Búsqueda
- **PROPUESTA: búsqueda nativa de Postgres.** `pg_trgm` para tolerar errores de escritura, y `tsvector` por idioma (configuraciones `german`, `english` y `spanish`). Para un catálogo pequeño basta y no añade ningún servicio.
- Si el catálogo crece mucho: Algolia o Typesense.

### ADR-09 — Internacionalización
- **next-intl** con URLs traducidas (`/de/…`, `/es/crema-facial`).
- El idioma se detecta por la cabecera `Accept-Language` del navegador y se guarda en una cookie. Por defecto, EN.
- `hreflang` y canonical se generan desde un único mapa de rutas.
- Los textos del catálogo se guardan en la base de datos por idioma. Los de la interfaz, en archivos de mensajes.

### ADR-10 — Imágenes
- **Vercel Blob (público)**, con subida directa desde el navegador para evitar el límite de 4,5 MB de las funciones.
- `next/image` para servir AVIF/WebP en tamaños responsive. Zoom en el cliente con la imagen de mayor resolución, cargada solo al pedirla.

### ADR-11 — Renderizado y caché
- Fichas de producto, categorías, blog y páginas: estáticas o cacheadas con revalidación por etiqueta (`revalidateTag`) cuando el panel publica o cambia el stock.
- El stock que se muestra viene de un componente dinámico pequeño (streaming), para no invalidar toda la página con cada venta.
- Carrito, cuenta y checkout: dinámicos.

### ADR-12 — Analítica y observabilidad
- **Vercel Web Analytics y Speed Insights:** sin cookies, así que no hace falta banner por ellos.
- **Errores:** Sentry, con datos en la región UE (decisión D-5).
- Alertas de fallos en los webhooks y de emails que se reintentan una y otra vez.

### ADR-13 — Calidad y entrega
- TypeScript estricto, ESLint y Prettier.
- **Pruebas:** Vitest para la lógica de dominio (stock, FEFO, reservas, promociones, envío) y Playwright para los flujos completos (compra, reserva, webhook con Stripe CLI, publicación multilingüe).
- **CI con GitHub Actions:** lint, comprobación de tipos y pruebas.
- **Previews de Vercel con una rama de Neon por PR.** Stripe en modo test en preview y en local.
- **Accesibilidad:** axe-core en Playwright.
- **Lighthouse ≥ 90:** Lighthouse CI en cada preview, perfil móvil. Bloquea el merge si Rendimiento, Accesibilidad, Buenas prácticas o SEO bajan de 90 en las plantillas públicas. El objetivo sigue siendo 100 (ver la constitución, `specs/constitution.md`).

## 4. Stack resumido

| Capa | Elección |
|---|---|
| Lenguaje y runtime | TypeScript · Node.js 24 LTS |
| Framework | Next.js (App Router, última versión estable) |
| UI | Tailwind CSS + componentes accesibles (Radix / shadcn) |
| i18n | next-intl |
| Base de datos | Neon Postgres (Frankfurt) |
| ORM | Drizzle (el que usa Payload por debajo) |
| Panel y CMS | Payload CMS 3 |
| Autenticación | Better Auth |
| Pagos | Stripe Checkout (integrado), TWINT y wallets |
| Imágenes | Vercel Blob + next/image |
| Emails | Resend + React Email |
| Trabajos programados | Vercel Cron (+ Workflow si hace falta) |
| Búsqueda | Postgres FTS + pg_trgm |
| Analítica | Vercel Analytics + Speed Insights |
| Pruebas | Vitest + Playwright + axe |

## 5. Modelo de datos (borrador)

```
product(id, status, restock_type, max_restock_date?, created_at)
product_translation(product_id, locale, name, slug, short_desc, long_desc, inci?, usage?, warnings?, allergens?, meta_title?, meta_desc?)
variant(id, product_id, sku, ean?, price_chf, compare_at_chf?, weight_g, net_qty?, net_unit?, attrs jsonb{size,scent,color})
image(id, product_id, variant_id?, url, position) · image_alt(image_id, locale, alt)
lot(id, variant_id, code, qty_initial, qty_available, expires_at?, received_at)   -- Payload: `lots`; UNIQUE(variant_id, code), CHECK qty_available ≥ 0; cantidades solo desde src/lib/stock.ts (F-013)
stock_movement(id, at, variant_id, variant_sku, lot_id, lot_code, delta, quantity_after, reason, comment?, ref_type, ref_id?, actor_id?, actor_email?)   -- Payload: `stock-movements`; sin claves foráneas, solo inserción (trigger) (F-013)
category(id, parent_id?, position, status) · category_translation(…slug, name, body, meta…) · product_category(product_id, category_id)   -- árbol de hasta 3 niveles, breadcrumbs calculados en memoria (F-012)
collection(status, visible_from?, visible_until?)(+translation) · collection_product(position)   -- Payload: `product-collections`; fin de visibilidad excluido (F-012)
bundle(product_id) · bundle_item(bundle_id, variant_id, qty)
packaging_option(+translation, price_chf, image)
customer(id, type{person,company}, company_name?, vat_id?, locale) + auth tables (Better Auth)
address · wishlist_item
order(id, number, customer_id?, email, locale, status, subtotal, discount, shipping, total, stripe_session_id, packaging_option_id?)
order_line(id, order_id, variant_id, qty, unit_price, status{allocated,reserved,refunded}, reserved_at?, max_date?, customer_choice?)
shipment(id, order_id, carrier, tracking_number, tracking_url, shipped_at, delivered_at, paid_by_store bool)
payment · refund(stripe_refund_id, amount, lines) · exchange(order_line_id, reason, replacement_shipment_id)
restock_subscription(customer_id, variant_id, notified_at?)
store_credit_entry(id, customer_id, delta_chf, reason, order_id?, actor, created_at)   -- saldo = suma de movimientos; solo se añaden filas
promotion(type{percent,fixed}, value, scope{product,category,collection}, scope_ids, starts_at, ends_at, active)
discount_code(code, type, value, scope, max_uses, per_customer, first_order_only, expires_at)   -- esquema MVP, uso post-MVP
shipping_rule(zone, countries[], min_subtotal, max_subtotal?, price_chf)
settings   -- global de Payload (una fila tipada, F-018), no una tabla clave-valor; se lee con getSettings()
page / post (+translation) · slug_redirect(locale, from, to)
stripe_event(id PK) · email_outbox(id, template, to, locale, payload, status, attempts)
audit_log(at, actor_id?, actor_email?, entity, entity_id?, entity_label, action, locale?, changes jsonb)   -- solo inserción: un trigger rechaza UPDATE y DELETE (F-018)
```

## 6. Decisiones pendientes

| ID | Decisión | Estado / recomendación |
|---|---|---|
| D-1 | Región de datos | ✅ Neon Frankfurt + Vercel fra1 |
| D-2 | Panel | ✅ Payload CMS 3 |
| D-3 | Autenticación | ✅ Better Auth |
| D-4 | Pagos | ✅ Stripe Checkout integrado |
| D-5 | Errores | ✅ Sentry (región UE) |
| D-6 | Plan de Vercel | ✅ Pro, en un equipo propiedad de la clienta, que lo paga |

## 7. Siguientes pasos

2. Prueba de concepto (1-2 días): Payload + Better Auth + next-intl + Neon en Vercel.
3. Esquema definitivo, migraciones y datos de prueba.
4. Por orden de implementación: catálogo → checkout y webhook → panel de pedidos → CMS, blog y SEO → reservas y avisos (P1).
