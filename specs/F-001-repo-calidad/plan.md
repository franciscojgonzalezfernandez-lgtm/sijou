# F-001 — Plan técnico

| Campo | Valor |
|---|---|
| Estado | Aprobado (23-11-2026) |
| Spec | [spec.md](./spec.md) (aprobada el 23-11-2026) |
| Rama | `feat/F-001-repo-calidad` |

## Resumen técnico
Se crea una aplicación Next.js mínima (una página de "próximamente") y, sobre ella, las puertas de calidad de la constitución: tipos, lint, formato, pruebas unitarias, pruebas E2E con axe, Lighthouse CI ≥ 90, escaneo de secretos, actualizaciones de dependencias y protección de `main`.

**Desviación temporal de la spec (necesita aprobación):** CA-3 y CA-5 piden ejecutar las E2E y Lighthouse contra el deploy de preview de Vercel, pero ese deploy no existe hasta F-002 y N-03 (el equipo de Vercel Pro de la clienta). Hasta entonces, ambos se ejecutan en CI contra un build de producción local (`next build && next start`). En F-002 se añade la ejecución contra la URL del preview. Las puertas y los umbrales son los mismos en los dos casos.

## Estructura del repositorio
```
.github/
  workflows/ci.yml          # quality → e2e, lighthouse (en paralelo)
  dependabot.yml            # npm + github-actions, agrupadas, semanal
src/
  app/[placeholder]         # página mínima, accesible y con SEO básico
  domain/                   # lógica de dominio pura (vacía, con umbral 100 %)
  lib/
e2e/
  fixtures.ts               # visit(page, url) = goto + axe
  smoke.spec.ts
lighthouserc.cjs
vitest.config.ts
playwright.config.ts
eslint.config.mjs
.prettierrc · .editorconfig · .nvmrc · .gitleaks.toml (si hace falta)
```

## Herramientas y configuración

| Área | Elección | Notas |
|---|---|---|
| Runtime | Node.js 24 LTS | `.nvmrc` y `engines` en `package.json` |
| Paquetes | pnpm vía Corepack | Campo `packageManager` con la versión exacta. `pnpm install --frozen-lockfile` en CI |
| Framework | Next.js (última estable, App Router) | Fijado por el lockfile. Sin Payload ni base de datos (llegan en F-002) |
| Tipos | TypeScript `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` | `pnpm typecheck` = `tsc --noEmit` |
| Lint | ESLint (flat config): `eslint-config-next`, `typescript-eslint` (con tipos), `jsx-a11y` | Una regla prohíbe `page.goto` directo en `e2e/` y obliga a usar `visit()` (CA-4) |
| Formato | Prettier + plugin de Tailwind | `pnpm format:check` en CI |
| Unitarias | Vitest + cobertura v8 | Umbral del 100 % de ramas en `src/domain/**`, según la constitución V. Informe de cobertura en el resumen del job (CA-2) |
| E2E | Playwright | 3 proyectos: `mobile-chrome` (Pixel 7), `mobile-safari` (iPhone 14, WebKit) y `desktop-chrome`. Trazas y vídeo solo si falla. Informe HTML como artefacto |
| Accesibilidad | `@axe-core/playwright` | `visit()` navega, espera a que la página cargue y ejecuta axe con las reglas WCAG 2.2 AA. Cualquier violación hace fallar la prueba (CA-4) |
| Lighthouse | `@lhci/cli` | Perfil móvil (el de Lighthouse por defecto), 3 ejecuciones por URL, cuenta la mediana (P-02). Las 4 categorías deben ser ≥ 0,90. Los informes se suben a temporary-public-storage y los enlaces se publican como comentario en el PR (CA-5) |
| Secretos | Gitleaks (en CI) + secret scanning y push protection de GitHub | Push protection bloquea el push. Gitleaks bloquea el PR (CA-8) |
| Dependencias | Dependabot | Grupos: `next-react`, `testing`, `lint`, `actions`. Semanal (CA-9) |

## CI (`.github/workflows/ci.yml`)
Se dispara en `pull_request` y en `push` a `main`. Con `concurrency`, un push nuevo cancela la ejecución anterior del mismo PR. Todas las actions se fijan por SHA del commit (Dependabot las actualiza).

