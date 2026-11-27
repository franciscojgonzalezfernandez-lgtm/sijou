# F-012 — Categorías y colecciones

| Campo | Valor |
|---|---|
| Estado | Hecha (27-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-NAV-01, 02, 03 |
| Depende de | F-010 |

## Contexto
La administradora organiza el catálogo libremente con categorías jerárquicas y colecciones elegidas a mano, para que los clientes naveguen por distintas pantallas.

## Historias de usuario
- **HU-1** Como administradora, quiero crear categorías y subcategorías y reordenarlas.
- **HU-2** Como administradora, quiero crear colecciones temporales, como "Navidad".

## Criterios de aceptación
- **CA-1** Las categorías forman un árbol de hasta 3 niveles. Se pueden reordenar y mover dentro del árbol.
- **CA-2** Un producto puede estar en varias categorías y en varias colecciones.
- **CA-3** Campos traducibles de la categoría: nombre, slug, texto descriptivo, imagen de cabecera con texto alternativo, título SEO y descripción SEO. Para publicarla hacen falta el nombre y el slug en los 3 idiomas.
- **CA-4** Una colección tiene los mismos campos, más el orden manual de sus productos y fechas opcionales de visibilidad (inicio y fin).
- **CA-5** Solo se puede borrar una categoría si no tiene subcategorías. Sus productos no se borran: solo se desvinculan, y se avisa si alguno se queda sin categoría.
- **CA-6** Las categorías y colecciones se pueden ocultar sin borrarlas.

## Estrategia de pruebas
- Unitarias: validación de la profundidad del árbol, generación de breadcrumbs y validación de publicación.
- E2E: crear Rostro › Cremas › Noche, asignar un producto, mover la subcategoría, crear una colección con fecha de fin y comprobar que deja de verse después de esa fecha.

## Casos límite y errores
- Si se intenta mover una categoría dentro de su propia descendiente, se rechaza.

## Fuera de alcance
- Filtros por atributos (F-105).

## Dudas
- Ninguna.
