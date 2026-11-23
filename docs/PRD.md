# PRD — E-commerce de cosmética y productos naturales

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador) |
| Fecha | 23-11-2026 |
| Estado | Requisitos definidos; arquitectura pendiente |
| Lanzamiento objetivo | 1 de febrero de 2027 |
| Empresa | Autónoma registrada en Suiza, 1 persona |
| Moneda | CHF |
| Idiomas públicos | Inglés (por defecto), alemán, español |
| Idioma del panel | Español |

> Nota: las decisiones de arquitectura (Next.js con SSR, Vercel, Neon, Stripe) se mencionan solo como contexto. Se cerrarán en el documento de arquitectura.

---

## 1. Visión

Tienda online propia para vender cosmética y productos naturales a particulares y empresas. Se muestran todos los productos aunque estén agotados. Los productos que se pueden reponer se pueden reservar pagando por adelantado, o se puede pedir un aviso por email cuando vuelvan. La administradora gestiona catálogo, stock (con lotes y caducidades), pedidos y contenido desde un panel en español, también desde el móvil. La web pública está en tres idiomas y optimizada para SEO y accesibilidad.

## 2. Objetivos y métricas de éxito

| Objetivo | Métrica | Meta |
|---|---|---|
| Viabilidad comercial | Facturación mensual | > 300 CHF/mes |
| Rendimiento | Core Web Vitals (p75, móvil) | LCP < 2,5 s · INP < 200 ms · CLS < 0,1 |
| Accesibilidad | WCAG 2.2 AA | 100 % de cumplimiento AA |
| Calidad web | Lighthouse (móvil): Rendimiento, Accesibilidad, Buenas prácticas, SEO | **≥ 90 en las 4 categorías** (objetivo 100), en todas las plantillas públicas |
| SEO | Páginas indexadas en los 3 idiomas | 100 % de productos, categorías y artículos publicados |
| Autonomía | Altas, bajas y cambios de catálogo sin programador | 100 % |

## 3. Alcance y prioridades

- **P0 (lanzamiento, 1-feb-2027):** todo lo que no esté listado abajo como P1 o post-MVP.
- **P1 (en el lanzamiento si da tiempo, si no justo después):** reservas con pago anticipado (RF-RES) y avisos de vuelta de stock (RF-AVI).
- **Post-MVP:** panel de métricas (RF-MET), interfaz de códigos de descuento (el esquema de datos va en el MVP), emails de carrito abandonado, productos relacionados, reseñas, newsletter, marketplaces, vídeo, filtros y ordenación avanzados, facturas, integración de etiquetas de envío.
- **Fuera de alcance:** tienda física y TPV, varios almacenes, tarjetas regalo, puntos de fidelidad, referidos, suscripciones, insignias de certificación.

## 4. Roles

| Rol | Descripción | Permisos |
|---|---|---|
| Visitante | Usuario sin sesión | Navegar, buscar, comprar como invitado |
| Cliente | Usuario con cuenta verificada (particular o empresa) | Lo anterior, más cuenta, lista de deseos, reservas y avisos |
| Administrador | 2 personas: la administradora del negocio y el webadmin | Acceso total al panel |

---

## 5. Requisitos funcionales

Formato: `ID — Requisito`, seguido de los criterios de aceptación (CA) cuando hace falta concretar.

### 5.1 Catálogo (RF-CAT)

- **RF-CAT-01 — Alta, edición y eliminación de productos.** El administrador crea, edita, oculta, archiva y elimina productos sin límite de cantidad.
  - CA: los estados son `borrador`, `publicado`, `oculto` y `archivado`. Un producto con pedidos asociados no se borra de verdad, solo se archiva. Un producto sin pedidos se puede borrar definitivamente, con confirmación.
