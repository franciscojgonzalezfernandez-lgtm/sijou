# Sijou

E-commerce for natural cosmetics. Trilingual storefront (EN · DE · ES), Spanish admin panel, prices in CHF.

**Status:** specification phase. No application code yet.

## Documentation
- [PRD](docs/PRD.md): functional and non-functional requirements (Spanish)
- [Architecture](docs/ARCHITECTURE.md): stack and ADRs
- [Constitution](specs/constitution.md): non-negotiable rules (Lighthouse ≥ 90 × 4, unit + E2E tests, WCAG 2.2 AA, …)
- [Backlog](specs/BACKLOG.md): every feature, with priorities and dependencies
- [SDD workflow](specs/README.md): spec → plan → tasks → implement → verify

## Planned stack
Next.js (App Router) · Payload CMS 3 · Neon Postgres (Frankfurt) · Better Auth · Stripe Checkout (TWINT, cards, wallets) · Vercel Blob · Resend · Sentry · Vercel (fra1)

## Quality gates
Every public template must score **≥ 90** in Lighthouse (mobile) for Performance, Accessibility, Best Practices and SEO (target 100). Every feature ships with unit tests (Vitest) and E2E tests (Playwright). All of this is enforced in CI.
