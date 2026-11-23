# F-023 — Búsqueda

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-NAV-05; ADR-08 |
| Depende de | F-010 |

## Contexto
Encontrar productos aunque se escriban mal, también por ingrediente.

## Historias de usuario
- **HU-1** Como cliente, quiero buscar "lavanda" o "lavnda" y encontrar los productos con lavanda.
- **HU-2** Como cliente, quiero buscar por ingrediente, como "aloe".

## Criterios de aceptación
- **CA-1** La búsqueda mira en el nombre, la descripción corta, la descripción larga, los ingredientes y el nombre de la categoría, en el idioma activo.
- **CA-2** Tolera errores de escritura (1-2 letras), tildes y mayúsculas: "crema", "créma" y "crma" encuentran lo mismo.
- **CA-3** Resultados por relevancia: lo que coincide en el nombre pesa más que lo que coincide en la descripción.
- **CA-4** Página de resultados en `/{locale}/buscar?q=…` (ruta traducida), con la misma tarjeta que los listados. Lleva `noindex`.
- **CA-5** Sugerencias mientras se escribe, a partir de 2 caracteres, de hasta 5 productos, con navegación por teclado (patrón combobox accesible).
- **CA-6** Si no hay resultados, se muestra un mensaje y enlaces a las categorías.
- **CA-7** La respuesta tarda menos de 300 ms en el p95 con el catálogo esperado.
- **CA-8** Solo aparecen productos publicados.

## Estrategia de pruebas
- Unitarias: normalización del texto (tildes, mayúsculas).
- Integración: búsquedas con errores contra la base de datos de prueba en los 3 idiomas.
- E2E: escribir "lavnda" → sugerencia → Enter → resultados; teclado en el combobox; axe.

## Casos límite y errores
- Una búsqueda vacía o de 1 carácter no se ejecuta.
- Los caracteres especiales y las inyecciones se tratan como texto normal.

## Fuera de alcance
- Sinónimos y búsqueda por voz.

## Dudas
- Ninguna.
