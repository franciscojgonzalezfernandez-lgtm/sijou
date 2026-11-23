# F-003 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Implementado (24-11-2026) |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-003-i18n-base` |

## Resumen técnico
Se usa **next-intl 4.14.9** (la última con ≥ 14 días) con rutas `/[locale]` y prefijo siempre visible. Un `proxy.ts` (el antiguo `middleware` en Next 16) negocia el idioma (cookie → `Accept-Language` → EN) y redirige `/` y las rutas sin prefijo. La tienda pasa a `src/app/(frontend)/[locale]/`, cuyo layout es el layout raíz de la tienda y pinta `<html lang>`. Los textos salen de `messages/{en,de,es}.json`, con una comprobación en CI de que las tres traducciones tienen las mismas claves. Una función común construye el `canonical` y los `hreflang` de cada página. El panel y la API quedan fuera del proxy.

## Estructura
```
messages/
  en.json · de.json · es.json            # textos de la interfaz (CA-7)
src/
  i18n/
    locales.ts                           # ["en","de","es"], EN por defecto (compartido con Payload en F-010)
    routing.ts                           # defineRouting: prefijo siempre, cookie, pathnames traducidos
    navigation.ts                        # Link, redirect, usePathname… con tipos de rutas
    request.ts                           # getRequestConfig: mensajes y formatos del idioma
    alternates.ts                        # canonical + hreflang + x-default (CA-5)
    formats.ts                           # formatos de precio y fecha por idioma (CA-8)
  proxy.ts                               # negociación y redirección (CA-2, CA-3, CA-9)
  app/
    (frontend)/[locale]/layout.tsx       # layout raíz de la tienda: <html lang>, NextIntlClientProvider
    (frontend)/[locale]/page.tsx         # portada (hoy, el marcador de posición, ya traducido)
    (frontend)/[locale]/not-found.tsx    # 404 en el idioma
    (payload)/…                          # sin cambios
scripts/check-messages.ts                # o prueba unitaria: claves y variables iguales en los 3 idiomas
```

## Decisiones

| Tema | Decisión | Motivo |
|---|---|---|
| Librería | next-intl 4.14.9 (ADR del documento de arquitectura) | Rutas por idioma, `pathnames` traducidos, ICU, formatos y compatibilidad con Cache Components mediante `next/root-params` |
| Prefijo | `localePrefix: "always"`: `/en`, `/de`, `/es`. `/` no tiene página: el proxy redirige | CA-1 |
| Negociación | Cookie `NEXT_LOCALE` → `Accept-Language` → `en`. Redirección 307 desde `/` y desde rutas sin prefijo | CA-2, CA-3. 307 porque el destino depende de quién visita |
| Rastreadores | Sin `Accept-Language` ni cookie → `/en`, una sola redirección. Las rutas con prefijo nunca se redirigen | CA-9: sin bucles |
| Cookie | Solo se guarda cuando la persona elige un idioma distinto del negociado (comportamiento de next-intl 4). Dura 1 año. Es una cookie de preferencias: se declara en la política de cookies (F-053) | CA-3, CA-4, privacidad |
| Selector de idioma | Enlaces normales `<a hreflang lang>` a la misma página en cada idioma, sin JavaScript. El proxy guarda la cookie al visitar el idioma elegido. El diseño final llega en F-020 | CA-4, rendimiento (Lighthouse) |
| Slugs traducidos | Rutas fijas: `pathnames` de next-intl (p. ej. `/es/sobre-nosotros`). Rutas dinámicas (productos, categorías, blog): cada página declara sus URLs alternativas con `alternates.ts`, a partir de los slugs de la base de datos (F-010 en adelante). El selector usa esas mismas URLs | CA-4, RF-I18N-03 |
| hreflang y canonical | `buildAlternates(locale, urlsByLocale)` devuelve `alternates.canonical` y `alternates.languages` (`en`, `de`, `es` y `x-default` → EN), en URLs absolutas con `metadataBase` = `NEXT_PUBLIC_SITE_URL` | CA-5, RF-SEO-03 |
| `lang` | El layout raíz de `(frontend)/[locale]` pinta `<html lang={locale}>` | CA-6 |
| Idioma no soportado | `generateStaticParams` en `[locale]` y `notFound()` en el layout si el idioma no es válido (`dynamicParams` no es compatible con Cache Components): `/fr` da 404. Una ruta sin prefijo (`/fr/x`) se redirige a `/en/fr/x`, que da 404 en inglés | Casos límite de la spec |
| Mensajes | JSON por idioma con espacios de nombres por pantalla. Tipos de las claves a partir de `en.json` (un error de tipos si se usa una clave que no existe) | CA-7 |
| Comprobación de mensajes | Prueba unitaria que compara las claves y las variables ICU de los 3 idiomas. Se ejecuta en `pnpm check` y, por tanto, en el job `quality` | CA-7: si falta una clave, CI falla |
| Formatos | Precio: `Intl.NumberFormat("<idioma>-CH", { currency: "CHF" })`. Fechas: formatos con nombre (`short`, `long`) en `formats.ts`. Ver la duda D-1 sobre el formato del precio en español | CA-8 |
| Cache Components | El idioma se lee con `next/root-params` (lo que recomienda next-intl 4.14), no con `setRequestLocale`. Las páginas siguen siendo estáticas por idioma. `next typegen` no detecta el parámetro con dos layouts raíz, así que `src/i18n/root-locale.ts` le da tipo | Rendimiento (constitución I) |
| Proxy | `matcher` que excluye `/admin`, `/api`, `/_next`, `/_vercel` y los archivos con extensión (`robots.txt`, `favicon.ico`…) | El panel sigue en español sin prefijo (RF-I18N-05) |
| `robots.txt` y metadatos de raíz | Siguen fuera de `[locale]` | Son únicos para todo el sitio |

