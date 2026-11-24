# F-004 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Propuesto (24-11-2026) · pendiente de aprobación |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Marca | [docs/brand](../../docs/brand/README.md): paleta oliva, lino y marrón tierra elegida por la clienta |
| Rama | `feat/F-004-sistema-diseno` |

## Resumen técnico

- Tokens en CSS en un solo archivo, `src/styles/tokens.css`, en dos niveles: **primitivos** por tono (`--olive-9`) y **semánticos** por función (`--color-accent-solid`). Los componentes solo usan los semánticos (CA-1). Tailwind 4 los expone con `@theme inline`.
- Escalas de 12 pasos en OKLCH, guardadas en hex (sRGB), modelo Radix: cada paso tiene una función fija. Sin modo oscuro (fuera de alcance).
- Fuentes con `next/font/google`: se descargan en el build y se sirven desde nuestro dominio, con `display: swap` y fuente de reserva ajustada para evitar saltos (CA-8).
- Componentes base propios en `src/components/ui/`, sin librerías de terceros: HTML nativo (`<dialog>`, `<details>`, `popover`) antes que ARIA. Servidor por defecto; cliente solo donde hay estado (diálogo, menú, toast).
- Catálogo interno de componentes en `/[locale]/catalogo` (CA-9), `noindex` y fuera del sitemap, visible en los 3 idiomas para probar los textos reales.

## Tokens

### Primitivos (hex)

Pasos: 1 fondo de página · 2 fondo sutil · 3 fondo de componente · 4 hover · 5 activo · 6 borde sutil · 7 borde · 8 borde hover · 9 relleno sólido · 10 hover del sólido · 11 texto de bajo contraste · 12 texto de alto contraste. Solo se publican los pasos que usa algún token semántico.

| Escala | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lino (neutro, tono 78°) | `#FBFAF8` | `#F6F4F1` | `#EFECE8` | `#E8E4DE` | `#E1DCD4` | `#D8D2C8` | `#C9C1B6` | `#B4AB9E` | `#968A78` | `#877B6A` | `#63594B` | `#342D22` |
| oliva (acento, 122°) | `#F9FBF6` | `#F3F6EF` | `#EBEEE4` | `#E2E7D9` | `#D9DFCE` | `#CFD6C1` | `#BEC6AE` | `#A7B193` | `#4A552F` | `#3D4722` | `#56603F` | `#33421E` (logotipo) |
| tierra (58°) | `#FEF9F5` | `#FBF3ED` | `#F7EAE1` | `#F2E1D5` | `#ECD8C9` | `#E6CDBC` | `#D9BCA7` | `#C7A58B` | `#7A502E` | `#6B4220` | `#765236` | `#412711` |
| rojo (28°) | | | `#FFE7E3` | | | | | | `#A8372E` | `#972620` | `#953830` | |
| verde (160°) | | | `#E1F2E8` | | | | | | | | `#2F684C` | |
| ámbar (82°) | | | `#F7EBD8` | | | | | | | | `#755402` | |

Los tonos de estado están a más de 15° del oliva y del tierra (rojo 30°, ámbar 24°, verde 38°), así cada color tiene un solo significado.

### Semánticos y contraste medido

Medido con la fórmula de WCAG 2.2 sobre el fondo en el que se pinta cada par. La prueba unitaria repite estas medidas y falla si alguna baja del mínimo (CA-2).

