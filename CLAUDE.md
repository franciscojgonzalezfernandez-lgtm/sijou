# Project instructions

## Workflow: Spec-Driven Development
- Never write production code for a feature without an approved `specs/F-XXX-*/spec.md` and `plan.md`. Follow `specs/README.md`.
- Every plan must pass `specs/constitution.md`. Read it before planning any feature.
- Update the feature's status in `specs/BACKLOG.md` when its phase changes.
- One branch and one PR per feature: `feat/F-XXX-slug`.

## Non-negotiables
- Lighthouse (mobile) **100** in Performance, Accessibility, Best Practices and SEO on every public template and every locale.
- WCAG 2.2 AA minimum. No axe violations.
- No hardcoded user-facing strings: use next-intl messages or the database (es, en, de).
- Stock changes only inside DB transactions, and every change writes a `stock_movement` row. Stripe webhooks are idempotent and signature-verified.
- The repository is **public**: never commit secrets or personal data.

## Language
- Code, comments, commits and PRs: English.
- Specs and functional docs (`docs/`, `specs/`): Spanish.
- Admin panel UI: Spanish.

## Key docs
- `docs/PRD.md`: requirements
- `docs/ARCHITECTURE.md`: decisions (ADRs)
- `specs/BACKLOG.md`: features
