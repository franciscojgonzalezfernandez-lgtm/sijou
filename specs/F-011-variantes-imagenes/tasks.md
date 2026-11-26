# F-011 — Tareas

Rama `feat/F-011-variantes-imagenes`. Empieza cuando se apruebe el [plan](./plan.md).

- [ ] T1 Prueba técnica: subida directa a Blob (`clientUploads`) en un preview. ¿Genera Payload los tamaños WebP? ¿Hay forma de leer el progreso? Ajustar el plan si no. (CA-7, CA-8)
- [ ] T2 [P] Dominio: `variant-combinations`, `sku`, `ean`, `unit-price`, `gallery`, con pruebas al 100 %. (CA-1, CA-2, CA-4, CA-5)
- [ ] T3 Campos nuevos en `products` (`options`, `gallery`) y `variants`; migración con copia de `images` a `gallery`; tipos regenerados. (CA-1, CA-2, CA-5)
- [ ] T4 Hooks: coherencia de variantes, combinación única, SKU normalizado, desactivar variantes al quitar un atributo o un valor, quitar de la galería las variantes borradas. (CA-1, CA-2, CA-3, caso límite)
- [ ] T5 `publishReadiness` ampliada (etiquetas de los valores, variantes que encajan, `alt` desde la galería) y bloque «Para publicar». (CA-6)
- [ ] T6 Endpoint `generate-variants` y botón «Generar variantes». (HU-1, CA-1)
- [ ] T7 Galería: límite de 10 con mensaje, casillas de variantes, reordenar con teclado. (CA-4, CA-5)
- [ ] T8 Subida directa con límite de 10 MB y barra de progreso accesible; tamaño `w240`. (CA-7, CA-8)
- [ ] T9 Tienda y datos de prueba: foto principal desde `gallery`; producto de prueba con atributo y galería.
- [ ] T10 E2E de todos los CA en escritorio y móvil, con axe.
- [ ] T11 Lighthouse en el preview (6 URLs de producto) y CI en verde.
- [ ] T12 Al terminar: spec y plan a «Hecha»/«Implementado», BACKLOG ✅.
