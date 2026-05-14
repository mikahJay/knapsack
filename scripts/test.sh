#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Knapsack – run all unit test suites (Unix/Linux/macOS)
# Usage:  ./scripts/test.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=()

info()    { echo -e "\033[36m[test] $*\033[0m"; }
success() { echo -e "\033[32m[test] $*\033[0m"; }
err()     { echo -e "\033[31m[test] ERROR: $*\033[0m"; }

# ── API unit tests ────────────────────────────────────────────
info "Running API unit tests..."
if (cd "$ROOT_DIR/api" && npx jest --runInBand --no-coverage); then
  success "API tests passed."
else
  err "API tests failed."
  FAILED+=("api")
fi

# ── Web unit tests ────────────────────────────────────────────
info "Running web unit tests..."
if (cd "$ROOT_DIR/web" && npx jest --runInBand --no-coverage); then
  success "Web tests passed."
else
  err "Web tests failed."
  FAILED+=("web")
fi

# ── test-data unit tests ───────────────────────────────────────
info "Running test-data unit tests..."
if (cd "$ROOT_DIR/test-data" && npm run test); then
  success "test-data tests passed."
else
  err "test-data tests failed."
  FAILED+=("test-data")
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  success "All test suites passed."
  exit 0
else
  err "Failed suites: ${FAILED[*]}"
  exit 1
fi
