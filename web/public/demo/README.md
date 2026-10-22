# Product demo assets

- **`knapsack-product-demo-en.vtt`** — Step subtitles (WebVTT). Shipped with the app; tweak cue times after each re-record.
- **`knapsack-product-demo.webm`** — Walkthrough recording; run `npm run record:demo` from the repo root to (re)generate.

## Record the demo locally

**Node.js:** `npm run record:demo` must start Next.js&nbsp;16’s dev server, so **Node 20.9+** is required. If you’re on Node 18, the script will exit with instructions (`scripts/assert-node-record-demo.mjs`).

Before recording, **stop any other `next dev`** for this repo’s `web/` folder. Next 16 allows only one dev server per project directory (otherwise you’ll see “Another next dev server is already running”).

**Turbopack vs webpack:** Plain `next dev` (Turbopack in Next 16) has been observed to render `pages/matches/index` **without** the workflow action buttons. The recorder therefore starts **`next dev --webpack`** on **port 3330** (`PW_DEMO_WEB_PORT` to override) so it does not fight with whatever you run on :3000. Only set `PW_REUSE_WEB=1` when the server you’re reusing is webpack-based and shows the Clarify/Reject/etc. buttons on Matches.

From the **repository root**:

```bash
npx playwright install chromium
npm install
npm run record:demo
```

This starts the Next dev server if needed, runs a scripted UI path with **all API responses mocked** (no database or Anthropic key), captures video, then copies the newest WebM to `web/public/demo/knapsack-product-demo.webm`.

**Pause between actions** (helps viewers follow the demo; default **2 seconds**):

```bash
# default DEMO_STEP_PAUSE_MS=2000
npm run record:demo

DEMO_STEP_PAUSE_MS=2500 npm run record:demo
```

This adds dwell time **after each major step**, not keystroke latency. Optionally combine with Playwright mouse/keyboard slowdown:

```bash
PLAYWRIGHT_SLOW_MO=120 DEMO_STEP_PAUSE_MS=2000 npm run record:demo
```

After recording, adjust `knapsack-product-demo-en.vtt` cue times—the longer runtime usually needs later subtitle offsets.

---

## Showing the demo on GitHub

What works reliably:

| Approach | Use when |
|----------|----------|
| **Commit the WebM (+ `.vtt`)** in `web/public/demo/` | You want a single canonical URL tied to releases/tags. Open the file in the GitHub UI—GitHub will play `.webm` / `.mp4` in-browser for many repos. Prefer **≤ ~50–100 MB**; larger files strain clones—use **[Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)** for the asset. |
| **GitHub Releases** attachment | Larger or optional assets: upload `knapsack-product-demo.webm` (and captions) per release—stable URLs, no checkout bloat. Link from README. |
| **README link** | Add a Markdown link to the blob path (`web/public/demo/knapsack-product-demo.webm`) or to a **Release** asset. Markdown video embeds (`<video>`) are sanitized by GitHub; a plain link to the file or release is safest. |

What does **not** work by itself:

- Raw `localhost` URLs for your machine.
- Embedding the bundled app unless you publish it (**GitHub Pages**, Vercel, etc.). The files in `public/demo/` ship with Next and are reachable at `/demo/knapsack-product-demo.webm` on any deployed **`web`** build.
