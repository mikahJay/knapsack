# ─────────────────────────────────────────────────────────────────────────────
# Knapsack – Makefile
# ─────────────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

API_URL ?= http://localhost:4000
WEB_URL ?= http://localhost:3000
DB_URL  ?= postgres://knapsack:knapsack@localhost:5432/knapsack

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Full-solution targets:"
	@echo "  fresh-deploy   Tear down, rebuild Docker stack (non-prod, fresh DBs, bob, test data)"
	@echo "  smoke-test     Deep health checks against the running full stack"
	@echo "  test           Unit tests for all projects (no deploy needed)"
	@echo ""
	@echo "Per-project deploy:"
	@echo "  deploy-api     Rebuild + restart the api container"
	@echo "  deploy-web     Rebuild + restart the web container"
	@echo "  deploy-db      Restart the db container"
	@echo ""
	@echo "Per-project smoke tests (shallow health checks):"
	@echo "  smoke-api      Shallow health check against the API (/health)"
	@echo "  smoke-web      Shallow reachability check against the web frontend"
	@echo ""
	@echo "Per-project unit tests:"
	@echo "  test-api       Unit tests for the api project"
	@echo "  test-web       Unit tests for the web project"
	@echo ""
	@echo "Test data utilities:"
	@echo "  seed           Seed the running DB with test data"
	@echo "  seed-delete    Remove test-generated data from the running DB"
	@echo ""
	@echo "Docker utilities:"
	@echo "  down           Stop and remove containers (keep volumes)"
	@echo "  down-v         Stop and remove containers AND volumes (fresh DB)"
	@echo "  logs           Tail logs for all services"
	@echo "  logs-api       Tail logs for the api service"
	@echo "  logs-web       Tail logs for the web service"
	@echo "  ps             Show running service status"
	@echo ""

# ── Full-solution: fresh deploy ───────────────────────────────────────────────
.PHONY: fresh-deploy
fresh-deploy: down-v
	@echo ">>> Starting fresh Docker stack (non-prod)…"
	docker compose up --build -d
	@echo ">>> Waiting for API to be ready…"
	@until curl -sf $(API_URL)/health > /dev/null 2>&1; do \
	  echo "  waiting for API…"; sleep 3; \
	done
	@echo ">>> Stack is up. Seeding test data…"
	$(MAKE) seed
	@echo ""
	@echo "  API  →  $(API_URL)"
	@echo "  Web  →  $(WEB_URL)"
	@echo "  DB   →  localhost:5432"
	@echo ""

# ── Full-solution: smoke tests (deep health checks) ───────────────────────────
.PHONY: smoke-test
smoke-test:
	@echo ">>> Full-solution smoke test: API deep health check…"
	@curl -sf $(API_URL)/health/deep | python3 -m json.tool
	@echo ">>> Full-solution smoke test: web reachability check…"
	@curl -sf -o /dev/null -w "  Web HTTP %{http_code}\n" $(WEB_URL)
	@echo ">>> All smoke tests passed."

# ── Full-solution: unit tests (no deploy needed) ──────────────────────────────
.PHONY: test
test: test-api test-web

# ── Per-project deploy ────────────────────────────────────────────────────────
.PHONY: deploy-api
deploy-api:
	docker compose up --build -d api

.PHONY: deploy-web
deploy-web:
	docker compose up --build -d web

.PHONY: deploy-db
deploy-db:
	docker compose up -d db

# ── Per-project smoke tests (shallow health checks) ───────────────────────────
.PHONY: smoke-api
smoke-api:
	@echo ">>> API shallow health check…"
	@curl -sf $(API_URL)/health | python3 -m json.tool

.PHONY: smoke-web
smoke-web:
	@echo ">>> Web shallow reachability check…"
	@curl -sf -o /dev/null -w "  Web HTTP %{http_code}\n" $(WEB_URL)

# ── Per-project unit tests ────────────────────────────────────────────────────
.PHONY: test-api
test-api:
	cd api && npm test

.PHONY: test-web
test-web:
	cd web && npm test

# ── Test data ─────────────────────────────────────────────────────────────────
.PHONY: seed
seed:
	@echo ">>> Installing test-data deps (if needed)…"
	cd test-data && npm install --silent
	@echo ">>> Seeding database with test data (including bob)…"
	cd test-data && DATABASE_URL=$(DB_URL) npm run generate

.PHONY: seed-delete
seed-delete:
	cd test-data && DATABASE_URL=$(DB_URL) npm run delete

# ── Docker utilities ──────────────────────────────────────────────────────────
.PHONY: down
down:
	docker compose down

.PHONY: down-v
down-v:
	docker compose down -v

.PHONY: logs
logs:
	docker compose logs -f

.PHONY: logs-api
logs-api:
	docker compose logs -f api

.PHONY: logs-web
logs-web:
	docker compose logs -f web

.PHONY: ps
ps:
	docker compose ps
