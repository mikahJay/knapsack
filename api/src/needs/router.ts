import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne, pool } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';
import type { UUID } from '../types';
import { previewNeedsFromText, ImportNeedItem, ImportPreviewError } from '../import/claude';

export interface Need {
  id: UUID;
  title: string;
  description: string | null;
  status: string;
  is_public: boolean;
  quantity: number;
  needed_by: string | null;
  owner_id: UUID | null;
  created_at: string;
  updated_at: string;
}

export const needsRouter = Router();

// All routes require authentication
needsRouter.use(requireAuth);

// GET /api/needs — own needs plus all public needs from any user
needsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const needs = await query<Need>(
      `SELECT * FROM need.needs
       WHERE replaced_by_id IS NULL
         AND (owner_id = $1 OR is_public = true)
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(needs);
  } catch (err) {
    next(err);
  }
});

// GET /api/needs/search?q=<query> — top 5 public+own needs by closest title match
needsRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = ((req.query['q'] as string) ?? '').trim();
    if (!q) return res.json([]);
    const userId = (req.user as AppUser).id;
    const needs = await query<Need>(
      `SELECT * FROM need.needs
       WHERE replaced_by_id IS NULL
         AND (owner_id = $1 OR is_public = true)
         AND (title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
       ORDER BY
         CASE
           WHEN LOWER(title) = LOWER($2)           THEN 0
           WHEN LOWER(title) LIKE LOWER($2) || '%' THEN 1
           WHEN LOWER(title) LIKE '%' || LOWER($2) THEN 2
           ELSE 3
         END,
         LENGTH(title),
         title
       LIMIT 5`,
      [userId, q]
    );
    res.json(needs);
  } catch (err) {
    next(err);
  }
});

// POST /api/needs/import/preview — parse free text into draft needs
needsRouter.post('/import/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const preview = await previewNeedsFromText(text);
    res.json(preview);
  } catch (err) {
    if (err instanceof ImportPreviewError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/needs/import/commit — persist reviewed need drafts
needsRouter.post('/import/commit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body?.items;
    if (!Array.isArray(raw)) return res.status(400).json({ error: 'items must be an array' });
    if (raw.length === 0) return res.json([]);

    const userId = (req.user as AppUser).id;
    const items = raw as ImportNeedItem[];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const created: Need[] = [];
      for (const item of items) {
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        if (!title) continue;

        const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 1
          ? Math.floor(Number(item.quantity))
          : 1;
        const status = ['open', 'fulfilled', 'closed'].includes(item.status) ? item.status : 'open';

        const inserted = await client.query<Need>(
          `INSERT INTO need.needs (title, description, status, is_public, quantity, needed_by, owner_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            title,
            item.description?.trim() || null,
            status,
            item.is_public ?? true,
            quantity,
            item.needed_by?.trim() || null,
            userId,
          ]
        );
        if (inserted.rows[0]) created.push(inserted.rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json(created);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/needs/:id — own, or public
needsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const need = await queryOne<Need>(
      `SELECT * FROM need.needs
       WHERE id = $1
         AND replaced_by_id IS NULL
         AND (owner_id = $2 OR is_public = true)`,
      [req.params['id'], userId]
    );
    if (!need) return res.status(404).json({ error: 'Not found' });
    res.json(need);
  } catch (err) {
    next(err);
  }
});

// POST /api/needs
needsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, is_public, quantity, needed_by } = req.body as {
      title?: string;
      description?: string;
      is_public?: boolean;
      quantity?: number;
      needed_by?: string | null;
    };
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const ownerId = (req.user as AppUser).id;
    const need = await queryOne<Need>(
      `INSERT INTO need.needs (title, description, is_public, quantity, needed_by, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title.trim(), description ?? null, is_public ?? false, quantity ?? 1, needed_by ?? null, ownerId]
    );
    res.status(201).json(need);
  } catch (err) {
    next(err);
  }
});

// PUT /api/needs/:id — owner only
needsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, status, is_public, quantity, needed_by } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      is_public?: boolean;
      quantity?: number;
      needed_by?: string | null;
    };
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const userId = (req.user as AppUser).id;
    const existing = await queryOne<Need>(
      `SELECT * FROM need.needs
       WHERE id = $1 AND owner_id = $2 AND replaced_by_id IS NULL`,
      [req.params['id'], userId]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query<Need>(
        `INSERT INTO need.needs (title, description, status, is_public, quantity, needed_by, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          title?.trim() ?? existing.title,
          description !== undefined ? description : existing.description,
          status ?? existing.status,
          is_public !== undefined ? is_public : existing.is_public,
          quantity ?? existing.quantity,
          needed_by !== undefined ? needed_by : existing.needed_by,
          existing.owner_id,
        ]
      );

      const nextNeed = inserted.rows[0];
      if (!nextNeed) throw new Error('Failed to create new need version');

      await client.query(
        `UPDATE need.needs
         SET replaced_by_id = $1
         WHERE id = $2`,
        [nextNeed.id, req.params['id']]
      );

      await client.query('COMMIT');
      res.json(nextNeed);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/needs/:id — owner only
needsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const result = await query<{ id: string }>(
      'DELETE FROM need.needs WHERE id = $1 AND owner_id = $2 AND replaced_by_id IS NULL RETURNING id',
      [req.params['id'], userId]
    );
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
