import { partialRematch } from './matcher';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Starts the cadence loop.
 *
 * Configuration (environment variables):
 *   MATCH_CRON_INTERVAL_MS — milliseconds between runs (default: 3 600 000 / 1 h)
 *
 * The first run fires immediately at startup so there is never a full
 * interval of silence after the service (re)starts.
 */
export function startScheduler(): void {
  const intervalMs = parseInt(
    process.env['MATCH_CRON_INTERVAL_MS'] ?? String(DEFAULT_INTERVAL_MS),
    10
  );

  console.log(
    `[scheduler] Partial rematch scheduled every ${intervalMs / 1000}s`
  );

  void runAndLog(); // run immediately on start
  setInterval(() => void runAndLog(), intervalMs);
}

async function runAndLog(): Promise<void> {
  const label = new Date().toISOString();
  try {
    console.log(`[scheduler] ${label} — starting partial rematch`);
    const stats = await partialRematch();
    console.log(`[scheduler] ${label} — done: ${JSON.stringify(stats)}`);
  } catch (err) {
    console.error(`[scheduler] ${label} — partial rematch failed:`, err);
  }
}
