#!/usr/bin/env sh
# Vercel build (F-002 CA-5, CA-7). A failing migration fails the deploy, so production never changes.
set -eu

# Migrations need a direct connection: PgBouncer (pooled URL) breaks advisory locks.
DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" pnpm payload migrate

# Test data only on previews (each preview has its own Neon branch).
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" pnpm seed
fi

pnpm next build