| Job | Pasos | Depende de |
|---|---|---|
| `quality` | install → `format:check` → `lint` → `typecheck` → `test:unit --coverage` → resumen de cobertura | — |
| `secrets` | gitleaks sobre el diff del PR | — |
| `e2e` | install → `playwright install --with-deps` → `build` → `start` (en segundo plano, esperando el puerto) → `test:e2e` → subir el informe si falla | `quality` |
| `lighthouse` | install → `build` → `lhci autorun` (arranca el servidor) → comentario en el PR con los enlaces | `quality` |

Tiempos objetivo: `quality` menos de 2 min; `e2e` y `lighthouse` menos de 6 min cada uno. Hay caché de pnpm y de los navegadores de Playwright.

## Comandos locales (CA-7)
| Comando | Qué hace |
|---|---|
| `pnpm check` | formato + lint + tipos + unitarias |
| `pnpm test:e2e` | build + start + Playwright (los 3 proyectos) |
| `pnpm lh` | build + Lighthouse CI en local |
| `pnpm fix` | Prettier + `eslint --fix` |

Sin hooks de pre-commit: el CI ya lo hace cumplir, y así se evita fricción (constitución VII).

## Protección de `main` (CA-6)
Se configura con `gh api` (queda documentado en `docs/`):
- Solo se fusiona por PR, con 0 aprobaciones obligatorias (hay un solo desarrollador).
- Checks obligatorios: `quality`, `secrets`, `e2e` y `lighthouse`.
- La rama debe estar al día con `main`. No se permiten force-push ni borrar la rama.
- Merge solo por squash, y la rama se borra al fusionar.

## Página de marcador de posición
Es solo el objetivo de las puertas de calidad, no la tienda. Tiene `lang="en"`, `title`, meta descripción, un `h1`, un landmark `main` y nada de JavaScript de cliente. Debe sacar 100 en las 4 categorías y no tener violaciones de axe. F-003 y F-020 la sustituyen.

## Dependencias nuevas
Todas son solo de desarrollo, salvo Next, React y React DOM: typescript, eslint y sus plugins, prettier, vitest, @vitest/coverage-v8, @playwright/test, @axe-core/playwright y @lhci/cli. No añaden nada al bundle público.

## Comprobación de la constitución
- [x] **I. Lighthouse ≥ 90 × 4:** puerta en CI, perfil móvil y mediana de 3 ejecuciones.
- [x] **II. Accesibilidad AA:** axe en cada `visit()` y `jsx-a11y` en el lint.
- [x] **III. SEO e i18n:** el marcador de posición pasa SEO. La i18n llega en F-003.
- [x] **IV. Integridad del dominio:** no aplica todavía. Se prepara `src/domain` con un umbral del 100 %.
- [x] **V. Pruebas unitarias + E2E:** infraestructura completa, con pruebas de ejemplo que citan su CA.
- [x] **VI. Seguridad:** gitleaks, push protection, actions fijadas por SHA y `.env*` en `.gitignore`.
- [x] **VII. Simplicidad:** sin hooks, sin herramientas solapadas (ESLint + Prettier, sin Biome).

## Verificación de la puerta (CA-1…CA-9)
Un PR "canario", que no se fusiona, con 5 commits que rompen una cosa cada uno: un error de tipos, una prueba unitaria fallida, un botón sin nombre accesible (axe), una imagen grande sin optimizar en la portada (Lighthouse) y un secreto de prueba con el formato de una clave de Stripe (gitleaks). En cada caso debe fallar el check correspondiente y el merge debe quedar bloqueado. El resultado se documenta en el PR de F-001.

## Riesgos y alternativas
| Riesgo | Mitigación |
|---|---|
| El rendimiento varía en los runners de GitHub y puede bajar de 90 en Lighthouse | Mediana de 3 ejecuciones y servidor en modo producción. Si aun así hay ruido, se mide con más ejecuciones antes de tocar el umbral |
| Los informes en temporary-public-storage son públicos y caducan a los 7 días | El repositorio ya es público y los informes no tienen datos sensibles. Alternativa: subirlos como artefacto del job |
| WebKit en Linux no es Safari real | La prueba real en iOS queda para F-071 |
| La desviación de CA-3 y CA-5 (build local en vez de preview) | Se cierra en F-002, con un job adicional contra la URL del preview |
