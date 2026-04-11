# Knapsack — Web

Next.js front-end for the Knapsack resource allocation platform.

- **Port:** 3000
- **Framework:** Next.js (Pages Router)
- **Styling:** Tailwind CSS
- **API:** Communicates with the Knapsack API on port 4000

---

## Tech Stack

| Package | Purpose |
|---|---|
| Next.js | React framework with SSR and file-based routing |
| React 18 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |

---

## Development

### Install dependencies

```bash
# From this directory:
npm install

# Or from the repository root (equivalent):
npm install --prefix web
```

### Start the dev server

```bash
# From this directory:
npm run dev

# Or from the repository root:
npm run dev:web
```

The dev server runs on http://localhost:3000 with fast-refresh enabled.

> The API must also be running on port 4000. Start both together from the root with `npm run dev`, or use the Docker stack (`npm run docker:up`).

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000` | API base URL used by the **browser** |
| `API_URL` | No | `http://localhost:4000` | API base URL used **server-side** (e.g. in `getServerSideProps`, or container-to-container as `http://api:4000`) |
| `NEXT_PUBLIC_IS_PROD` | No | `false` | Set `true` in production to show the Google OAuth login button instead of the bypass login |

> Variables prefixed `NEXT_PUBLIC_` are inlined into the client-side bundle at build time and are visible to the browser.

---

## Pages

| Route | File | Auth required | Description |
|---|---|---|---|
| `/` | `pages/index.tsx` | Yes | Dashboard with navigation links to Needs and Resources |
| `/login` | `pages/login.tsx` | No | Login page — bypass button (dev) or Google OAuth (prod) |
| `/needs` | `pages/needs/index.tsx` | Yes | List all needs |
| `/needs/new` | `pages/needs/new.tsx` | Yes | Create a new need |

Unauthenticated users are redirected to `/login`.

---

## API Integration

All API calls go through `src/lib/api.ts`. Key behaviours:

- **Base URL** is read from `NEXT_PUBLIC_API_URL` in the browser, and from `API_URL` on the server (allows container-to-container routing in Docker where the internal URL is `http://api:4000`).
- Every request includes `credentials: 'include'` to forward the session cookie automatically.
- Non-2xx responses throw an `Error` with the JSON `error` field as the message.

---

## Building

```bash
# Production build
npm run build

# Serve the production build locally
npm run start
```

---

## Docker

The `Dockerfile` defines three stages:

| Stage | Used by | Description |
|---|---|---|
| `base` | Build dependency | Installs npm dependencies |
| `dev` | Local Docker experimentation | Runs `next dev` |
| `production` | Prod deploys | Compiled `.next` output, no dev dependencies |

The repository Docker Compose stack uses the `production` stage in non-prod mode for
runtime stability on Windows/Docker Desktop. Use local dev scripts when you need fast refresh.

Build the production image directly:

```bash
docker build --target production -t knapsack-web .
```
