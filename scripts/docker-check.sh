#!/bin/sh
# Runs install, type-check, tests and a production build inside a throwaway
# Node container. Useful when you don't want Node installed locally:
#   docker run --rm -v "$PWD":/app -w /app --env-file .env node:22-bookworm-slim sh scripts/docker-check.sh
set -e
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund
npx tsc --noEmit
npx vitest run
npx next build
