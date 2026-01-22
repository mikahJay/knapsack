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

Using remote (AWS) services
---------------------------

The web app can be started so it targets the services already deployed in AWS (ALB + ECS) instead of local service processes.

From the repo root (requires AWS CLI configured):

```bash
cd apps/web-app
npm install
# start Vite and configure the app to use the ALB found via the AWS CLI
npm run dev:aws
```

This will resolve the ALB for the current environment name (defaults to `test`) and set Vite env variables so the UI buttons point at the ALB paths for `need`, `resource`, and `auth` services.

You can also run the helper with an explicit env name:

```bash
npm run dev:aws -- --env staging
```

Or run locally (explicit):

```bash
npm run dev:local
```

The web UI exposes buttons to invoke each service endpoint and will display the HTTP status and a short body preview.
