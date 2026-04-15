import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';
import type { UUID } from '../types';

export interface Match {
  id: UUID;
  need_id: UUID;
  resource_id: UUID;
  score: number;
  rationale: string | null;
  strategy: string;
  matched_at: string;
  need_title: string;
  need_status: string;
  need_owner_id: UUID | null;
  resource_title: string;
  resource_status: string;
  resource_owner_id: UUID | null;
  seen_at: string | null;
}

export const matchesRouter = Router();

matchesRouter.use(requireAuth);

matchesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const needId = typeof req.query['needId'] === 'string' ? req.query['needId'] : null;
    const resourceId = typeof req.query['resourceId'] === 'string' ? req.query['resourceId'] : null;
    const unseenOnly = req.query['unseenOnly'] === 'true';

    const matches = await query<Match>(
      `SELECT
         m.id,
         m.need_id,
         m.resource_id,
         m.score::float8 AS score,
         m.rationale,
         m.strategy,
         m.matched_at,
         n.title AS need_title,
         n.status AS need_status,
         n.owner_id AS need_owner_id,
         r.title AS resource_title,
         r.status AS resource_status,
         r.owner_id AS resource_owner_id,
         mv.seen_at
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       LEFT JOIN matching.match_views mv
         ON mv.match_id = m.id AND mv.user_id = $1
       WHERE (n.owner_id = $1 OR r.owner_id = $1)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'
         AND ($2::text IS NULL OR m.need_id::text = $2)
         AND ($3::text IS NULL OR m.resource_id::text = $3)
         AND ($4::boolean = false OR mv.seen_at IS NULL)
       ORDER BY m.matched_at DESC, m.score DESC`,
      [userId, needId, resourceId, unseenOnly]
    );

    res.json(matches);
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/unseen-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       LEFT JOIN matching.match_views mv
         ON mv.match_id = m.id AND mv.user_id = $1
       WHERE (n.owner_id = $1 OR r.owner_id = $1)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'
         AND mv.seen_at IS NULL`,
      [userId]
    );
    const count = rows[0] ? Number(rows[0].count) : 0;
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/seen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const { matchIds } = req.body as { matchIds?: string[] };

    if (!Array.isArray(matchIds)) {
      return res.status(400).json({ error: 'matchIds must be an array' });
    }

    const validMatchIds = matchIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (validMatchIds.length === 0) {
      return res.json({ ok: true, marked: 0 });
    }

    const rows = await query<{ id: UUID }>(
      `SELECT m.id
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       WHERE m.id = ANY($1::uuid[])
         AND (n.owner_id = $2 OR r.owner_id = $2)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'`,
      [validMatchIds, userId]
    );

    if (rows.length === 0) {
      return res.json({ ok: true, marked: 0 });
    }

    const authorizedIds = rows.map((row) => row.id);
    await query(
      `INSERT INTO matching.match_views (user_id, match_id, seen_at)
       SELECT $1, UNNEST($2::uuid[]), NOW()
       ON CONFLICT (user_id, match_id) DO NOTHING`,
      [userId, authorizedIds]
    );

    res.json({ ok: true, marked: authorizedIds.length });
  } catch (err) {
    next(err);
  }
});