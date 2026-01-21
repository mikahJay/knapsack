# Tests

Smoke test to verify the web-app root is reachable.

Run the smoke test:

```powershell
# from repo root
node tests/smoke/smoke.js             # defaults to http://localhost:5173/
node tests/smoke/smoke.js http://localhost:5174/   # specify a different URL
```

Exit codes:
- `0` success (HTTP 200)
- non-zero failure