- **RF-CAT-02 — Campos del producto.** Todos los campos de texto son traducibles (ES/EN/DE).
  - Obligatorios para publicar: nombre, descripción corta, descripción larga, al menos una categoría, al menos una variante con precio y al menos una foto.
  - Opcionales: lista de ingredientes INCI, modo de uso, advertencias, alérgenos, volumen o peso, precio de referencia ("antes"), certificaciones (solo texto, sin insignia), caducidad tras abrir (PAO).
  - Por variante: SKU (obligatorio), EAN (opcional), peso, precio, stock (se calcula a partir de los lotes, ver RF-STK).
- **RF-CAT-03 — Publicación multilingüe.** El producto se puede guardar como borrador solo en español. Para publicarlo, los campos obligatorios deben estar rellenos en los 3 idiomas.
  - CA: el botón "Publicar" queda desactivado e indica qué campos e idiomas faltan.
- **RF-CAT-04 — Variantes.** Atributos de variante: tamaño, aroma y color, combinables. Cada combinación es una variante con su propio SKU, precio, stock y fotos.
- **RF-CAT-05 — Fotos.** Máximo 10 fotos por producto, asignables a variantes. Se pueden reordenar arrastrando y elegir la foto principal. Cada foto tiene texto alternativo traducible (accesibilidad y SEO). Zoom en la ficha del producto. La web optimiza las imágenes automáticamente (formatos modernos y tamaños responsive).
- **RF-CAT-06 — Tipo de reposición.** Cada producto o variante se marca como `reponible` o `edición limitada`.
  - Edición limitada agotada: se muestra "Agotado" sin opción de reserva, hasta que el administrador la archive.
  - Reponible: se puede crear un lote nuevo en cualquier momento.
- **RF-CAT-07 — Packs predefinidos.** El administrador crea packs formados por variantes de otros productos, con su propio precio, fotos y textos.
  - CA: el stock disponible del pack es el mínimo que permiten sus componentes. Vender un pack descuenta el stock de cada componente.
- **RF-CAT-08 — Packaging al finalizar la compra.** En el checkout, el cliente puede elegir una opción de packaging (cesta, caja, etc.) para todo el pedido. El administrador gestiona estas opciones (nombre, foto, precio). *Ver TA-06.*
- **RF-CAT-09 — Visibilidad sin stock.** Los productos publicados se muestran siempre, tengan stock o no.
- **RF-CAT-10 — Unidades limitadas.** Si el stock de una variante es 5 o menos (y más de 0), se muestra "Solo quedan X".

### 5.2 Stock, lotes y caducidad (RF-STK)

- **RF-STK-01 — Lotes.** El stock de cada variante se compone de lotes, cada uno con número de lote, cantidad, fecha de entrada y fecha de caducidad (opcional). El stock disponible es la suma de los lotes no caducados.
- **RF-STK-02 — Consumo por caducidad (FEFO).** Las ventas consumen primero el lote que caduca antes.
- **RF-STK-03 — Retirada automática por caducidad.** Cuando un lote llega a su fecha de caducidad (o N días antes, con N configurable de forma general; ver TA-09), sus unidades se dan de baja solas con el motivo "caducidad". Se avisa al administrador por email.
- **RF-STK-04 — Descuento del stock tras el pago.** El stock se descuenta solo cuando la pasarela confirma el pago (webhook). El carrito no retiene unidades.
  - CA (venta de más de lo que hay): si, al confirmarse el pago, falta stock para alguna línea, esa línea pasa a reserva si el producto es reponible y tiene fecha máxima configurada. Si no, esa línea se reembolsa automáticamente y se avisa al cliente y al administrador. Antes de pagar, el checkout vuelve a comprobar el stock para que esto ocurra lo menos posible.
- **RF-STK-05 — Ajustes manuales.** El administrador ajusta el stock indicando un motivo (entrada de mercancía, rotura, regalo, corrección, otro).
- **RF-STK-06 — Historial de movimientos.** Todo cambio de stock (venta, ajuste manual, caducidad, reembolso, cambio de producto) queda registrado con fecha, cantidad, motivo, lote y autor (usuario o "sistema").
- **RF-STK-07 — Alerta de stock bajo.** Hay un umbral general configurable. Cuando una variante baja de ese umbral, se envía un email al administrador, una sola vez hasta que el stock se recupere.
- **RF-STK-08 — Un único almacén.**
- **RF-STK-09 — Ofertas por caducidad.** Los lotes próximos a caducar pasan a la sección "Ofertas" (ver F-014).

