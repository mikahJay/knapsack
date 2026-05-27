import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';
import type { UUID } from '../types';

const engagementsRouter = Router();
engagementsRouter.use(requireAuth);

/**
 * Resolves a match the caller is allowed to act on (need or resource owner).
 */
async function getAuthorizedMatch(
  userId: UUID,
  matchId: UUID
): Promise<{
  match_id: UUID;
  need_id: UUID;
  resource_id: UUID;
  need_title: string;
  resource_title: string;
} | null> {
  const rows = await query<{
    match_id: UUID;
    need_id: UUID;
    resource_id: UUID;
    need_title: string;
    resource_title: string;
  }>(
    `SELECT
       m.id AS match_id,
       m.need_id,
       m.resource_id,
       n.title AS need_title,
       r.title AS resource_title
     FROM matching.matches m
     INNER JOIN need.needs n ON n.id = m.need_id
     INNER JOIN resource.resources r ON r.id = m.resource_id
     WHERE m.id = $1
       AND n.replaced_by_id IS NULL
       AND r.replaced_by_id IS NULL
       AND n.status = 'open'
       AND r.status = 'available'
       AND (n.owner_id = $2 OR r.owner_id = $2)`,
    [matchId, userId]
  );
  return rows[0] ?? null;
}

engagementsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as AppUser).id;
      const { matchId } = req.body as { matchId?: string };
      if (typeof matchId !== 'string' || !matchId.trim()) {
        return res.status(400).json({ error: 'matchId is required' });
      }

      const match = await getAuthorizedMatch(userId, matchId);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const created = await query<EngagementRow>(
        `INSERT INTO engagement.engagements (match_id, initiated_by, status)
         VALUES ($1, $2, 'exploring')
         RETURNING
           id,
           match_id,
           status,
           initiated_by,
           reserved_at,
           in_fulfillment_at,
           completed_at,
           cancelled_at,
           metadata,
           created_at,
           updated_at`,
        [matchId, userId]
      );

      if (!created[0]) {
        return res.status(500).json({ error: 'Failed to create engagement' });
      }

      return res.status(201).json(
        toEngagementJson(created[0], {
          need_title: match.need_title,
          resource_title: match.resource_title,
        })
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        return res.status(409).json({
          error: 'An open engagement already exists for this match',
        });
      }
      next(err);
    }
  }
);

engagementsRouter.get(
  '/for-match/:matchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as AppUser).id;
      const { matchId } = req.params;
      if (typeof matchId !== 'string') {
        return res.status(400).json({ error: 'Invalid match id' });
      }

      const match = await getAuthorizedMatch(userId, matchId);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const rows = await query<EngagementRow>(
        `SELECT
           e.id,
           e.match_id,
           e.status,
           e.initiated_by,
           e.reserved_at,
           e.in_fulfillment_at,
           e.completed_at,
           e.cancelled_at,
           e.metadata,
           e.created_at,
           e.updated_at
         FROM engagement.engagements e
         WHERE e.match_id = $1
         ORDER BY e.created_at DESC
         LIMIT 1`,
        [matchId]
      );

      const e = rows[0];
      if (!e) {
        return res.json({ engagement: null, match: matchContext(match) });
      }

      return res.json({
        engagement: toEngagementJson(e, {
          need_title: match.need_title,
          resource_title: match.resource_title,
        }),
        match: matchContext(match),
      });
    } catch (err) {
      next(err);
    }
  }
);

engagementsRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as AppUser).id;
      const { id } = req.params;
      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid id' });
      }

      const detail = await loadEngagementDetail(userId, id);
      if (!detail) {
        return res.status(404).json({ error: 'Engagement not found' });
      }

      return res.json(detail);
    } catch (err) {
      next(err);
    }
  }
);

// ── Types + helpers (keep JSON stable for the web client) ─────

interface EngagementRow {
  id: UUID;
  match_id: UUID;
  status: string;
  initiated_by: UUID | null;
  reserved_at: string | null;
  in_fulfillment_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}

function matchContext(match: {
  match_id: UUID;
  need_id: UUID;
  resource_id: UUID;
  need_title: string;
  resource_title: string;
}) {
  return {
    need_id: match.need_id,
    resource_id: match.resource_id,
    need_title: match.need_title,
    resource_title: match.resource_title,
  };
}

function toEngagementJson(
  e: EngagementRow,
  ctx: { need_title: string; resource_title: string }
) {
  return {
    id: e.id,
    match_id: e.match_id,
    status: e.status,
    initiated_by: e.initiated_by,
    reserved_at: e.reserved_at,
    in_fulfillment_at: e.in_fulfillment_at,
    completed_at: e.completed_at,
    cancelled_at: e.cancelled_at,
    metadata: e.metadata,
    created_at: e.created_at,
    updated_at: e.updated_at,
    need_title: ctx.need_title,
    resource_title: ctx.resource_title,
  };
}

async function loadEngagementDetail(userId: UUID, engagementId: UUID) {
  const eng = await query<
    EngagementRow & {
      need_title: string;
      resource_title: string;
      need_id: UUID;
      resource_id: UUID;
    }
  >(
    `SELECT
       e.id,
       e.match_id,
       e.status,
       e.initiated_by,
       e.reserved_at,
       e.in_fulfillment_at,
       e.completed_at,
       e.cancelled_at,
       e.metadata,
       e.created_at,
       e.updated_at,
       n.title AS need_title,
       r.title AS resource_title,
       m.need_id,
       m.resource_id
     FROM engagement.engagements e
     INNER JOIN matching.matches m ON m.id = e.match_id
     INNER JOIN need.needs n ON n.id = m.need_id
     INNER JOIN resource.resources r ON r.id = m.resource_id
     WHERE e.id = $1
       AND n.replaced_by_id IS NULL
       AND r.replaced_by_id IS NULL
       AND (n.owner_id = $2 OR r.owner_id = $2)`,
    [engagementId, userId]
  );

  if (!eng[0]) {
    return null;
  }

  const row = eng[0];
  const messages = await query<EngagementMessageRow>(
    `SELECT id, engagement_id, kind, sender_id, body, created_at
     FROM engagement.messages
     WHERE engagement_id = $1
     ORDER BY created_at ASC`,
    [engagementId]
  );

  const tasks = await query<EngagementTaskRow>(
    `SELECT
       id,
       engagement_id,
       task_type,
       status,
       sort_order,
       title,
       details,
       started_at,
       completed_at,
       completed_by,
       created_at,
       updated_at
     FROM engagement.fulfillment_tasks
     WHERE engagement_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [engagementId]
  );

  return {
    engagement: {
      id: row.id,
      match_id: row.match_id,
      status: row.status,
      initiated_by: row.initiated_by,
      reserved_at: row.reserved_at,
      in_fulfillment_at: row.in_fulfillment_at,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      need_id: row.need_id,
      resource_id: row.resource_id,
      need_title: row.need_title,
      resource_title: row.resource_title,
    },
    messages: messages,
    tasks: tasks,
  };
}

interface EngagementMessageRow {
  id: UUID;
  engagement_id: UUID;
  kind: string;
  sender_id: UUID | null;
  body: string;
  created_at: string;
}

interface EngagementTaskRow {
  id: UUID;
  engagement_id: UUID;
  task_type: string;
  status: string;
  sort_order: number;
  title: string | null;
  details: unknown;
  started_at: string | null;
  completed_at: string | null;
  completed_by: UUID | null;
  created_at: string;
  updated_at: string;
}

export { engagementsRouter };
