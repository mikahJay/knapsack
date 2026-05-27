import { defineConfig, devices } from '@playwright/test';

const slowMo = process.env.PLAYWRIGHT_SLOW_MO ? Number(process.env.PLAYWRIGHT_SLOW_MO) : 0;

// Dedicated port avoids clashing with `next dev` / Docker on :3000 during `npm run record:demo`.
const demoWebPort = process.env.PW_DEMO_WEB_PORT ?? '3330';
const demoOrigin = `http://127.0.0.1:${demoWebPort}`;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  // Pause beats add ~24–40s depending on DEMO_STEP_PAUSE_MS; keep headroom with slowMo.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: demoOrigin,
    trace: 'off',
    screenshot: 'off',
    video: 'on',
    viewport: { width: 1280, height: 900 },
    launchOptions: { slowMo },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Next.js 16 default Turbopack can silently drop part of `MatchesPage` (workflow buttons).
    // Webpack dev serves the full UI; see web/public/demo/README.md.
    command: `npx next dev -p ${demoWebPort} --webpack`,
    cwd: './web',
    url: demoOrigin,
    // Avoid reusing another dev server — it may be Turbopack (broken match UI) or wrong port.
    reuseExistingServer: process.env.PW_REUSE_WEB === '1',
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
