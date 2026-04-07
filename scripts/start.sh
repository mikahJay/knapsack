#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Knapsack – start script (Unix / Linux / macOS)
# Usage:
#   bash scripts/start.sh           # local dev (ts-node-dev + next dev)
#   bash scripts/start.sh --docker  # Docker Compose stack
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[start]${RESET} $*"; }
success() { echo -e "${GREEN}[start]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[start]${RESET} $*"; }
error()   { echo -e "${RED}[start] ERROR:${RESET} $*" >&2; exit 1; }

USE_DOCKER=false
for arg in "$@"; do
  [[ "$arg" == "--docker" ]] && USE_DOCKER=true
done

# ── Guard: dependencies installed ────────────────────────────
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  warn "Root node_modules missing. Running setup first…"
  bash "$ROOT_DIR/scripts/setup.sh"
fi

if [[ ! -d "$ROOT_DIR/api/node_modules" || ! -d "$ROOT_DIR/web/node_modules" ]]; then
  warn "Service node_modules missing. Running setup first…"
  bash "$ROOT_DIR/scripts/setup.sh"
fi

# ── Guard: .env exists ────────────────────────────────────────
if [[ ! -f "$ROOT_DIR/.env" ]]; then
  error ".env not found. Run 'bash scripts/setup.sh' first."
fi

# ── Start ─────────────────────────────────────────────────────
if $USE_DOCKER; then
  command -v docker >/dev/null 2>&1 || error "Docker not found. Install Docker Desktop from https://docker.com"

  echo -e "\n${BOLD}Starting Knapsack via Docker Compose…${RESET}\n"
  info "API  →  http://localhost:4000"
  info "Web  →  http://localhost:3000"
  info "DB   →  localhost:5432"
  echo ""
  cd "$ROOT_DIR"
  docker compose up --build
else
  command -v node >/dev/null 2>&1 || error "Node.js not found. Install it from https://nodejs.org"

  echo -e "\n${BOLD}Starting Knapsack in local dev mode…${RESET}\n"
  info "API  →  http://localhost:4000  (ts-node-dev, hot-reload)"
  info "Web  →  http://localhost:3000  (Next.js dev server)"
  warn "Requires a running Postgres instance on localhost:5432."
  warn "If you don't have one, use:  bash scripts/start.sh --docker"
  echo ""
  cd "$ROOT_DIR"
  # Load .env so env vars are available to the root npm process
  set -o allexport; source "$ROOT_DIR/.env"; set +o allexport
  exec npm run dev
fi