### 5.3 Reservas con pago anticipado (RF-RES) — P1

- **RF-RES-01 — Productos que se pueden reservar.** Solo los productos reponibles sin stock que tengan configurada una **fecha máxima de reposición**.
- **RF-RES-02 — Pago completo.** El cliente paga el 100 % al reservar, sin límite de unidades. Hace falta una cuenta verificada, y se avisa al usuario si intenta reservar sin ella (TA-07).
- **RF-RES-03 — Carrito mixto.** Un carrito puede llevar productos en stock y reservados. Se paga todo en una sola vez. Lo que hay en stock se envía primero. El segundo envío (lo reservado) lo paga la tienda, y el checkout lo indica como ventaja ("el envío del resto corre de nuestra cuenta").
- **RF-RES-04 — Asignación por orden de llegada.** Cuando entra un lote, las unidades se asignan primero a las reservas, de la más antigua a la más reciente. Los pedidos asignados pasan a "En preparación" y se avisa al cliente.
- **RF-RES-05 — Sin cancelación antes del plazo.** El cliente no puede cancelar mientras no se haya superado la fecha máxima.
- **RF-RES-06 — Fecha máxima superada.** Si se supera la fecha sin que llegue stock, se envía un email al cliente para que elija entre **esperar** o **cancelar con reembolso total**. La elección queda registrada y el administrador la ve.
- **RF-RES-07 — Panel de reservas.** Listado de productos con reservas, ordenable por número de reservas o por antigüedad, con el detalle de los clientes.

### 5.4 Avisos de vuelta de stock (RF-AVI) — P1

- **RF-AVI-01 — Suscripción.** Un cliente con cuenta verificada pulsa "Avísame" en un producto reponible agotado.
- **RF-AVI-02 — Envío.** Cuando el stock pasa de 0 a más de 0, se avisa a todos los suscritos, cada uno en su idioma. *Ver TA-08: ¿el aviso se da de baja tras enviarse?*
- **RF-AVI-03 — Gestión.** El cliente ve y cancela sus avisos desde su cuenta. El administrador ve cuántas personas esperan cada producto.

### 5.5 Categorías, colecciones y búsqueda (RF-NAV)

- **RF-NAV-01 — Categorías jerárquicas.** Árbol de varios niveles (se recomiendan 3 como máximo). Un producto puede estar en varias categorías. El administrador las crea, edita, reordena y elimina libremente.
- **RF-NAV-02 — Página de categoría.** Cada categoría tiene nombre, URL traducida, texto descriptivo, imagen de cabecera y metadatos SEO, en los 3 idiomas.
- **RF-NAV-03 — Colecciones.** Agrupaciones elegidas a mano (p. ej. "Navidad") con su propia página, independientes de las categorías.
- **RF-NAV-04 — Filtros.** En el MVP solo se navega por categorías y colecciones. No hay filtros de atributos ni selector de orden. *Ver TA-11 para el orden por defecto.*
- **RF-NAV-05 — Búsqueda.** Búsqueda de texto que tolera errores de escritura. Busca en nombre, descripciones, ingredientes y categorías, en el idioma activo.

### 5.6 Cuentas de cliente (RF-CLI)

- **RF-CLI-01 — Compra como invitado** permitida.
- **RF-CLI-02 — Registro e inicio de sesión** con Google, Apple, o email y contraseña. El email debe verificarse.
- **RF-CLI-03 — Funciones de la cuenta:** historial de pedidos con su seguimiento, direcciones guardadas, lista de deseos, gestión de reservas y avisos, repetir un pedido, idioma preferido.
- **RF-CLI-04 — Clientes empresa.** Campos opcionales de razón social y número de IVA/UID. *Ver TA-02 sobre precios y facturas para empresas.*
- **RF-CLI-05** — Recuperación de contraseña, y borrado y exportación de los datos personales (derechos de nLPD y RGPD).

