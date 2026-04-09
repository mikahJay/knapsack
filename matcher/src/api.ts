import express, { Request, Response } from 'express';
import { fullRematch, partialRematch } from './matcher';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  // ── POST /rematch/full ────────────────────────────────────
  // Re-match all open needs against all available resources.
  app.post('/rematch/full', async (_req: Request, res: Response) => {
    try {
      const stats = await fullRematch();
      res.json({ ok: true, ...stats });
    } catch (err) {
      console.error('[api] fullRematch error:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── POST /rematch/partial ─────────────────────────────────
  // Match needs/resources created or updated since `since`.
  // Body (optional): { "since": "<ISO 8601 timestamp>" }
  // Defaults to now − 24 h when `since` is omitted.
  app.post('/rematch/partial', async (req: Request, res: Response) => {
    try {
      let since: Date | undefined;

      if (req.body?.since !== undefined) {
        since = new Date(req.body.since as string);
        if (isNaN(since.getTime())) {
          res
            .status(400)
            .json({ ok: false, error: '`since` must be a valid ISO 8601 timestamp' });
          return;
        }
      }

      const stats = await partialRematch(since);
      res.json({ ok: true, ...stats });
    } catch (err) {
      console.error('[api] partialRematch error:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── GET /health ───────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
