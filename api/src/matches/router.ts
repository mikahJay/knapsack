import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';
import type { UUID } from '../types';
import { reconcilePairStatus, type PairStatus } from './pairStatus';

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
  pair_status: PairStatus;
  my_action: MatchActionType | null;
  my_action_details: string | null;
  my_action_updated_at: string | null;
  counterpart_action: MatchActionType | null;
  counterpart_action_details: string | null;
  counterpart_action_updated_at: string | null;
}

export type MatchActionType = 'rejected' | 'clarify' | 'soft_yes' | 'snoozed' | 'flagged';

export interface MatchMessage {
  id: UUID;
  user_id: UUID;
  body: string;
  created_at: string;
}

interface MatchActionBody {
  action?: string;
  details?: string;
}

interface MatchMessageBody {
  body?: string;
}

const MATCH_ACTIONS: MatchActionType[] = ['rejected', 'clarify', 'soft_yes', 'snoozed', 'flagged'];

const ACTIVE_MATCH_FILTER = `AND m.pair_status NOT LIKE 'closed_%'`;

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
         mv.seen_at,
         m.pair_status,
         ma.action AS my_action,
         ma.details AS my_action_details,
         ma.updated_at AS my_action_updated_at,
         CASE
           WHEN cp.action IN ('soft_yes', 'clarify', 'snoozed')
           THEN cp.action::text
           ELSE NULL
         END AS counterpart_action,
         CASE
           WHEN cp.action IN ('soft_yes', 'clarify', 'snoozed')
           THEN cp.details
           ELSE NULL
         END AS counterpart_action_details,
         CASE
           WHEN cp.action IN ('soft_yes', 'clarify', 'snoozed')
           THEN cp.updated_at
           ELSE NULL
         END AS counterpart_action_updated_at
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       LEFT JOIN matching.match_views mv
         ON mv.match_id = m.id AND mv.user_id = $1
       LEFT JOIN matching.match_actions ma
         ON ma.match_id = m.id AND ma.user_id = $1
       LEFT JOIN LATERAL (
         SELECT ma_c.action, ma_c.details, ma_c.updated_at
         FROM matching.match_actions ma_c
         WHERE ma_c.match_id = m.id
           AND ma_c.user_id = CASE
             WHEN n.owner_id = $1 THEN r.owner_id
             ELSE n.owner_id
           END
         LIMIT 1
       ) cp ON TRUE
       WHERE (n.owner_id = $1 OR r.owner_id = $1)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'
         ${ACTIVE_MATCH_FILTER}
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
         ${ACTIVE_MATCH_FILTER}
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
         AND r.status = 'available'
         ${ACTIVE_MATCH_FILTER}`,
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

matchesRouter.get('/:matchId/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const matchId = String(req.params['matchId'] ?? '').trim();
    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }

    const rows = await query<{ id: UUID }>(
      `SELECT m.id
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       WHERE m.id::text = $1
         AND (n.owner_id = $2 OR r.owner_id = $2)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'
         ${ACTIVE_MATCH_FILTER}
       LIMIT 1`,
      [matchId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or not accessible' });
    }

    const messages = await query<MatchMessage>(
      `SELECT id, user_id, body, created_at
       FROM matching.match_messages
       WHERE match_id = $1::uuid
       ORDER BY created_at ASC`,
      [rows[0]!.id]
    );

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/:matchId/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const matchId = String(req.params['matchId'] ?? '').trim();
    const body = req.body as MatchMessageBody;
    const text = typeof body?.body === 'string' ? body.body.trim() : '';

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }
    if (text.length === 0) {
      return res.status(400).json({ error: 'body is required' });
    }
    if (text.length > 8000) {
      return res.status(400).json({ error: 'body must be 8000 characters or fewer' });
    }

    const rows = await query<{ id: UUID }>(
      `SELECT m.id
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       WHERE m.id::text = $1
         AND (n.owner_id = $2 OR r.owner_id = $2)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'
         ${ACTIVE_MATCH_FILTER}
       LIMIT 1`,
      [matchId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or not accessible' });
    }

    const inserted = await query<MatchMessage>(
      `INSERT INTO matching.match_messages (match_id, user_id, body)
       VALUES ($1::uuid, $2, $3)
       RETURNING id, user_id, body, created_at`,
      [rows[0]!.id, userId, text]
    );

    res.status(201).json(inserted[0]);
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/:matchId/actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const matchId = String(req.params['matchId'] ?? '').trim();
    const body = req.body as MatchActionBody;
    const action = body?.action;
    const details = typeof body?.details === 'string' ? body.details.trim() : '';

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }
    if (!action || !MATCH_ACTIONS.includes(action as MatchActionType)) {
      return res.status(400).json({ error: 'action must be one of: rejected, clarify, soft_yes, snoozed, flagged' });
    }
    if (details.length > 1000) {
      return res.status(400).json({ error: 'details must be 1000 characters or fewer' });
    }

    const accessRows = await query<{
      id: UUID;
      pair_status: PairStatus;
      need_owner_id: UUID | null;
      resource_owner_id: UUID | null;
    }>(
      `SELECT m.id, m.pair_status, n.owner_id AS need_owner_id, r.owner_id AS resource_owner_id
       FROM matching.matches m
       INNER JOIN need.needs n ON n.id = m.need_id
       INNER JOIN resource.resources r ON r.id = m.resource_id
       WHERE m.id::text = $1
         AND (n.owner_id = $2 OR r.owner_id = $2)
         AND n.replaced_by_id IS NULL
         AND r.replaced_by_id IS NULL
         AND n.status = 'open'
         AND r.status = 'available'
       LIMIT 1`,
      [matchId, userId]
    );

    if (accessRows.length === 0) {
      return res.status(404).json({ error: 'Match not found or not accessible' });
    }

    const access = accessRows[0]!;
    if (access.pair_status === 'closed_rejected' || access.pair_status === 'closed_flagged') {
      return res.status(409).json({ error: 'Match is already closed' });
    }

    await query(
      `INSERT INTO matching.match_actions (user_id, match_id, action, details)
       VALUES ($1, $2::uuid, $3, $4)
       ON CONFLICT (user_id, match_id)
       DO UPDATE SET
         action = EXCLUDED.action,
         details = EXCLUDED.details,
         updated_at = NOW()`,
      [userId, access.id, action, details || null]
    );

    const needOwnerId = access.need_owner_id;
    const resourceOwnerId = access.resource_owner_id;

    let needAction: MatchActionType | null = null;
    let resourceAction: MatchActionType | null = null;
    if (needOwnerId && resourceOwnerId) {
      const sideRows = await query<{ user_id: UUID; action: MatchActionType }>(
        `SELECT user_id, action
         FROM matching.match_actions
         WHERE match_id = $1::uuid
           AND user_id IN ($2::uuid, $3::uuid)`,
        [access.id, needOwnerId, resourceOwnerId]
      );
      for (const row of sideRows) {
        if (row.user_id === needOwnerId) needAction = row.action;
        if (row.user_id === resourceOwnerId) resourceAction = row.action;
      }
    }

    const nextPairStatus = reconcilePairStatus(needAction, resourceAction);
    const resolvedReason =
      nextPairStatus === 'closed_rejected' || nextPairStatus === 'closed_flagged'
        ? details || null
        : null;

    await query(
      `UPDATE matching.matches
       SET
         pair_status = $2,
         resolved_at = CASE WHEN $2::text LIKE 'closed_%' THEN NOW() ELSE NULL END,
         resolved_reason = CASE WHEN $2::text LIKE 'closed_%' THEN $3 ELSE NULL END
       WHERE id = $1::uuid`,
      [access.id, nextPairStatus, resolvedReason]
    );

    return res.json({
      ok: true,
      message: 'Action saved',
      matchId: access.id,
      action: action as MatchActionType,
      details: details || null,
      pairStatus: nextPairStatus,
    });
  } catch (err) {
    next(err);
  }
});
