# Web App Tests

Smoke test for the `web-app` project.

Run the smoke test from the repository root or from `apps/web-app`:

```powershell
# from repo root
node apps/web-app/tests/smoke/smoke.js

# or specify a URL
node apps/web-app/tests/smoke/smoke.js http://localhost:5174/
```

Exit codes:
- `0` success (HTTP 200)
- non-zero failure
