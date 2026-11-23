# F-014 — Automatizaciones de stock y ofertas por caducidad

| Campo | Valor |
|---|---|
| Estado | Aprobada (23-11-2026) |
| Prioridad | P0 |
| Requisitos PRD | RF-STK-03, RF-STK-07, RF-STK-09, RF-PED-08 |
| Depende de | F-013, F-006 |

## Contexto
Cuando un lote se acerca a su caducidad, sale del catálogo normal y pasa a la sección "Ofertas". El día que caduca, se retira. La administradora recibe avisos antes de quedarse sin stock y de que algo caduque.

## Historias de usuario
- **HU-1** Como administradora, quiero que los lotes a punto de caducar se vendan solos en "Ofertas" en lugar de perderse.
- **HU-2** Como administradora, quiero que los lotes caducados dejen de venderse sin tener que hacer nada.
- **HU-3** Como administradora, quiero un aviso cuando una variante tenga poco stock o un lote esté a punto de caducar.
- **HU-4** Como cliente, quiero encontrar productos a mejor precio sabiendo cuándo caducan.

## Criterios de aceptación
- **CA-1** **Paso a oferta:** cuando a un lote le quedan N días o menos para caducar (N es un ajuste general configurable), sus unidades salen del stock normal de la variante y pasan a estar "en oferta". El cambio queda registrado como movimiento de stock.
- **CA-2** Las unidades en oferta aparecen en la sección **Ofertas** (F-021) como el mismo producto y variante, con un precio de oferta y la fecha de caducidad bien visible. [DUDA: ¿descuento general en % o por producto?]
- **CA-3** Las ventas normales solo consumen lotes que no están en oferta (FEFO entre ellos). Las ventas de Ofertas solo consumen lotes en oferta (FEFO entre ellos).
- **CA-4** **Retirada:** el día de la caducidad, el lote (en oferta o no) se da de baja con el motivo `caducidad` y autor `sistema`.
- **CA-5** Cada día se envía un email al administrador con los lotes que caducan en los próximos 30 días (configurable), y con los que han pasado a oferta. Si no hay ninguno, no se envía.
- **CA-6** Umbral general de stock bajo, configurable. Cuando una variante (sin contar las unidades en oferta) baja de él, se avisa al administrador una sola vez, hasta que el stock vuelva a superarlo.
- **CA-7** El proceso diario es idempotente: si se ejecuta dos veces, no mueve ni da de baja nada dos veces. Si falla un día, al siguiente procesa lo pendiente.
- **CA-8** Si el paso a oferta deja la variante sin stock normal, en el catálogo normal aparece como agotada (o reservable, si cumple F-060).

## Estrategia de pruebas
- Unitarias (100 % de ramas): selección de lotes para oferta y para retirada con distintos N, separación entre stock normal y stock en oferta en FEFO, regla "una vez hasta que se recupere".
- Integración: ejecutar el proceso dos veces → un solo movimiento.
- E2E: un lote con caducidad dentro de N días → aparece en Ofertas con su fecha y no en el stock normal; un lote que caduca hoy → se retira; email capturado.

## Casos límite y errores
- Si se crea un lote que ya está dentro de los N días, entra directamente en oferta, con un aviso.
- Un pack cuyo componente solo tiene unidades en oferta aparece como no disponible.

## Fuera de alcance
- Retirada de lotes por alerta sanitaria (se hace con un ajuste manual).

## Dudas
- [DUDA: descuento de las ofertas: ¿% general configurable o por producto?]
