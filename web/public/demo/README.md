# Product demo assets

- **`knapsack-product-demo-en.vtt`** — Step subtitles (WebVTT). Shipped with the app; tweak cue times after each re-record.
- **`knapsack-product-demo.webm`** — Walkthrough recording; run `npm run record:demo` from the repo root to (re)generate.

## Record the demo locally

Before recording, **stop any other `next dev`** for this repo’s `web/` folder. Next 16 allows only one dev server per project directory (otherwise you’ll see “Another next dev server is already running”).

**Turbopack vs webpack:** Plain `next dev` (Turbopack in Next 16) has been observed to render `pages/matches/index` **without** the workflow action buttons. The recorder therefore starts **`next dev --webpack`** on **port 3330** (`PW_DEMO_WEB_PORT` to override) so it does not fight with whatever you run on :3000. Only set `PW_REUSE_WEB=1` when the server you’re reusing is webpack-based and shows the Clarify/Reject/etc. buttons on Matches.

From the **repository root**:

```bash
npx playwright install chromium
npm install
npm run record:demo
```

This starts the Next dev server if needed, runs a scripted UI path with **all API responses mocked** (no database or Anthropic key), captures video, then copies the newest WebM to `web/public/demo/knapsack-product-demo.webm`.

Tune pacing with slow motion:

```bash
PLAYWRIGHT_SLOW_MO=120 npm run record:demo
```

After recording, scrub `knapsack-product-demo-en.vtt` timestamps so captions line up with the new file.
