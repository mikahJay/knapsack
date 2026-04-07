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
  owner_id: UUID | null;
  created_at: string;
  updated_at: string;
}

export const resourcesRouter = Router();

// All routes require authentication
resourcesRouter.use(requireAuth);

// GET /api/resources
resourcesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const resources = await query<Resource>('SELECT * FROM resource.resources ORDER BY created_at DESC');
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id
resourcesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resource = await queryOne<Resource>(
      'SELECT * FROM resource.resources WHERE id = $1',
      [req.params['id']]
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
    const { title, description } = req.body as { title?: string; description?: string };
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    const ownerId = (req.user as AppUser).id;
    const resource = await queryOne<Resource>(
      `INSERT INTO resource.resources (title, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title.trim(), description ?? null, ownerId]
    );
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

// PUT /api/resources/:id
resourcesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, status } = req.body as {
      title?: string;
      description?: string;
      status?: string;
    };

    const existing = await queryOne<Resource>(
      'SELECT * FROM resource.resources WHERE id = $1',
      [req.params['id']]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const resource = await queryOne<Resource>(
      `UPDATE resource.resources
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
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/resources/:id
resourcesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<{ id: string }>(
      'DELETE FROM resource.resources WHERE id = $1 RETURNING id',
      [req.params['id']]
    );
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
