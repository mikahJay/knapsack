# Knapsack — API

Express + TypeScript REST API for the Knapsack resource allocation platform.

- **Port:** 4000
- **Runtime:** Node.js 20, TypeScript
- **Database:** PostgreSQL 16 (schemas: `auth`, `need`, `resource`)
- **Auth:** Google OAuth 2.0 (production) / local bypass user (dev)
- **Session store:** Postgres-backed via `connect-pg-simple`

---

## Tech Stack

| Package | Purpose |
|---|---|
| Express | HTTP framework |
| TypeScript + ts-node-dev | Language + dev hot-reload |
| Passport + passport-google-oauth20 | Authentication strategies |
| express-session + connect-pg-simple | Cookie sessions stored in Postgres |
| pg | PostgreSQL client |
| dotenv | Environment variable loading |
| Jest + Supertest | Testing |

---

## Development

### Install dependencies

```bash
# From this directory:
npm install

# Or from the repository root (equivalent):
npm install --prefix api
```

### Start the dev server

```bash
# From this directory:
npm run dev

# Or from the repository root:
npm run dev:api
```

The server starts with `ts-node-dev` and hot-reloads on every source file change.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `IS_PROD` | No | `false` | Set `true` to enable Google OAuth and `Secure` cookies |
| `PORT` | No | `4000` | Port the HTTP server binds to |
| `DATABASE_URL` | No | `postgres://knapsack:knapsack@localhost:5432/knapsack` | Postgres connection string |
| `SESSION_SECRET` | No | `local-dev-secret` | Secret used to sign session cookies — **change in production** |
| `GOOGLE_CLIENT_ID` | Prod only | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Prod only | — | Google OAuth client secret |
| `WEB_URL` | No | `http://localhost:3000` | Origin of the web frontend (CORS `origin` + OAuth redirect base) |

Copy `.env.example` from the repository root to `.env` and fill in any required values.

---

## API Endpoints

All `/api/*` routes require an active authenticated session; unauthenticated requests receive `401`.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Returns `{ ok: true, isProd: boolean }` |

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/me` | No | Returns the current user object, or `401` |
| `POST` | `/auth/login` | No | **Dev only** (`IS_PROD=false`) — logs in as the bypass user `bob@local.dev` |
| `GET` | `/auth/google` | No | **Prod only** — initiates the Google OAuth 2.0 flow |
| `GET` | `/auth/google/callback` | No | **Prod only** — Google OAuth callback URL |
| `POST` | `/auth/logout` | Yes | Destroys the current session |

### Needs — `/api/needs`

All routes require authentication.

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/api/needs` | — | List all needs, newest first |
| `GET` | `/api/needs/:id` | — | Get a single need by UUID |
| `POST` | `/api/needs` | `{ title, description? }` | Create a need owned by the current user |
| `PUT` | `/api/needs/:id` | `{ title?, description?, status? }` | Update a need |
| `DELETE` | `/api/needs/:id` | — | Delete a need |

**Need statuses:** `open` · `fulfilled` · `closed`

### Resources — `/api/resources`

All routes require authentication.

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/api/resources` | — | List all resources, newest first |
| `GET` | `/api/resources/:id` | — | Get a single resource by UUID |
| `POST` | `/api/resources` | `{ title, description? }` | Create a resource owned by the current user |
| `PUT` | `/api/resources/:id` | `{ title?, description?, status? }` | Update a resource |
| `DELETE` | `/api/resources/:id` | — | Delete a resource |

**Resource statuses:** `available` · `allocated` · `retired`

---

## Authentication

### Local / dev bypass (`IS_PROD=false`)

`POST /auth/login` upserts and logs in a fixed user (`bob@local.dev`, provider `local`). No credentials or OAuth setup required. This lets you develop and test the API immediately after running setup.

### Google OAuth (`IS_PROD=true`)

Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Set these up in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Create a project (or use an existing one).
2. Enable the **Google+ API** or **Google Identity** API.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Add an authorised redirect URI:
   ```
   https://<your-api-host>/auth/google/callback
   ```
5. Copy the client ID and secret into `.env`.

---

## Database

Migrations live in `src/db/migrations/` and are applied automatically when the Postgres Docker container initialises for the first time (via the `docker-entrypoint-initdb.d` volume mount). Running locally without Docker, apply them manually:

```bash
psql "$DATABASE_URL" -f src/db/migrations/001_init_schemas.sql
```

### Schemas

| Schema | Tables | Description |
|---|---|---|
| `auth` | `users`, `sessions` | User accounts and Postgres-backed session storage |
| `need` | `needs` | Allocation needs with status lifecycle |
| `resource` | `resources` | Available resources with status lifecycle |

All tables carry `created_at` and `updated_at` timestamps. `updated_at` is maintained automatically by a Postgres trigger.

---

## Testing

Tests use Jest + Supertest. The `pg` pool and `connect-pg-simple` store are mocked, so no running database is needed.

```bash
# From this directory:
npm run test

# From the repository root:
npm run test --prefix api
```

Test file: `src/api.test.ts`

---

## Docker

The `Dockerfile` defines three stages:

| Stage | Used by | Description |
|---|---|---|
| `base` | Build dependency | Installs npm dependencies |
| `dev` | `docker compose up` | Runs `ts-node-dev` with source mounted as a volume |
| `production` | Prod deploys | Compiled JS only, no dev dependencies |

Build the production image directly:

```bash
docker build --target production -t knapsack-api .
```