### 5.7 Carrito y checkout (RF-CHK)

- **RF-CHK-01 — Pago con Stripe**, con los métodos disponibles para una cuenta suiza en CHF. Se recomienda activar al menos tarjeta, TWINT, Apple Pay y Google Pay. Los demás (PayPal, Klarna, etc.) se verificarán en la fase de arquitectura.
- **RF-CHK-02 — Precios siempre en CHF**, con todos los impuestos y cargos incluidos.
- **RF-CHK-03 — Envío.** El coste se calcula con reglas configurables (país o zona, importe) y hay un umbral de envío gratis configurable. Por debajo del umbral, el cliente paga el envío. No hay pedido mínimo. *Las tarifas y los países están pendientes (TA-01).*
- **RF-CHK-04** — Selección de packaging (RF-CAT-08).
- **RF-CHK-05 — Confirmación.** Página y email de confirmación en el idioma del cliente. El pedido solo se crea tras confirmarse el pago, así que no hay estado "pendiente de pago". Los métodos de pago lentos (si se activan) quedan en espera hasta que se confirme el pago.
- **RF-CHK-06 — Promociones (MVP).** Desde el panel, el administrador crea promociones automáticas: porcentaje o importe fijo sobre productos, categorías o colecciones, con fechas de inicio y fin. Se muestran el precio tachado y el precio final.
- **RF-CHK-07 — Códigos de descuento (post-MVP).** El modelo de datos se diseña desde el MVP para admitir códigos (tipo, valor, alcance, límite de usos, caducidad, primera compra). Ni el panel ni el checkout los usan todavía. *Ver TA-10.*
- **RF-CHK-09 — Saldo a favor.** Los clientes pueden tener saldo a favor (p. ej. cuando una edición abarata el pedido), que se aplica en su siguiente compra. Ver F-045.
- **RF-CHK-08 — Sin factura en el MVP.** El cliente recibe el email de confirmación y el recibo de Stripe. *Ver TA-03.*

### 5.8 Pedidos (RF-PED)

- **RF-PED-01 — Estados:** `Pagado` → `Reservado / esperando stock` → `En preparación` → `Enviado` → `Entregado`. Estados finales alternativos: `Cancelado`, `Reembolsado`, `Cambio / devolución`.
- **RF-PED-02 — Envíos.** Un pedido puede tener varios envíos (p. ej. un carrito mixto). Para cada envío, el administrador indica el transportista, el número de seguimiento y el enlace de seguimiento.
- **RF-PED-03 — Emails al cliente:** confirmación de pedido, enviado (con seguimiento), entregado (con petición de opinión, ver TA-12), reserva confirmada, reserva asignada, fecha máxima superada, reembolso.
- **RF-PED-04 — Edición antes del envío.** Mientras el pedido no se ha enviado, el administrador puede cambiar la dirección y añadir, quitar o sustituir productos. El stock se recalcula. Si el importe sube, se cobra la diferencia con Stripe. Si baja, se abona como saldo a favor (TA-05).
- **RF-PED-05 — Reembolsos** totales y parciales desde el panel, a través de Stripe, con opción de devolver las unidades al stock. *Propuesta pendiente de validar.*
- **RF-PED-06 — Cambios.** El cliente devuelve el producto y la tienda envía uno nuevo. La tienda paga el envío de vuelta del cliente. El panel registra el cambio, el motivo y el nuevo envío, y descuenta el stock del producto de sustitución.
- **RF-PED-07 — Herramientas del panel:** listado filtrable por estado, fecha y cliente; notas internas; exportación a CSV.
- **RF-PED-08 — Emails al administrador:** pedido nuevo, stock bajo, lote a punto de caducar, reserva con fecha máxima cerca.

### 5.9 Contenido y CMS (RF-CMS)

