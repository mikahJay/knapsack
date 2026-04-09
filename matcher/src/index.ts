import 'dotenv/config';
import { registerStrategy } from './strategies/registry';
import { ClaudeMatchingStrategy } from './strategies/claude';

// ── Register all available strategies ────────────────────────
// Add new strategies here; the active one is chosen by MATCHING_STRATEGY.
registerStrategy(new ClaudeMatchingStrategy());

// ── Mode selection ────────────────────────────────────────────
// MATCHER_MODE controls which interfaces are started:
//   api+scheduler  (default) — HTTP API + scheduled cadence loop
//   api            — HTTP API only (no scheduled loop)
//   mcp            — MCP stdio server (for AI tool use; no HTTP)
const MODE = process.env['MATCHER_MODE'] ?? 'api+scheduler';
const PORT = parseInt(process.env['PORT'] ?? '5000', 10);

import { createApp } from './api';
import { startScheduler } from './scheduler';

async function main(): Promise<void> {
  if (MODE === 'mcp') {
    const { startMcpServer } = await import('./mcp');
    await startMcpServer();
    return;
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[matcher] API listening on :${PORT} (mode: ${MODE})`);
  });

  if (MODE === 'api+scheduler') {
    startScheduler();
  }
}

main().catch((err) => {
  console.error('[index] Startup error:', err);
  process.exit(1);
});
