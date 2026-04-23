#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Knapsack – setup script (Unix / Linux / macOS)
# Usage: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[setup]${RESET} $*"; }
success() { echo -e "${GREEN}[setup]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[setup]${RESET} $*"; }
error()   { echo -e "${RED}[setup] ERROR:${RESET} $*" >&2; exit 1; }

echo -e "\n${BOLD}Knapsack – local dev setup${RESET}\n"

# ── Check prerequisites ───────────────────────────────────────
info "Checking prerequisites…"

command -v node  >/dev/null 2>&1 || error "Node.js not found. Install it from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm not found. It should ship with Node.js."
command -v docker>/dev/null 2>&1 || warn  "Docker not found – needed only for 'npm run docker:*' scripts."

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
NPM_VER=$(npm --version)
success "Node ${NODE_VER}  /  npm ${NPM_VER}"

# ── Install dependencies ──────────────────────────────────────
info "Installing root dependencies…"
npm install --prefix "$ROOT_DIR" --silent

info "Installing API dependencies…"
npm install --prefix "$ROOT_DIR/api" --silent

info "Installing web dependencies…"
npm install --prefix "$ROOT_DIR/web" --silent

info "Installing matcher dependencies…"
npm install --prefix "$ROOT_DIR/matcher" --silent

success "All dependencies installed."

# ── Environment file ──────────────────────────────────────────
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  warn ".env already exists – skipped."
else
  if [[ -f "$ENV_EXAMPLE" ]]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    success ".env created from .env.example"
    echo -e "  ${YELLOW}→ Open .env and fill in any required values before starting.${RESET}"
  else
    warn ".env.example not found – skipping .env creation."
  fi
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Setup complete. Next steps:${RESET}"
echo -e "  Local dev :  ${CYAN}bash scripts/start.sh${RESET}"
echo -e "  Docker    :  ${CYAN}bash scripts/start.sh --docker${RESET}"
echo ""
