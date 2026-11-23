# F-002 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Implementado (23-11-2026) |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-002-esqueleto-app` |
| Entorno temporal | Cuenta Hobby del técnico hasta N-03 (ver "Desviación temporal") |

## Resumen técnico
Se añade Payload CMS 3 al proyecto Next.js de F-001, en la misma aplicación: la tienda en el grupo de rutas `(frontend)` y el panel en `(payload)/admin`. La base de datos es Neon (Frankfurt), contratada desde el Marketplace de Vercel, para que cada deploy de preview reciba su propia rama de base de datos sin código propio. Las funciones se fijan en `fra1`. Las migraciones de Payload se ejecutan en el build, así que una migración que falla cancela el deploy. Las variables de entorno se validan al arrancar. Con los previews disponibles, las E2E y Lighthouse pasan a ejecutarse contra la URL del preview, y se cierra la desviación temporal de F-001.

## Estructura
```
src/
  app/
    (frontend)/layout.tsx · page.tsx     # tienda (hoy, el marcador de posición de F-001)
    (payload)/admin/[[...segments]]/…    # generado por Payload (panel)
    (payload)/api/[...slug]/route.ts     # API REST de Payload
    (payload)/layout.tsx                 # layout raíz propio del panel
    robots.ts                            # excluye /admin y /api (CA-8)
  payload.config.ts
  collections/Users.ts                   # administradoras (auth de Payload)
  env.ts                                 # esquema y validación de variables (CA-6)
  migrations/                            # migraciones versionadas de Payload (CA-5)
scripts/seed.ts                          # datos de prueba (CA-7)
vercel.json                              # región fra1
scripts/vercel-build.sh                  # migraciones (+ seed en previews) y build
docker-compose.yml                       # Postgres local (puerto 54329)
.env.example
```
Cada grupo de rutas tiene su propio layout raíz: el CSS y el JavaScript del panel nunca llegan a la tienda, lo que protege la puerta de Lighthouse.

## Decisiones

| Tema | Decisión | Motivo |
|---|---|---|
| Versión de Payload | 3.93.0 (la última con ≥ 14 días, por la regla de `minimumReleaseAge`). Compatible con Next ≥ 16.3.3 | Higiene de la cadena de suministro (F-001) |
| Adaptador de base de datos | `@payloadcms/db-postgres` (node-postgres) con la cadena de conexión con pooler de Neon | Las funciones de Vercel (Fluid Compute) reutilizan instancias, así que un pool pequeño (`max: 5`) funciona. Es el adaptador estándar de Payload |
| Contratación de Neon | Integración nativa de Neon desde el Marketplace de Vercel, en el equipo de la clienta, región `aws-eu-central-1` | Facturación unificada, variables de entorno automáticas y ramas por preview gestionadas por Vercel (CA-2) |
| Origen de las ramas de preview | Siempre una rama `staging` de Neon con datos de prueba, nunca producción (D-1, decidido) | Ningún preview copia datos personales reales (nLPD) |
| Borrado de ramas | Las borra la integración al eliminar el deploy de preview. Además, un job de GitHub Actions en `pull_request: closed` borra la rama por la API de Neon, para cumplir "al cerrar el PR" | CA-2 |
| Región | `regions: ["fra1"]` en `vercel.json` y región por defecto del proyecto en `fra1`. Se usa `vercel.json` en vez de `vercel.ts` para no añadir `@vercel/config` por una sola clave | CA-3, ADR-02 |
| Migraciones | Script `vercel-build` (`scripts/vercel-build.sh`): `payload migrate` con la conexión directa (sin pooler), seed solo en previews, y `next build`. Las migraciones se generan con `payload migrate:create` y se versionan en `src/migrations/`. Nunca `push` fuera del desarrollo local | CA-5: si una migración falla, el build falla y producción sigue igual |
| Autenticación del panel | La de Payload (colección `users`, solo administradoras) | ADR-04 deja la unificación con Better Auth para la prueba de concepto de F-007. No se adelanta trabajo |
| Idioma del panel | `i18n: { supportedLanguages: { es }, fallbackLanguage: "es" }` | CA-4 |
| Indexación | `robots.ts` con `Disallow: /admin` y `/api`; `X-Robots-Tag: noindex` en `/admin` y `/api` (cabecera en `next.config.ts`) | CA-8 |
| Variables de entorno | `src/env.ts` con un esquema `zod`, importado desde `next.config.ts` (falla el build) y desde `payload.config.ts` (falla el arranque). El error lista cada variable que falta | CA-6 |
| Datos de prueba | `pnpm seed`, con la API local de Payload. En F-002 crea la administradora de prueba. Cada feature amplía el script con sus colecciones (categorías en F-011, productos en F-010…) (D-2, decidido) | Los productos y las categorías aún no existen |
| Imágenes (Vercel Blob) | No en F-002. Llega con F-010, que es la primera colección con imágenes | Simplicidad (constitución VII) |

## Variables de entorno (`.env.example`)
| Variable | Obligatoria | Origen |
|---|---|---|
| `DATABASE_URL` | Sí | Integración de Neon (con pooler) |
| `DATABASE_URL_UNPOOLED` | Sí (migraciones) | Integración de Neon |
| `PAYLOAD_SECRET` | Sí | Generada (32+ bytes), distinta por entorno |
| `NEXT_PUBLIC_SITE_URL` | Sí | URL canónica. En previews se calcula a partir de `VERCEL_URL` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Solo para `pnpm seed` | Valores de prueba locales |