| Token | Valor | Par medido | Ratio | Mínimo |
|---|---|---|---|---|
| `bg-page` | lino 2 | | | |
| `bg-subtle` | lino 3 | | | |
| `bg-surface` | lino 4 | | | |
| `bg-surface-hover` | lino 5 | | | |
| `border-subtle` | lino 6 | decorativo (separadores) | | |
| `border-control` | lino 10 | sobre `bg-page` / `bg-surface` | 3,77 / 3,27 | 3 |
| `text-primary` | lino 12 | sobre `bg-page` / `bg-surface-hover` | 12,39 / 9,96 | 7 |
| `text-secondary` | lino 11 | sobre `bg-page` / `bg-surface-hover` | 6,25 / 5,03 | 4,5 |
| `brand` | oliva 12 | sobre `bg-page` / `bg-surface` | 9,87 / 8,55 | 7 |
| `accent-solid` | oliva 9 | contra `bg-page` (contorno de control) | 7,27 | 3 |
| `accent-solid-hover` | oliva 10 | | | |
| `text-on-accent` | lino 1 | sobre `accent-solid` / hover | 7,65 / 9,48 | 7 |
| `accent-subtle` | oliva 3 | `text-primary` encima | 11,58 | 7 |
| `accent-text` | oliva 11 | sobre `bg-page` / `bg-surface` | 6,09 / 5,28 | 4,5 |
| `earth-solid` | tierra 9 | texto blanco | 6,97 | 4,5 |
| `earth-solid-hover` | tierra 10 | texto blanco | 8,66 | 4,5 |
| `earth-subtle` | tierra 3 | `earth-text` encima | 5,88 | 4,5 |
| `earth-text` | tierra 11 | sobre `bg-page` / `bg-surface` | 6,31 / 5,47 | 4,5 |
| `focus-ring` | tierra 9 | sobre `bg-page` / `bg-surface` | 6,35 / 5,50 | 3 |
| `danger-text` | rojo 11 | sobre `bg-page` / `danger-subtle` | 6,63 / 6,16 | 4,5 |
| `danger-solid` | rojo 9 | texto blanco | 6,46 | 4,5 |
| `success-text` | verde 11 | sobre `bg-page` / `success-subtle` | 5,97 / 5,64 | 4,5 |
| `warning-text` | ámbar 11 | sobre `bg-page` / `warning-subtle` | 6,32 / 5,89 | 4,5 |

El anillo de foco (`focus-ring`, 2 px) se dibuja **separado 2 px** del elemento, para que siempre contraste con el fondo de la página y no con el relleno del botón (sobre el oliva solo daría 1,15:1).

### Tipografía

| Token | Fuente | Tamaño | Interlineado | Peso | Espaciado |
|---|---|---|---|---|---|
| `text-display` | Cormorant Garamond | `clamp(2.5rem, 1.9rem + 2.5vw, 3.5rem)` | 1.1 | 500 | -0.01em |
| `text-title` (h1) | Cormorant Garamond | `clamp(2rem, 1.7rem + 1.2vw, 2.5rem)` | 1.15 | 500 | -0.01em |
| `text-subtitle` (h2) | Cormorant Garamond | `1.75rem` | 1.2 | 600 | -0.01em |
| `text-heading` (h3) | Montserrat | `1.125rem` | 1.3 | 600 | 0 |
| `text-body` | Montserrat | `1rem` | 1.6 | 400 | 0 |
| `text-body-sm` | Montserrat | `0.875rem` | 1.5 | 400 | 0 |
| `text-label` | Montserrat, mayúsculas | `0.75rem` | 1.4 | 600 | 0.1em |

- La serif nunca baja de 28 px. Montserrat nunca baja de 400.
- Medida máxima de los textos largos: 68 caracteres (`max-width: 68ch`).
- `font-variant-numeric: tabular-nums` en precios y cantidades; `text-wrap: balance` en titulares, `pretty` en párrafos.
- Solo se cargan los pesos usados: Cormorant 500 y 600; Montserrat 400, 500 y 600 (variable). Subconjunto `latin` y `latin-ext` (alemán).

### Espaciado, radios, sombras y movimiento

- Espaciado: la escala de Tailwind (base 4 px). Márgenes laterales de página: 16 px en móvil, 24 px en tableta, 40 px en escritorio; ancho máximo de contenido 72 rem.
- Radios: `radius-sm` 2 px (campos, etiquetas), `radius-md` 4 px (botones, tarjetas), `radius-lg` 8 px (diálogo). Sin píldoras.
- Sombras: solo `shadow-overlay` para diálogo, menú y toast. El resto de la jerarquía con bordes y superficies.
- Movimiento: `duration-fast` 150 ms, `duration-base` 200 ms, `ease-out`. Todo a 0 con `prefers-reduced-motion`.
- Zonas táctiles: 44×44 px en botones, enlaces de navegación y controles (CA-4).

## Componentes de interfaz

Todos en `src/components/ui/`, sin textos propios: reciben los textos ya traducidos por props.