- **RF-CMS-01 — Inicio editable:** banners, productos destacados, colecciones destacadas y barra de avisos.
- **RF-CMS-02 — Páginas:** Sobre nosotros, Nuestra filosofía de vida, Preguntas frecuentes, Contacto, Glosario de ingredientes y páginas legales. Todas son editables y están en los 3 idiomas.
- **RF-CMS-03 — Blog (MVP):** artículos traducibles sobre propiedades de ingredientes, modo de uso y rituales con nuestros productos. Admite categorías, imagen destacada, productos enlazados y metadatos SEO. *Ver el riesgo legal L-07.*
- **RF-CMS-04 — Editor de texto enriquecido** que genere HTML semántico y accesible (encabezados, listas, enlaces, imágenes con texto alternativo).

### 5.10 Internacionalización (RF-I18N)

- **RF-I18N-01** — Idiomas: EN, DE y ES. Por defecto, EN.
- **RF-I18N-02** — Detección por el idioma del navegador en la primera visita, con selector visible. La elección se recuerda.
- **RF-I18N-03** — URLs con prefijo de idioma y slugs traducidos (`/de/...`, `/es/crema-facial`).
- **RF-I18N-04** — Emails transaccionales en el idioma del pedido o de la cuenta.
- **RF-I18N-05** — Panel de administración solo en español. Los formularios del panel muestran las pestañas ES/EN/DE para cada campo traducible.

### 5.11 SEO (RF-SEO)

- **RF-SEO-01** — Páginas renderizadas en servidor, con HTML completo en la primera respuesta.
- **RF-SEO-02** — Título y meta descripción generados automáticamente a partir de los textos del producto, la categoría o el artículo. *Propuesta: que se puedan editar a mano (TA-13).*
- **RF-SEO-03** — `hreflang` entre los 3 idiomas, más `x-default` apuntando a EN. URL canónica en cada página.
- **RF-SEO-04** — Sitemap XML por idioma, `robots.txt` y página 404 en cada idioma.
- **RF-SEO-05** — Datos estructurados (schema.org): `Product` y `Offer` con la disponibilidad correcta (`InStock`, `OutOfStock`, `BackOrder` si se puede reservar), `BreadcrumbList`, `Article`, `Organization` y `FAQPage`.
- **RF-SEO-06** — Etiquetas Open Graph y Twitter para compartir en redes.
- **RF-SEO-07** — Redirección 301 automática cuando cambia un slug.
- **RF-SEO-08 — Tarea:** estudio de competidores y palabras clave por mercado antes del lanzamiento. El resultado define los textos y la estructura de categorías.

### 5.12 Métricas (RF-MET) — post-MVP

- **RF-MET-01** — Panel con número de pedidos, facturación, ticket medio, productos más vendidos, productos agotados con más avisos o reservas, tasa de conversión y clientes que repiten. Se puede filtrar por periodo, país e idioma.
- **RF-MET-02** — Analítica web sin cookies (p. ej. Vercel Analytics; se decide en la fase de arquitectura).

### 5.13 Panel de administración (RF-ADM)

- **RF-ADM-01** — Dos usuarios con permisos completos. Acceso con Google o con email y contraseña.
- **RF-ADM-02** — Diseño responsive pensado para usarse desde el móvil.
- **RF-ADM-03** — Registro de auditoría de los cambios en productos, stock, pedidos y configuración.
- **RF-ADM-04** — Configuración general: umbral de stock bajo, días de antelación para la caducidad, reglas de envío, umbral de envío gratis, opciones de packaging y datos de la tienda.

