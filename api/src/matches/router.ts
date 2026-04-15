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
}

export const matchesRouter = Router();

matchesRouter.use(requireAuth);

matchesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const needId = typeof req.query['needId'] === 'string' ? req.query['needId'] : null;
    const resourceId = typeof req.query['resourceId'] === 'string' ? req.query['resourceId'] : null;

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
         r.owner_id AS resource_owner_id
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       WHERE (n.owner_id = $1 OR r.owner_id = $1)
         AND n.status = 'open'
         AND r.status = 'available'
         AND ($2::text IS NULL OR m.need_id::text = $2)
         AND ($3::text IS NULL OR m.resource_id::text = $3)
       ORDER BY m.matched_at DESC, m.score DESC`,
      [userId, needId, resourceId]
    );

    res.json(matches);
  } catch (err) {
    next(err);
  }
});