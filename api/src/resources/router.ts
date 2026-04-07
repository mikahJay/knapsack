import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';
import type { UUID } from '../types';

export interface Resource {
  id: UUID;
  title: string;
  description: string | null;
  status: string;
  is_public: boolean;
  quantity: number;
  available_until: string | null;
  owner_id: UUID | null;
  created_at: string;
  updated_at: string;
}

export const resourcesRouter = Router();

// All routes require authentication
resourcesRouter.use(requireAuth);

// GET /api/resources — own resources plus all public resources from any user
resourcesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const resources = await query<Resource>(
      `SELECT * FROM resource.resources
       WHERE owner_id = $1 OR is_public = true
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id — own, or public
resourcesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const resource = await queryOne<Resource>(
      `SELECT * FROM resource.resources WHERE id = $1 AND (owner_id = $2 OR is_public = true)`,
      [req.params['id'], userId]
    );
    if (!resource) return res.status(404).json({ error: 'Not found' });
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

// POST /api/resources
resourcesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, is_public, quantity, available_until } = req.body as {
      title?: string;
      description?: string;
      is_public?: boolean;
      quantity?: number;
      available_until?: string | null;
    };
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const ownerId = (req.user as AppUser).id;
    const resource = await queryOne<Resource>(
      `INSERT INTO resource.resources (title, description, is_public, quantity, available_until, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title.trim(), description ?? null, is_public ?? false, quantity ?? 1, available_until ?? null, ownerId]
    );
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

// PUT /api/resources/:id — owner only
resourcesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, status, is_public, quantity, available_until } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      is_public?: boolean;
      quantity?: number;
      available_until?: string | null;
    };
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const userId = (req.user as AppUser).id;
    const existing = await queryOne<Resource>(
      'SELECT * FROM resource.resources WHERE id = $1 AND owner_id = $2',
      [req.params['id'], userId]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const resource = await queryOne<Resource>(
      `UPDATE resource.resources
       SET title = $1, description = $2, status = $3, is_public = $4, quantity = $5, available_until = $6
       WHERE id = $7
       RETURNING *`,
      [
        title?.trim() ?? existing.title,
        description !== undefined ? description : existing.description,
        status ?? existing.status,
        is_public !== undefined ? is_public : existing.is_public,
        quantity ?? existing.quantity,
        available_until !== undefined ? available_until : existing.available_until,
        req.params['id'],
      ]
    );
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/resources/:id — owner only
resourcesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const result = await query<{ id: string }>(
      'DELETE FROM resource.resources WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params['id'], userId]
    );
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