---

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 Rendimiento | Core Web Vitals "buenos" en el percentil 75 en móvil (LCP < 2,5 s, INP < 200 ms, CLS < 0,1). SSR y caché en el CDN. Imágenes optimizadas. |
| RNF-02 Mobile-first | El 80 % del tráfico esperado viene del móvil. Se diseña y prueba primero en móvil. |
| RNF-03 Accesibilidad | Mínimo WCAG 2.2 AA, con contraste AAA donde sea viable. Lighthouse Accesibilidad ≥ 90 (objetivo 100). Navegación completa con teclado y lector de pantalla. La paleta se define en la fase de diseño. |
| RNF-04 Compatibilidad | Navegadores que cubran al menos el 95 % del uso global (lista de navegadores definida en la arquitectura). |
| RNF-05 Disponibilidad | Objetivo del 99,9 %, delegado en Vercel y Neon. *No es realista prometer 0 s de caída: el límite real lo ponen los acuerdos de servicio de los proveedores, incluida Stripe.* |
| RNF-06 Residencia de datos | Base de datos en Neon Frankfurt (UE) y funciones en Vercel fra1. Neon no tiene región en Suiza. La nLPD considera la UE un destino adecuado, y debe indicarse en la política de privacidad. Ver ARCHITECTURE.md, ADR-02. |
| RNF-07 Copias de seguridad | Restauración a un momento concreto (PITR) de Neon. El periodo de retención se define en la arquitectura. Se prueba una restauración antes del lanzamiento. |
| RNF-08 Seguridad | Prácticas de OWASP ASVS nivel 1. Stripe gestiona los datos de tarjeta (PCI SAQ A). Límite de intentos en login y checkout. Webhooks verificados por firma. Secretos en variables de entorno. Sin 2FA por decisión del negocio, aunque se recomienda para las cuentas de administrador. |
| RNF-09 Privacidad | Cumplimiento de nLPD (Suiza) y del RGPD, que aplica si se vende a la UE. Minimización de datos. Banner de cookies solo si hay cookies no esenciales. |
| RNF-10 Escalabilidad | El tráfico es desconocido y se espera bajo. La arquitectura serverless escala sin cambios. Los lanzamientos no requieren colas de compra. |
| RNF-11 Mantenibilidad | Lo mantiene un único ingeniero sénior. Código tipado, pruebas automáticas de los flujos críticos (checkout, webhook de pago, stock, reservas), CI/CD y entornos de preview. |
| RNF-12 Observabilidad | Registro de errores, alertas por fallos de webhooks o emails, y registro de emails enviados. |
| RNF-13 Emails | Proveedor transaccional con dominio autenticado (SPF, DKIM, DMARC). Plantillas en los 3 idiomas, accesibles y adaptadas al móvil. |
| RNF-15 Lighthouse | Mínimo 90 (objetivo 100) en Rendimiento, Accesibilidad, Buenas prácticas y SEO (perfil móvil) en todas las plantillas públicas, verificado en CI en cada PR. |
| RNF-16 Pruebas | Cada feature incluye pruebas unitarias (Vitest) y E2E (Playwright) que cubren sus criterios de aceptación, y se ejecutan en CI en cada PR. |
| RNF-14 Usabilidad del panel | Una persona sin perfil técnico debe poder publicar un producto con variantes y fotos en menos de 10 minutos. |

---

## 7. Legal y cumplimiento (orientativo)

> Esto es una lista orientativa, no asesoría legal. Antes del lanzamiento, conviene que una persona experta en derecho suizo (y en derecho de la UE si se vende allí) revise los textos.

