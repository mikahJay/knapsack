# Knapsack

Knapsack is a resource allocation platform. It helps teams track **needs** (things required) and **resources** (things available) and match them together.

The monorepo contains:

| Directory | Description |
|---|---|
| `api/` | Node.js / Express REST API backed by PostgreSQL |
| `web/` | Next.js web front-end |
| `matcher/` | Matching service (scheduled + API) |
| `test-data/` | DB seed/cleanup scripts + small CLI unit tests |
| `scripts/` | Setup and start scripts for every platform |

---

## Prerequisites

### Required for all modes

| Dependency | Minimum version | Download |
|---|---|---|
| **Node.js** | 20 LTS | https://nodejs.org |
| **npm** | 10 (ships with Node 20) | — |

### Required for Docker mode

| Dependency | Notes | Download |
|---|---|---|
| **Docker Desktop** | Includes Docker Engine + Compose v2 | https://www.docker.com/products/docker-desktop |

> **Linux:** install [Docker Engine](https://docs.docker.com/engine/install/) and the [Compose plugin](https://docs.docker.com/compose/install/) separately instead of Docker Desktop.

### Windows only

| Dependency | Notes |
|---|---|
| **PowerShell 5.1+** | Included in Windows 10/11. Upgrade to [PowerShell 7](https://aka.ms/powershell) for the best experience. |

If you see an execution policy error when running `.ps1` scripts, run this once in an elevated PowerShell window:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Quick Start

### Option A — Docker (recommended, no local Postgres needed)

This stack runs stable built application processes in non-prod mode. For hot reload,
use local dev mode instead of Docker.

If the shell scripts are not executable yet, run this once:

```bash
chmod +x scripts/setup.sh scripts/start.sh
```

```bash
# Unix / macOS / Linux
bash scripts/setup.sh
bash scripts/start.sh --docker

# Windows (PowerShell)
.\scripts\setup.ps1
.\scripts\start.ps1 -Docker
```

### Option B — Local dev (Node.js + external Postgres)

Requires a running Postgres 14+ instance on `localhost:5432`.

```bash
# Unix / macOS / Linux
bash scripts/setup.sh
bash scripts/start.sh

# Windows (PowerShell)
.\scripts\setup.ps1
.\scripts\start.ps1
```

After startup:

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Postgres | localhost:5432 |

---

## Setup

The setup scripts (above) do everything automatically. To run the steps manually:

On Linux or macOS, you can make the setup and start scripts directly executable with:

```bash
chmod +x scripts/setup.sh scripts/start.sh
```

```bash
# 1. Install dependencies
npm install                  # root (installs concurrently + other root dev tools)
npm install --prefix api     # identical to: cd api && npm install
npm install --prefix web     # identical to: cd web && npm install

# 2. Create your .env
cp .env.example .env         # Windows (PowerShell): Copy-Item .env.example .env
# then open .env and fill in any required values
```

> **Note:** each service (`api/`, `web/`) manages its own `node_modules` and must be installed separately. Running `npm install` at the root does **not** cascade into the service directories.

See [`.env.example`](.env.example) for all available variables.

---

## Running

### Root npm scripts — local dev

| Script | Description |
|---|---|
| `npm run dev` | Start API + web concurrently with labelled output |
| `npm run dev:api` | API only (`ts-node-dev` hot-reload) |
| `npm run dev:web` | Web only (`next dev`) |
| `npm run build` | Production build for both services |

### Root npm scripts — Docker

| Script | Description |
|---|---|
| `npm run docker:up` | `docker compose up --build` (foreground) |
| `npm run docker:up:detached` | Same, detached |
| `npm run docker:down` | Stop containers |
| `npm run docker:down:volumes` | Stop containers and wipe the Postgres volume |
| `npm run docker:logs` | Tail all container logs |
| `npm run docker:logs:api` | Tail API logs only |
| `npm run docker:logs:web` | Tail web logs only |
| `npm run docker:ps` | Show running container status |
| `npm run docker:analytics` | Start stack with the analytics profile |

The Docker stack keeps `IS_PROD=false` but runs built runtime images rather than
watcher-based dev servers. This is more stable on Windows hosts using Docker Desktop.

---

## Testing

```bash
npm run test               # run all configured unit tests (api + web + test-data)
npm run test:api           # API tests only
npm run test:web           # web tests only
npm run test:test-data     # test-data unit tests only
```

From the repo root you can also run **`scripts/test.ps1`** (Windows) or **`scripts/test.sh`** (Unix) — same three suites as `npm run test`.

API tests use Jest + Supertest. The database layer is fully mocked — no running Postgres instance required.
Web tests use Jest + Testing Library with mocked API calls and Next.js router/link shims.
Test-data tests use Node's built-in test runner with ts-node.

### Product demo video (Playwright)

To record an on-product walk-through for the landing page (`web/public/demo/`), plus how to publish it via GitHub, see **`web/public/demo/README.md`** and **`npm run record:demo`** from the repo root.

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `IS_PROD` | `false` | Set `true` in production to enable Google OAuth and secure cookies |
| `DATABASE_URL` | `postgres://knapsack:knapsack@localhost:5432/knapsack` | Postgres connection string |
| `SESSION_SECRET` | `local-dev-secret` | Secret used to sign session cookies — **change in production** |
| `GOOGLE_CLIENT_ID` | — | Required when `IS_PROD=true` |
| `GOOGLE_CLIENT_SECRET` | — | Required when `IS_PROD=true` |
| `WEB_URL` | `http://localhost:3000` | Origin of the web frontend (CORS + OAuth redirect base) |

---

## Project Structure

```
knapsack/
├── api/               # Express REST API       → see api/README.md
├── web/               # Next.js front-end      → see web/README.md
├── matcher/           # Matching service
├── test-data/         # Seed scripts           → see test-data/README.md
├── scripts/           # setup.sh / setup.ps1 / start.sh / start.ps1
├── docker-compose.yml
├── .env.example
└── package.json       # root scripts (dev, test, docker:*)
```

---

## Services

- **[API](api/README.md)** — Express + TypeScript REST API on port 4000. Handles authentication, needs, and resources.
- **[Web](web/README.md)** — Next.js front-end on port 3000. Consumes the API.

