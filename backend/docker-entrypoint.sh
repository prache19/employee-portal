#!/bin/sh
set -e

DB_DIR=$(dirname "${DATABASE_URL#file:}")
mkdir -p "$DB_DIR"
SENTINEL="$DB_DIR/.seeded"

echo "[entrypoint] Applying Prisma schema to $DATABASE_URL"
npx prisma db push --skip-generate

if [ ! -f "$SENTINEL" ]; then
  echo "[entrypoint] First boot detected — running seed"
  if npx tsx prisma/seed.ts; then
    touch "$SENTINEL"
  else
    echo "[entrypoint] Seed failed; will retry on next start"
    exit 1
  fi
else
  echo "[entrypoint] Seed already applied — skipping"
fi

exec "$@"
