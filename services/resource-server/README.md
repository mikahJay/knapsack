# resource-server

REST API scaffold to manage `resources` (in-memory for local).

Quick start:

```bash
cd services/resource-server
npm install
npm start
```

Running tests
-------------

Unit tests use `vitest` and `supertest`. Tests mock the Postgres `pg` client, so they run quickly without a database.

```bash
cd services/resource-server
npm install
npm test
```

Test coverage
-------------

You can run tests with coverage using `vitest`'s coverage flag (uses c8/istanbul under the hood):

```bash
cd services/resource-server
npx vitest --coverage
```

Notes
-----
- The Express app is exported from `src/index.js` so tests can import it without starting the HTTP server.
- Tests live in `services/resource-server/tests` and use `vi.mock('pg', ...)` to stub DB calls.

