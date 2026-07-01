#!/usr/bin/env bash
# PlanT 發布前檢查：lint → typecheck → test → build →（可選）DB migrate → push GitHub
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMIT_MSG="${1:-chore: sync PlanT release}"
SKIP_DB="${SKIP_DB:-0}"
SKIP_PUSH="${SKIP_PUSH:-0}"

echo "━━ PlanT publish ━━"

echo "→ npm run lint"
npm run lint

echo "→ npm run typecheck"
npm run typecheck

echo "→ npm run test"
npm run test

echo "→ npm run build"
npm run build

if [[ "$SKIP_DB" != "1" ]]; then
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "→ npm run db:generate"
    npm run db:generate
    echo "→ npm run db:migrate:deploy"
    npm run db:migrate:deploy
  else
    echo "⚠ DATABASE_URL 未設定，略過 db:migrate:deploy（可設 SKIP_DB=0 並在 .env 填 DATABASE_URL）"
  fi
else
  echo "→ SKIP_DB=1，略過資料庫"
fi

if [[ "$SKIP_PUSH" != "1" ]]; then
  echo "→ npm run push:github"
  npm run push:github "$COMMIT_MSG"
else
  echo "→ SKIP_PUSH=1，略過 GitHub"
fi

echo "✓ Publish 完成"
