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

Testing
-------

Unit and component tests use Vitest with Testing Library. To run them locally:

1. Install dependencies (from repo root or `apps/web-app`):

```bash
cd apps/web-app
npm install
```

2. Run all tests once:

```bash
npm test
```

3. Run tests in watch mode during development:

```bash
npm run test:watch
```

The first test included checks that the `NavBar` renders the `Home`, `About`, and `Login` items. Tests live under `apps/web-app/tests`.

Coverage
--------

To run tests with coverage and generate an HTML report:

```bash
cd apps/web-app
npm run test:coverage
```

The coverage report will be written to the `coverage` folder (open `coverage/index.html` in a browser).

Troubleshooting
---------------

If `npm run test:coverage` prompts to install `@vitest/coverage-v8` and the install fails with a peer-dependency error, you have two simple options:

- Upgrade Vitest and install the matching coverage provider (recommended if you're happy to use the latest Vitest):

```bash
cd apps/web-app
npm install -D vitest@latest @vitest/coverage-v8@latest
```

- Or install the coverage package while relaxing peer-deps (quick workaround):

```bash
cd apps/web-app
npm install -D @vitest/coverage-v8 --legacy-peer-deps
```

After either step, re-run:

```bash
npm run test:coverage
```

If you prefer I can upgrade `vitest` in `package.json` to the latest major and install the matching coverage provider for you — tell me and I'll update the repo and run a local coverage run.
