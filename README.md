# Sijou

E-commerce for natural cosmetics. Trilingual storefront (EN · DE · ES), Spanish admin panel, prices in CHF.

**Status:** F-001 (repository and quality gates) done. Next: F-002 (app skeleton).

## Documentation
- [PRD](docs/PRD.md): functional and non-functional requirements (Spanish)
- [Architecture](docs/ARCHITECTURE.md): stack and ADRs
- [Constitution](specs/constitution.md): non-negotiable rules (Lighthouse ≥ 90 × 4, unit + E2E tests, WCAG 2.2 AA, …)
- [Backlog](specs/BACKLOG.md): every feature, with priorities and dependencies
- [SDD workflow](specs/README.md): spec → plan → tasks → implement → verify

## Development
Requirements: Node.js 24 (`.nvmrc`), pnpm via Corepack (`corepack enable`) and Docker (local Postgres).

```bash
docker compose up -d          # Postgres on localhost:54329
cp .env.example .env.local    # then set PAYLOAD_SECRET and SEED_ADMIN_PASSWORD
pnpm install
pnpm migrate && pnpm seed     # schema + test administrator
pnpm dev                      # shop at /, admin panel at /admin
```

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies (only versions published ≥ 14 days ago) |
| `pnpm dev` | Development server |
| `pnpm check` | Format + lint + types + unit tests with coverage |
| `pnpm test:e2e` | Production build + Playwright (mobile Chrome, mobile Safari, desktop Chrome) with axe |
| `pnpm lh` | Production build + Lighthouse CI (mobile, median of 3 runs, every category ≥ 90) |
| `pnpm fix` | Prettier + `eslint --fix` |
| `pnpm migrate:create <name>` | New versioned Payload migration (never schema push outside local dev) |
| `pnpm generate` | Regenerate Payload types and the admin import map |

CI runs `quality` and `secrets` on every PR, and `e2e` and `lighthouse` against the PR's Vercel preview (and production after merging); all four are required to merge into `main`. Repository settings: [docs/github-setup.md](docs/github-setup.md).

## Planned stack
Next.js (App Router) · Payload CMS 3 · Neon Postgres (Frankfurt) · Better Auth · Stripe Checkout (TWINT, cards, wallets) · Vercel Blob · Resend · Sentry · Vercel (fra1)

## Quality gates
Every public template must score **≥ 90** in Lighthouse (mobile) for Performance, Accessibility, Best Practices and SEO (target 100). Every feature ships with unit tests (Vitest) and E2E tests (Playwright). All of this is enforced in CI.
