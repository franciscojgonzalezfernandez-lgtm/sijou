# F-050 — Páginas del CMS

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CMS-02, RF-CMS-04 |
| Depende de | F-020 |

## Contexto
Las páginas de contenido las escribe y mantiene la administradora en los 3 idiomas.

## Historias de usuario
- **HU-1** Como administradora, quiero escribir y editar las páginas "Sobre nosotros" y "Nuestra filosofía de vida".
- **HU-2** Como visitante, quiero leer las preguntas frecuentes y el glosario de ingredientes.

## Criterios de aceptación
- **CA-1** Tipo "página": título, slug, contenido de texto enriquecido, imagen destacada opcional (con texto alternativo) y SEO, todo traducible. Estados: borrador y publicado. Para publicar hacen falta los 3 idiomas.
- **CA-2** El editor genera HTML semántico: títulos H2 a H4 (el H1 es el título), listas, enlaces, negrita, citas e imágenes con texto alternativo obligatorio. No permite estilos sueltos.
- **CA-3** Páginas iniciales: Sobre nosotros, Nuestra filosofía de vida, Preguntas frecuentes, Glosario de ingredientes, y las legales de F-053.
- **CA-4** Preguntas frecuentes: pares de pregunta y respuesta reordenables que se muestran como desplegables accesibles y generan el JSON-LD `FAQPage`.
- **CA-5** Glosario: entradas por ingrediente (nombre, nombre INCI, propiedades, enlaces a productos y artículos), ordenadas alfabéticamente y con índice por letra.
- **CA-6** Se pueden previsualizar antes de publicar.
- **CA-7** Se puede elegir qué páginas aparecen en el pie y en el menú.

## Estrategia de pruebas
- Unitarias: limpieza del HTML del editor y generación del JSON de las preguntas frecuentes.
- E2E: crear y publicar una página en los 3 idiomas; desplegables de las preguntas frecuentes con teclado; índice del glosario; axe.

## Casos límite y errores
- Si un enlace interno apunta a una página despublicada, se avisa en el panel.

## Fuera de alcance
- Constructor visual de páginas.

## Dudas
- Ninguna.
