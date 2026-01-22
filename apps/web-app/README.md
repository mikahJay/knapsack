# web-app

Simple React prototype. Uses Vite for local development.

Quick start:

```bash
cd apps/web-app
npm install
npm run dev
```

Smoke tests
-----------

The repository includes a simple smoke test that performs an HTTP GET to `/` and expects a 200 response.

Run the dev server (in one terminal):

```bash
cd apps/web-app
npm install
npm run dev:host
```

Then in another terminal run the smoke test (uses `localhost`):

```bash
node tests/smoke/smoke.js http://localhost:5173/
```

If Vite reports a different network address, use that URL instead (e.g. `http://10.0.0.200:5173/`).
