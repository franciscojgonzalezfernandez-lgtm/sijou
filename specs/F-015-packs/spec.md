# F-015 — Packs predefinidos

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-CAT-07 |
| Depende de | F-013 |

## Contexto
Se venden sets ya montados (p. ej. un "Ritual facial") formados por variantes de otros productos, con su propio precio.

## Historias de usuario
- **HU-1** Como administradora, quiero crear un pack eligiendo sus productos y cantidades, y ponerle un precio.
- **HU-2** Como cliente, quiero comprar un pack como un producto más.

## Criterios de aceptación
- **CA-1** Un pack es un producto de tipo `pack`, con los mismos campos de contenido que un producto (textos, fotos, categorías, SEO) y un precio propio.
- **CA-2** Componentes: una lista de variantes con su cantidad, de al menos 2 unidades en total. Un pack no puede contener otro pack.
- **CA-3** El stock disponible de un pack se calcula: es el mínimo, entre sus componentes, de (stock del componente ÷ cantidad en el pack), redondeado hacia abajo. No tiene stock propio.
- **CA-4** Al vender un pack se descuenta el stock de cada componente, en la misma transacción y en orden FEFO.
- **CA-5** La ficha del pack lista lo que contiene, con enlaces a cada producto.
- **CA-6** Si un componente está desactivado o archivado, el pack aparece como no disponible y el panel lo avisa.
- **CA-7** Los packs no se pueden reservar ni tienen "Avísame".

## Estrategia de pruebas
- Unitarias (100 % de ramas): cálculo del stock del pack.
- Integración: venta del pack → movimientos en cada componente.
- E2E: crear un pack de 3 componentes, comprarlo y comprobar el stock de cada componente.

## Casos límite y errores
- Si un mismo componente aparece dos veces, se suma en una sola línea.

## Fuera de alcance
- Packs que monta el cliente eligiendo productos (eso es el packaging, F-016).

## Dudas
- Ninguna.