| ID | Tema | Qué implica |
|---|---|---|
| L-01 | **Impressum** | En Suiza, la UWG (art. 3 ap. 1 letra s) obliga a las tiendas online a mostrar claramente su identidad, dirección y email. Si se vende a Alemania, también hay que cumplir los requisitos alemanes. |
| L-02 | **Condiciones generales (AGB)** | Contrato, precios, pago, reservas (pago anticipado, fecha máxima, reembolso), envíos, cambios y foro competente. La cláusula de que los productos son responsabilidad del proveedor **puede no eximir del todo a la tienda** frente al consumidor (responsabilidad por producto en Suiza y la UE). |
| L-03 | **Política de privacidad** | nLPD. Si se dirige a clientes de la UE, también el RGPD, y quizá un representante en la UE (art. 27). Debe listar los encargados del tratamiento: Stripe, Vercel, Neon, el proveedor de emails y los de login social. |
| L-04 | **Desistimiento** | Suiza no tiene un derecho legal de desistimiento en compras online. Los **consumidores de la UE sí tienen 14 días** con reembolso si la tienda se dirige a ellos. La política actual de "solo cambio" no basta para la UE. Hay una excepción para cosméticos precintados que se han abierto. |
| L-05 | **Precio por unidad** | En Alemania (PAngV) es obligatorio mostrar el precio por 100 ml o 100 g. Hay que añadir el campo "cantidad neta" y calcularlo. |
| L-06 | **Cosmética** | En Suiza aplica la ordenanza de cosméticos (VKos), y el INCI suele ser obligatorio en la etiqueta. Para vender en la UE hace falta una persona responsable en la UE (Reglamento 1223/2009). Hay que confirmar que los proveedores la tienen. |
| L-07 | **Alegaciones de salud** | El blog sobre "terapias" **no puede atribuir efectos curativos o medicinales** a cosméticos. Se recomienda hablar de "rituales" o "bienestar" y revisar los textos. |
| L-08 | **IVA y aduanas** | MWST: registro obligatorio a partir de 100 000 CHF de facturación mundial. En los envíos a la UE, el comprador paga el IVA de importación y los aranceles, salvo que se elija DDP o IOSS. Esto afecta al precio final y a la experiencia de compra. |
| L-09 | **Conservación de registros** | Pedidos y justificantes durante 10 años (CO art. 958f). |

---

## 8. Modelo de datos conceptual (orientativo)

Entidades principales, para guiar la fase de arquitectura:

- **Catálogo:** `Producto`, `TraducciónProducto`, `Variante`, `AtributoVariante`, `Imagen` (con texto alternativo por idioma), `Categoría` (árbol, con traducciones), `Colección`, `Pack` y `ComponentePack`, `OpciónPackaging`.
- **Inventario:** `Lote` (variante, cantidad, caducidad), `MovimientoStock` (tipo, motivo, autor, lote).
- **Clientes:** `Cliente` (particular o empresa, idioma), `CuentaAuth` (Google, Apple, email), `Dirección`, `ListaDeseos`.
- **Ventas:** `Pedido`, `LíneaPedido` (con la variante y el precio en el momento de la compra), `Envío` (varios por pedido), `Pago`, `Reembolso`, `Cambio`.
- **Demanda:** `Reserva` (línea, fecha máxima, posición en la cola, elección espera/cancela), `SuscripciónAviso`.
- **Promociones:** `Promoción` (MVP), `CódigoDescuento` y `UsoCódigo` (esquema en el MVP, uso post-MVP).
- **Configuración y contenido:** `ReglaEnvío`, `Configuración`, `PáginaCMS`, `ArtículoBlog`, `RedirecciónSlug`.
- **Sistema:** `UsuarioAdmin`, `RegistroAuditoría`, `RegistroEmail`.

---

## 9. Temas abiertos (TA)

| ID | Pregunta | Afecta a |
|---|---|---|
| TA-01 | Países de envío, tarifas, umbral de envío gratis, y aduanas (¿DAP o DDP?) | RF-CHK-03, L-08 |
| TA-02 | Empresas: ¿precios distintos? ¿Exentas de IVA? ¿Factura obligatoria? | RF-CLI-04 |
| TA-03 | Facturas: ¿confirmamos que no habrá ninguna, ni para empresas? | RF-CHK-08 |
| TA-04 | Reembolsos totales y parciales desde el panel: ¿aceptamos la propuesta? | RF-PED-05 |
| TA-05 | ✅ Resuelto: si sube, se cobra la diferencia con un enlace de pago de Stripe; si baja, se abona como saldo a favor (F-045) | RF-PED-04 |
| TA-06 | Packaging: ¿tiene precio? ¿Stock propio? ¿Uno solo por pedido? | RF-CAT-08 |
| TA-07 | ✅ Cuenta obligatoria para reservar (se avisa al usuario). Pendiente: ¿Fecha máxima por producto o por variante? Si se cambia la fecha, ¿afecta a las reservas que ya existen? | RF-RES |
| TA-08 | ¿El aviso se da de baja tras enviarse una vez? | RF-AVI-02 |
| TA-09 | Caducidad: ¿retirada el mismo día de caducidad o N días antes? ¿Cuántos días? | RF-STK-03 |
| TA-10 | Interpretación: promociones automáticas en el MVP y códigos post-MVP con el esquema preparado. ¿Correcto? | RF-CHK-06/07 |
| TA-11 | Orden por defecto en los listados: ¿novedades primero o manual? | RF-NAV-04 |
| TA-12 | Opinión tras la entrega: ¿qué formato (responder al email, formulario, encuesta)? ¿Dónde se guarda? | RF-PED-03 |
| TA-13 | Meta SEO automática: ¿se puede editar a mano? | RF-SEO-02 |
| TA-14 | ✅ Resuelto: sí, desistimiento de 14 días para consumidores de la UE | L-04 |
| TA-15 | Contacto: ¿formulario que envía un email o solo la dirección de email? | RF-CMS-02 |
| TA-16 | ¿Albaranes imprimibles en el MVP? | RF-PED-07 |
| TA-17 | ~~¿Neon y Vercel tienen región en Suiza?~~ Resuelto: Frankfurt | RNF-06 |