## Pruebas
- **Unitarias:**
  - Negociación: cookie válida gana, cookie inválida se ignora, `Accept-Language` con pesos (`de-CH;q=0.9, es;q=0.8` → `de`), idioma no soportado → `en`, sin cabecera → `en`. (CA-2, CA-3, CA-9)
  - `buildAlternates`: 3 idiomas + `x-default` = EN, canonical absoluto, slugs distintos por idioma. (CA-5)
  - Formato de precio y fecha en cada idioma. (CA-8)
  - Mensajes: mismas claves y mismas variables ICU en `en`, `de` y `es`. (CA-7)
- **E2E** (en el preview, como siempre, con axe en cada `visit`):
  - Navegador en alemán en `/` → `/de`, `<html lang="de">`. (CA-2, CA-6)
  - Cookie `NEXT_LOCALE=es` y navegador en alemán → `/es`. (CA-3)
  - Sin `Accept-Language` → `/en` con una sola redirección. (CA-9)
  - El selector en `/en` lleva a `/es`, guarda la cookie y la siguiente visita a `/` va a `/es`. (CA-4). Con una página de producto se amplía en F-022.
  - Cada idioma tiene `hreflang` para en, de, es y `x-default`, y `canonical`. (CA-5)
  - `/fr` → 404. `/admin` sigue en español y sin prefijo.
- **Lighthouse:** se audita `/en`, `/de` y `/es` (constitución I: cada idioma).

## Dependencias nuevas
| Paquete | Para qué | Impacto en el bundle |
|---|---|---|
| `next-intl` (4.14.9) | Rutas, mensajes y formatos | Casi todo en el servidor. En el cliente solo el proveedor, con los mensajes que necesiten los componentes de cliente (hoy, ninguno) |

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** páginas estáticas por idioma, selector sin JavaScript. Se auditan los 3 idiomas.
- [x] **II. Accesibilidad AA:** `lang` correcto en cada página, enlaces del selector con `hreflang` y `lang`, axe en las E2E.
- [x] **III. SEO e i18n:** prefijo, `hreflang`, `x-default`, `canonical` y ningún texto fijo en el código.
- [x] **IV. Integridad del dominio:** no aplica.
- [x] **V. Pruebas unitarias + E2E:** ver "Pruebas".
- [x] **VI. Seguridad y privacidad:** la cookie solo guarda el idioma y se declara en la política de cookies.
- [x] **VII. Simplicidad:** una sola librería, sin JavaScript para el selector.

## Dudas
- **D-1 (resuelta: se respeta el idioma):** formato del precio en español. Con las reglas de cada idioma, `es-CH` da `1234,50 CHF`, mientras que `en-CH` y `de-CH` dan `CHF 1'234.50` (el ejemplo de la spec, `CHF 24.90`, es el formato suizo). Propuesta: **respetar el idioma** (`24,90 CHF` en español), que es lo que pide CA-8 ("se adaptan al idioma"). Alternativa: formato suizo en los 3 idiomas.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| next-intl con Cache Components y `next/root-params` es reciente | Se comprueba en local y en el preview antes de seguir. Si falla, se pasa el idioma por `params` con `setRequestLocale` (API estable, aunque marcada como obsoleta) |
| Redirecciones que rompen el SEO | 307 solo en `/` y en rutas sin prefijo. Las URLs con prefijo responden 200 directamente. `x-default` apunta a EN |
| Mensajes sin traducir que llegan a producción | La prueba de claves falla en CI, y los tipos fallan si una clave no existe |
| El proxy intercepta el panel o archivos estáticos | `matcher` explícito y una E2E sobre `/admin` y `/robots.txt` |
