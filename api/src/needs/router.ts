import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';

export interface Need {
  id: string;
  title: string;
  description: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export const needsRouter = Router();

// All routes require authentication
needsRouter.use(requireAuth);

// GET /api/needs
needsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const needs = await query<Need>('SELECT * FROM need.needs ORDER BY created_at DESC');
    res.json(needs);
  } catch (err) {
    next(err);
  }
});

// GET /api/needs/:id
needsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const need = await queryOne<Need>(
      'SELECT * FROM need.needs WHERE id = $1',
      [req.params['id']]
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
    const { title, description } = req.body as { title?: string; description?: string };
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    const ownerId = (req.user as AppUser).id;
    const need = await queryOne<Need>(
      `INSERT INTO need.needs (title, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title.trim(), description ?? null, ownerId]
    );
    res.status(201).json(need);
  } catch (err) {
    next(err);
  }
});

// PUT /api/needs/:id
needsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, status } = req.body as {
      title?: string;
      description?: string;
      status?: string;
    };

    const existing = await queryOne<Need>(
      'SELECT * FROM need.needs WHERE id = $1',
      [req.params['id']]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const need = await queryOne<Need>(
      `UPDATE need.needs
       SET title = $1, description = $2, status = $3
       WHERE id = $4
       RETURNING *`,
      [
        title?.trim() ?? existing.title,
        description !== undefined ? description : existing.description,
        status ?? existing.status,
        req.params['id'],
      ]
    );
    res.json(need);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/needs/:id
needsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<{ id: string }>(
      'DELETE FROM need.needs WHERE id = $1 RETURNING id',
      [req.params['id']]
    );
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
