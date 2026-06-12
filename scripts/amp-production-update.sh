#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "==> Installing root dependencies"
bun install

echo "==> Installing schema dependencies"
bun install --cwd packages/schema

echo "==> Installing server dependencies"
bun install --cwd apps/server

echo "==> Installing web dependencies"
bun install --cwd apps/web

echo "==> Running database migrations"
bunx --cwd apps/server drizzle-kit migrate

echo "==> Building web frontend"
bun run --cwd apps/web build

echo "==> Production update complete"