### Decisiones de la revisión de specs (23-11-2026)

Estas decisiones sustituyen lo que diga en contra el resto del PRD. El detalle está en cada spec.

- **Ofertas por caducidad (F-014):** los lotes a N días de caducar (configurable) salen del catálogo normal y pasan a la sección "Ofertas". El día de la caducidad se retiran.
- **Packaging (F-016):** tiene stock propio y es uno por pedido.
- **Envíos (F-031):** tarifa fija por zona, umbral de envío gratis, países bloqueables, y una sección "Envíos" en el panel.
- **Reservas (F-060):** un carrito mixto genera 2 pedidos con un solo pago. La fecha máxima es por producto. Los packs no se pueden reservar.
- **Última unidad vendida dos veces (F-033):** se reembolsa la línea, se avisa al cliente y él decide si reserva.
- **Edición de pedidos (F-042):** la diferencia a pagar queda como "pendiente de pago" en una pestaña aparte y en la cuenta del cliente. Si no se paga en 7 días, se revierte la edición. Si el pedido se abarata, se abona como saldo, que no caduca y se pierde si se borra la cuenta (F-045).
- **Contraseñas (F-007):** sin requisitos de longitud ni de complejidad.
- **Banners del inicio (F-024):** rotan solos, con control de pausa. La portada tendrá efectos de scroll (parallax).
- **Otras:** el menú siempre muestra "Todos los productos", "Destacados" y "Ofertas"; albaranes imprimibles; "¿Problema con tu envío?" en Mis pedidos; emails desde `hello@<dominio>`; sin modo oscuro; sin pentest externo, se hará un análisis con IA.
- **Temas abiertos resueltos:** TA-04, TA-06, TA-08, TA-09, TA-10, TA-11, TA-12, TA-13, TA-15 y TA-16. Siguen abiertos TA-01 (valores de envío), TA-02 y TA-03.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Vender más de lo que hay al no retener el carrito | Comprobar el stock antes de pagar y resolverlo en el webhook (RF-STK-04) |
| Textos sobre terapias con alegaciones prohibidas | Guía editorial y revisión legal (L-07) |
| Normas de la UE (desistimiento, precio por unidad, RGPD) al vender a Alemania | Resolver TA-14 y L-03/L-05 antes del lanzamiento |
| Fecha ajustada (1-feb-2027) con una sola persona desarrollando | Reservas y avisos como P1, con posibilidad de salir después |
| Traducir todo a 3 idiomas retrasa la publicación | Borradores solo en español y publicación con validación de los 3 idiomas |

## 11. Siguientes pasos

1. Cerrar los temas abiertos (TA).
2. Documento de arquitectura (stack, modelo de datos, integraciones, regiones).
3. Fase de diseño (marca, paleta accesible, componentes).
4. Estudio SEO de competidores y palabras clave (RF-SEO-08).
5. Revisión legal (sección 7).