| Componente | Base | Notas de accesibilidad |
|---|---|---|
| `Button` | `<button>` | Variantes: `primary` (oliva, una por vista), `secondary` (borde), `ghost`, `danger`. Estado de carga con `aria-busy`. 44 px de alto |
| `Link` | `next-intl` `Link` | Subrayado siempre en el texto corrido; `aria-current="page"` en la navegación |
| `TextField` | `<input>` + `<label>` | Ayuda y error enlazados con `aria-describedby`; `aria-invalid`; 16 px para que iOS no haga zoom |
| `Select` | `<select>` nativo | Mismo patrón que `TextField` |
| `Checkbox`, `Radio` / `RadioGroup` | `<input>` nativo + `<fieldset>`/`<legend>` | Control visible de 20 px dentro de una zona de 44 px |
| `Dialog` | `<dialog>` + `showModal()` | Foco atrapado por el navegador, cierre con Esc, vuelta del foco al disparador |
| `Menu` | `<button>` + `popover` | Flechas para moverse, Esc cierra, `aria-expanded` |
| `Toast` | región `role="status"` (o `alert` para errores) | No desaparece mientras tiene foco o el ratón encima; mínimo 6 s |
| `Skeleton` | `<div aria-hidden>` | El contenedor lleva `aria-busy`; sin animación con movimiento reducido |
| `Badge` | `<span>` | Variantes: neutro, oliva, tierra, estados; nunca solo color: siempre texto |
| `Breadcrumbs` | `<nav aria-label>` + `<ol>` | El último elemento con `aria-current="page"` |
| `Pagination` | `<nav aria-label>` | Enlaces reales (SEO), página actual con `aria-current` |
| `SkipLink` | `<a href="#main">` | Primer elemento con foco; visible al recibirlo |

Además: `forced-colors: active` mantiene bordes y foco con colores del sistema (caso límite de la spec).

## Rutas, acciones y contratos

- `/[locale]/catalogo` (es), `/catalog` (en), `/katalog` (de): página del catálogo con cada componente en todos sus estados. `robots: noindex, nofollow`, fuera del sitemap. Sus textos de demostración están en un espacio `Catalog` de los mensajes (constitución III).
- Sin endpoints ni cambios de datos.

## Modelo de datos

Sin cambios.

## Dependencias nuevas

Ninguna. Las fuentes llegan con `next/font` (ya incluido en Next). El diálogo, el menú y el toast usan APIs nativas del navegador.

## Comprobación de la constitución

- [x] **I. Lighthouse ≥ 90 × 4.** Las fuentes se sirven desde el propio dominio con `swap` y métricas de reserva ajustadas (sin CLS). Solo dos familias y cinco cortes. Lighthouse CI audita también el catálogo. El JS de cliente se limita a diálogo, menú y toast.
- [x] **II. Accesibilidad AA.** Contraste medido arriba y verificado por prueba unitaria; AAA en el texto de cuerpo y en el botón principal. Foco visible y separado, zonas de 44 px, HTML nativo, `forced-colors` y `prefers-reduced-motion`.
- [x] **III. SEO e i18n.** Los componentes no contienen textos. El catálogo usa mensajes y no se indexa.
- [x] **IV. Integridad del dominio.** No aplica.
- [x] **V. Pruebas.** Unitarias: contraste de cada par de la tabla (CA-2) y tamaños de la escala (la serif nunca < 28 px). E2E: catálogo con axe en 3 idiomas y 3 dispositivos, recorrido con teclado de cada componente interactivo (CA-3, CA-5), 320 px y zoom 200 % sin scroll horizontal (CA-6), movimiento reducido (CA-7), zonas táctiles (CA-4), capturas de regresión visual del catálogo.
- [x] **VI. Seguridad y privacidad.** Sin peticiones a terceros (ni a Google Fonts) desde el navegador.
- [x] **VII. Simplicidad.** Sin librerías de componentes; tokens en un archivo.

## Riesgos y alternativas

| Riesgo | Mitigación |
|---|---|
| Las capturas de regresión visual cambian entre macOS y Linux | Se generan y comparan solo en CI (imagen Docker de Playwright) y en el proyecto de escritorio; en local se saltan |
| `popover` y `<dialog>` en navegadores antiguos | Soportados en todos los navegadores actuales (Safari 17+). Sin polyfill |
| La página de inicio sigue siendo provisional | F-004 aplica tokens y fuentes a lo existente (inicio, producto, selector de idioma); el diseño de las páginas llega con F-020 en adelante |
| La clienta pide retoques de color más adelante | Cambiar un primitivo o el mapeo semántico no toca componentes; la prueba de contraste avisa si un retoque rompe un par |
