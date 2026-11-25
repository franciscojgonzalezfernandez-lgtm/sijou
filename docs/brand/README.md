# Identidad de marca (N-04)

Resumen de la presentación de marca que entregó la clienta (24-11-2026) y de las decisiones tomadas con ella. El PDF original está **fuera del repositorio** (es público). Aquí quedan solo los datos que necesita el diseño (F-004).

**Estado:** cerrada el 24-11-2026. La clienta eligió **oliva, lino y marrón tierra**.

**Nombre de la marca:** «Sijôu», siempre con la ô (circunflejo). Sustituye a «Maison Natur» (25-11-2026). «sijou», sin acento, queda como nombre técnico del proyecto (paquete, base de datos, dominios).

## Personalidad

**Lujo sereno y natural.** Una casa de cosmética botánica, perfumes y velas hechos a mano. Lo valioso está en la materia prima, el oficio y la calma, no en el brillo.

| Es | No es |
|---|---|
| Serena: deja respirar al producto | Ruidosa: banners, contadores, urgencia |
| Artesanal: muestra el gesto y el origen | Industrial o genérica |
| Cálida: lino, madera, luz de tarde | Fría, clínica o técnica |
| Refinada: detalles cuidados, pocos | Ostentosa: dorados por todas partes |
| Honesta: ingredientes y cantidades claros | Exagerada: promesas milagro |

## Voz y tono

- Frases cortas y sensoriales; se nombran materias, texturas y aromas concretos (karité, caléndula, cera de soja).
- Se habla de tú al cliente en español; *du* en alemán; tono cercano y sereno en inglés.
- Sin signos de exclamación ni presión de compra ("¡Últimas unidades!"). El aviso de stock bajo es informativo: "Quedan 3".
- Los textos de ayuda y los errores dicen qué pasa y cómo seguir, sin culpar.

## Estilo visual

- **Espacio generoso.** Fondos de lino claro, mucho aire alrededor de cada producto; una sola acción destacada por pantalla.
- **Fotografía** con luz natural cálida, materiales nobles (piedra, lino, cerámica, madera), ramas y flores secas. Sin fondos blancos puros ni montajes recargados.
- **Formas** sobrias: esquinas apenas redondeadas (2–4 px), bordes finos, casi sin sombras. Nada de botones píldora.
- **Color** con moderación: el lino domina, el oliva marca las acciones y los titulares, el marrón tierra aparece en pocos detalles (promociones, etiquetas, foco).
- **Iconos** de trazo fino (1,5 px), sin relleno.
- **Movimiento** mínimo: fundidos cortos (150–200 ms). Nada se mueve con `prefers-reduced-motion`.
- **Logotipo** «Rama», elegido por la clienta el 25-11-2026 entre cuatro propuestas (Firma, Hoja, Rama y Arco): una rama de olivo de trazo fino junto al nombre en Cormorant Garamond, verde bosque `#33421E`. Versiones horizontal (cabecera), apilada (espacios grandes) y la rama sola (favicon e icono de app). En la web vive en `src/components/brand/`.

## Paleta elegida: oliva, lino y marrón tierra

Construida como escalas de 12 pasos en OKLCH (modelo Radix: cada paso tiene una función), con el tono constante en toda la escala. Los valores completos y los pares medidos están en el plan de F-004. Resumen de los papeles principales:

| Papel | Token | Color | Contraste medido |
|---|---|---|---|
| Fondo de página | `bg-page` | `#F6F4F1` lino | — |
| Superficie (tarjetas, fotos) | `bg-surface` | `#E8E4DE` lino | — |
| Texto principal | `text-primary` | `#342D22` | 12,4:1 sobre fondo (AAA) |
| Texto secundario | `text-secondary` | `#63594B` | 6,3:1 (AA) |
| Marca, titulares, logotipo | `brand` | `#33421E` verde bosque | 9,9:1 sobre fondo (AAA) |
| Acción principal (botón) | `accent-solid` | `#4A552F` oliva | texto 7,7:1 (AAA) |
| Detalle cálido (promos, foco) | `earth-solid` | `#7A502E` marrón tierra | texto blanco 6,97:1 (AA) |
| Enlaces en marrón | `earth-text` | `#765236` | 6,3:1 (AA) |
| Bordes de campos | `border-control` | `#877B6A` | 3,8:1 (≥ 3:1) |

Estados (error, éxito, aviso) en rojo, verde y ámbar, cada uno a más de 15° de tono del oliva y del marrón para que no se confundan. Siempre con icono o texto, nunca solo color.

## Tipografía

| Uso | Fuente | Tamaño (móvil → escritorio) | Peso | Interlineado |
|---|---|---|---|---|
| Display (portada) | Cormorant Garamond | 40 → 56 px | 500 | 1,1 |
| Título (h1 de página) | Cormorant Garamond | 32 → 40 px | 500 | 1,15 |
| Subtítulo (h2) | Cormorant Garamond | 28 px | 600 | 1,2 |
| Encabezado (h3, tarjetas) | Montserrat | 18 px | 600 | 1,3 |
| Texto | Montserrat | 16 px | 400 | 1,6 |
| Texto pequeño | Montserrat | 14 px | 400 | 1,5 |
| Etiqueta (versalitas) | Montserrat | 12 px, mayúsculas, espaciado 0,1 em | 600 | 1,4 |

- La serif solo se usa a partir de 28 px: más pequeña pierde legibilidad.
- Los precios usan cifras tabulares.
- Las fuentes se sirven desde nuestro dominio (sin peticiones a Google).

## Colores tomados de la presentación

| Origen | Color aproximado |
|---|---|
| Logotipo | `#33421E` verde bosque |
| Paredes, lino | `#E1DBD4` |
| Etiquetas, ramas | `#9D9F7E` salvia |
| Corcho, madera | `#6D4723` |
| Frascos, tapones | `#977144` oro viejo |
| Lavanda | `#454E69` |
| Cortinas, piedra oscura | `#2D2B2C` carbón |

Las páginas 7 y 8 de la presentación son restos de una plantilla de moda y no aplican.
