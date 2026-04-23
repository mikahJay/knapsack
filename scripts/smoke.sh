#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Knapsack – smoke tests (Unix/Linux/macOS)
# Hits the /health and /health/deep endpoints on the running
# stack and fails if any check returns a non-200 status or
# reports ok:false.
#
# Usage:
#   ./scripts/smoke.sh
#   API_URL=http://localhost:4000 WEB_URL=http://localhost:3000 ./scripts/smoke.sh
#
# Requires the stack to be running (docker compose up or local
# dev servers). Start it first with ./scripts/start.sh.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
FAILED=()

info()    { echo -e "\033[36m[smoke] $*\033[0m"; }
success() { echo -e "\033[32m[smoke] $*\033[0m"; }
err()     { echo -e "\033[31m[smoke] FAIL: $*\033[0m"; }

check() {
  local label="$1"
  local url="$2"
  info "Checking $label -> $url"
  local http_code body
  body=$(curl -sf --max-time 10 -w '\n%{http_code}' "$url" 2>/dev/null) || {
    err "$label unreachable"
    return 1
  }
  http_code=$(tail -n1 <<< "$body")
  body=$(head -n -1 <<< "$body")
  if [ "$http_code" -ne 200 ]; then
    err "$label returned HTTP $http_code"
    return 1
  fi
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('ok') else 1)" 2>/dev/null; then
    success "$label OK (HTTP $http_code)"
    return 0
  else
    err "$label responded ok:false"
    echo "$body"
    return 1
  fi
}

# ── API shallow health ────────────────────────────────────────
check 'API /health'       "$API_URL/health"      || FAILED+=("api/health")

# ── API deep health ───────────────────────────────────────────
check 'API /health/deep'  "$API_URL/health/deep" || FAILED+=("api/health/deep")

# ── Web shallow health ────────────────────────────────────────
check 'Web /health'       "$WEB_URL/health"      || FAILED+=("web/health")

# ── Web deep health ───────────────────────────────────────────
check 'Web /health/deep'  "$WEB_URL/health/deep" || FAILED+=("web/health/deep")

# ── Summary ───────────────────────────────────────────────────
echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  success "All smoke tests passed."
  exit 0
else
  err "Failed checks: ${FAILED[*]}"
  exit 1
fi