## CI y entornos
- **Vercel:** proyecto enlazado al repositorio. Push a `main` despliega en producción y cada PR obtiene un preview (CA-1). La protección de deploys de Vercel queda activa en los previews.
- **Jobs `e2e` y `lighthouse`:** se disparan con `deployment_status` (éxito del preview) y se ejecutan contra la URL del preview, usando el secreto de bypass de la protección (`VERCEL_AUTOMATION_BYPASS_SECRET` como secreto de GitHub). Los nombres de los checks no cambian, así que la protección de `main` sigue igual.
- **Job `quality`:** sin cambios. Las pruebas unitarias no tocan la base de datos.
- **Job `neon-cleanup`:** al cerrar un PR, borra la rama `preview/<rama>` si sigue existiendo (`NEON_API_KEY` y `NEON_PROJECT_ID` como secretos de GitHub).
- **E2E nuevas:** la portada (ya existe) y `/admin`, que debe mostrar el formulario de inicio de sesión en español y no tener violaciones de axe (CA-4). Una prueba comprueba que `/robots.txt` excluye `/admin` y que `/admin` envía `noindex` (CA-8).
- **Lighthouse:** se mide solo la tienda. El panel no es una plantilla pública.

## Dependencias nuevas
| Paquete | Para qué | Impacto en el bundle de la tienda |
|---|---|---|
| `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/translations` | CMS y panel | Ninguno: solo se cargan en `(payload)` y en el servidor |
| `graphql` | Dependencia `peer` de Payload | Ninguno |
| `sharp` | Redimensionado de imágenes de Payload (se usa a partir de F-010). Hay que permitir su script de instalación en `pnpm-workspace.yaml` | Ninguno (servidor) |
| `zod` | Validación de variables de entorno (y, más adelante, de formularios) | Ninguno en F-002 |
| `tsx` (dev) | Ejecutar `scripts/seed.ts` | Ninguno |

Todas en versiones publicadas hace al menos 14 días.

## Pruebas
- **Unitarias (`src/env.test.ts`):** variables completas → OK; falta una → el error la nombra; faltan varias → las nombra todas; formato inválido (URL) → error. Cobertura del 100 % de ramas en `env.ts`. (CA-6)
- **E2E:** portada (CA-1), login de `/admin` en español con axe (CA-4), `robots.txt` y `noindex` (CA-8).
- **Manual, una vez, documentada en el PR:** región `fra1` en los logs de la función y región de Neon (CA-3); creación y borrado de la rama de Neon al abrir y cerrar el PR (CA-2); una migración rota hace fallar el deploy (caso límite).

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** la tienda no carga nada del panel (layouts raíz separados). Se mide en el preview real.
- [x] **II. Accesibilidad AA:** axe en la portada y en el login del panel.
- [x] **III. SEO e i18n:** el panel queda fuera de los buscadores. La i18n de la tienda llega en F-003.
- [x] **IV. Integridad del dominio:** no aplica todavía (no hay stock).
- [x] **V. Pruebas unitarias + E2E:** ver "Pruebas".
- [x] **VI. Seguridad y privacidad:** secretos solo en Vercel y en GitHub Secrets; `.env.example` sin valores; previews protegidos; previews sin datos personales reales (D-1).
- [x] **VII. Simplicidad:** una sola app, sin Blob ni Better Auth hasta que hagan falta.

## Desviación temporal: cuenta Hobby del técnico
Decidido el 23-11-2026. Hasta que la clienta tenga el equipo Vercel Pro (N-03), el proyecto se despliega en la cuenta Hobby del técnico, con Neon contratado desde esa cuenta (plan gratuito).
- El plan Hobby es solo para uso no comercial. Sirve para desarrollar y para los previews, pero **la tienda no se abre al público en Hobby**.
- Antes del lanzamiento (y en cuanto exista el equipo Pro) se crea el proyecto en el equipo de la clienta, se vuelve a contratar Neon allí (los datos de antes del lanzamiento son de prueba) y se copian las variables de entorno. Los secretos de GitHub (`VERCEL_AUTOMATION_BYPASS_SECRET`, `NEON_API_KEY`, `NEON_PROJECT_ID`) se sustituyen por los del equipo nuevo.
- Límites del plan gratuito de Neon (almacenamiento y número de ramas): se borran las ramas de los PR cerrados (job `neon-cleanup`).

## Dudas
- **D-1 (resuelta, pendiente de aplicar antes del lanzamiento):** los previews copian siempre de la rama `staging` con datos de prueba. Con la integración de Neon gestionada por Vercel, las ramas de preview salen de la rama por defecto y no se puede cambiar desde la CLI. Hoy no hay riesgo: producción solo tiene datos de prueba. Se configura al migrar al equipo de la clienta (N-03), antes de que haya datos reales.
- **D-2 (resuelta):** en F-002 el seed crea solo la administradora de prueba, y cada feature lo amplía.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| Payload añade peso o JavaScript a la tienda | Layouts raíz separados y Lighthouse en cada PR. Si algo se cuela, se ve en la puerta |
| Conexiones agotadas en Neon con muchas funciones | Cadena con pooler (PgBouncer) y pool pequeño por instancia |
| El build con migraciones tarda más | Las migraciones son incrementales. Se vigila el tiempo de deploy |
| `deployment_status` no llega o llega tarde | Timeout en los jobs. Como alternativa, esperar al preview con la API de Vercel |
