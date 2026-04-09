import { Router, Request, Response } from 'express';
import { requireAdmin } from '../auth/router';

const MATCHER_URL =
  process.env['MATCHER_URL'] ?? 'http://localhost:5000';

export const adminRouter = Router();

// All admin routes require admin role
adminRouter.use(requireAdmin);

// ── POST /admin/rematch/full ──────────────────────────────────
adminRouter.post('/rematch/full', async (_req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${MATCHER_URL}/rematch/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await upstream.json();
    res.status(upstream.status).json(body);
  } catch (err) {
    res.status(502).json({ ok: false, error: `Matcher unreachable: ${String(err)}` });
  }
});

// ── POST /admin/rematch/partial ───────────────────────────────
// Optional body: { "since": "<ISO 8601 timestamp>" }
adminRouter.post('/rematch/partial', async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${MATCHER_URL}/rematch/partial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    });
    const body = await upstream.json();
    res.status(upstream.status).json(body);
  } catch (err) {
    res.status(502).json({ ok: false, error: `Matcher unreachable: ${String(err)}` });
  }
});
