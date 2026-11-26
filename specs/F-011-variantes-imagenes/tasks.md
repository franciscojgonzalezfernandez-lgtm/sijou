# F-011 — Tareas

Rama `feat/F-011-variantes-imagenes`. [Plan](./plan.md) aprobado el 26-11-2026 (D-1…D-4 como se propusieron).

- [ ] T1 Prueba técnica (se comprueba en la E2E del preview: progreso y tamaños WebP tras la subida directa): subida directa a Blob (`clientUploads`) en un preview. ¿Genera Payload los tamaños WebP? ¿Hay forma de leer el progreso? Ajustar el plan si no. (CA-7, CA-8)
- [x] T2 [P] Dominio: `variant-combinations`, `sku`, `ean`, `unit-price`, `gallery`, con pruebas al 100 %. (CA-1, CA-2, CA-4, CA-5)
- [x] T3 Campos nuevos en `products` (`options`, `gallery`) y `variants`; migración con copia de `images` a `gallery`; tipos regenerados. (CA-1, CA-2, CA-5)
- [x] T4 Hooks: coherencia de variantes, combinación única, SKU normalizado, desactivar variantes al quitar un atributo o un valor, quitar de la galería las variantes borradas. (CA-1, CA-2, CA-3, caso límite)
- [x] T5 `publishReadiness` ampliada (etiquetas de los valores, variantes que encajan, `alt` desde la galería) y bloque «Para publicar». (CA-6)
- [x] T6 Endpoint `generate-variants` y botón «Generar variantes». (HU-1, CA-1)
- [x] T7 Galería: límite de 10 con mensaje, casillas de variantes, reordenar con teclado. (CA-4, CA-5)
- [x] T8 Subida directa con límite de 10 MB y barra de progreso accesible; tamaño `w240`. (CA-7, CA-8)
- [x] T9 Tienda y datos de prueba: foto principal desde `gallery`; producto de prueba con atributo y galería.
- [x] T10 E2E de todos los CA en escritorio y móvil, con axe.
- [ ] T11 Lighthouse en el preview (6 URLs de producto) y CI en verde.
- [ ] T12 Al terminar: spec y plan a «Hecha»/«Implementado», BACKLOG ✅.
