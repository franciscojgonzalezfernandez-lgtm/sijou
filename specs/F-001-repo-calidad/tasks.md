# F-001 — Tareas

Rama: `feat/F-001-repo-calidad`. Las tareas marcadas con `[P]` se pueden hacer en paralelo con la anterior.

- [x] **T1** Inicializar el proyecto: Next.js (App Router, TypeScript, Tailwind, `src/`), `packageManager` de pnpm, `.nvmrc` (Node 24), `engines`, `.editorconfig`. Página de marcador de posición accesible. (CA-7)
- [x] **T2** TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`) y script `typecheck`. (CA-1)
- [x] **T3** [P] ESLint flat config: next, typescript-eslint con tipos, jsx-a11y y la regla que prohíbe `page.goto` en `e2e/`. Prettier con el plugin de Tailwind. Scripts `lint`, `format:check` y `fix`. (CA-1, CA-4)
- [x] **T4** [P] Vitest con cobertura v8, umbral del 100 % de ramas en `src/domain/**` y una prueba de ejemplo `it('CA-2: …')`. Script `test:unit`. (CA-2)
- [x] **T5** Playwright con los proyectos `mobile-chrome`, `mobile-safari` y `desktop-chrome`, el servidor web (`next start`) y trazas y vídeo solo si falla. Fixture `visit()` con axe (WCAG 2.2 AA). Prueba de humo `CA-3/CA-4` de la portada. Script `test:e2e`. (CA-3, CA-4)
- [x] **T6** Lighthouse CI (`lighthouserc.cjs`): URLs, perfil móvil, 3 ejecuciones, `categories:* ≥ 0.9`, subida a temporary-public-storage. Script `lh`. (CA-5)
- [x] **T7** Script `check` (formato + lint + tipos + unitarias). Probar en local. (CA-7)
- [x] **T8** Workflow `ci.yml` con los jobs `quality`, `secrets` (gitleaks), `e2e` y `lighthouse`; actions fijadas por SHA, caché de pnpm y de Playwright, `concurrency`, resumen de cobertura y comentario con los enlaces de Lighthouse. (CA-1…CA-5, CA-8)
- [x] **T9** [P] `dependabot.yml` (npm + github-actions, grupos, semanal). (CA-9)
- [x] **T10** Activar en GitHub el secret scanning y el push protection. (CA-8)
- [x] **T11** Abrir el PR de F-001 y dejar que CI pase en verde.
- [x] **T12** Protección de `main` con `gh api`: checks obligatorios (`quality`, `secrets`, `e2e`, `lighthouse`), rama al día, solo squash. El comando queda documentado en `docs/github-setup.md`. (CA-6)
- [x] **T13** PR canario (no se fusiona) con 5 roturas deliberadas: tipos, unitaria, axe, Lighthouse y secreto. Verificar que cada una bloquea el merge. Documentar el resultado en el PR de F-001 y cerrar el canario. (CA-1…CA-6, CA-8)
- [x] **T14** Actualizar el README (comandos), el BACKLOG (F-001 ✅) y el estado de la spec.
