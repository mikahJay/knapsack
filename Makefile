
.PHONY: run-need run-resource run-matcher run-auth run-web quick run-all

# Start need-server (default port 4020)
run-need:
	cd services/need-server && npm run start

# Start resource-server (default port 4010)
run-resource:
	cd services/resource-server && npm run start

# Start matcher (default port 4030)
run-matcher:
	cd services/matcher && npm run start

# Start auth-server (default port 4001)
run-auth:
	cd services/auth-server && npm run start

# Start web app (Vite, default port 5173)
run-web:
	cd apps/web-app && npm run dev

# Run everything (starts each service in background; Unix/macOS/Linux style)
quick:
	@echo "Starting all services in background (use Ctrl-C to stop)."
	@npm --prefix services/need-server run start & \
	npm --prefix services/resource-server run start & \
	npm --prefix services/matcher run start & \
	npm --prefix services/auth-server run start & \
	npm --prefix apps/web-app run dev & \
	wait

run-all: quick
