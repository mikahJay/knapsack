import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { imageSize } from 'image-size';
import { query, queryOne, pool } from '../db';
import { requireAuth } from '../auth/router';
import { AppUser } from '../auth/passport';
import type { UUID } from '../types';
import { previewResourcesFromText, ImportResourceItem, ImportPreviewError } from '../import/claude';
import {
  PHOTO_IMPORT_ALLOWED_MIME_TYPES,
  PHOTO_IMPORT_MAX_SIZE_BYTES,
  httpStatusForPhotoImportResult,
  previewResourcePhotoImport,
} from '../import/moderation';

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

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_IMPORT_MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (PHOTO_IMPORT_ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof PHOTO_IMPORT_ALLOWED_MIME_TYPES)[number])) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type'));
  },
});

// All routes require authentication
resourcesRouter.use(requireAuth);

// GET /api/resources — own resources plus all public resources from any user
resourcesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const resources = await query<Resource>(
      `SELECT * FROM resource.resources
       WHERE replaced_by_id IS NULL
         AND (owner_id = $1 OR is_public = true)
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/search?q=<query> — top 5 public+own resources by closest title match
resourcesRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = ((req.query['q'] as string) ?? '').trim();
    if (!q) return res.json([]);
    const userId = (req.user as AppUser).id;
    const resources = await query<Resource>(
      `SELECT * FROM resource.resources
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
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/import/preview — parse free text into draft resources
resourcesRouter.post('/import/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const preview = await previewResourcesFromText(text);
    res.json(preview);
  } catch (err) {
    if (err instanceof ImportPreviewError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/resources/import/photo/preview — evaluate a photo before parsing
resourcesRouter.post('/import/photo/preview', async (req: Request, res: Response, next: NextFunction) => {
  if (req.is('multipart/form-data')) {
    return photoUpload.single('photo')(req, res, async (uploadErr: unknown) => {
      if (uploadErr) {
        const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
        return res.status(400).json({ status: 'reject', code: 'UNSUPPORTED_MIME', message });
      }

      try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'photo file is required' });

        const dims = imageSize(file.buffer);
        const width = typeof dims.width === 'number' ? dims.width : 0;
        const height = typeof dims.height === 'number' ? dims.height : 0;

        const preview = await previewResourcePhotoImport({
          mimeType: file.mimetype,
          sizeBytes: file.size,
          width,
          height,
          fileName: file.originalname,
          imageBase64: file.buffer.toString('base64'),
        });

        res.status(httpStatusForPhotoImportResult(preview)).json(preview);
      } catch (err) {
        next(err);
      }
    });
  }

  try {
    const file = req.body?.file as {
      mimeType?: string;
      sizeBytes?: number;
      width?: number;
      height?: number;
      fileName?: string | null;
      imageBase64?: string | null;
    } | undefined;
    if (!file || typeof file.mimeType !== 'string') {
      return res.status(400).json({ error: 'file metadata is required' });
    }

    const preview = await previewResourcePhotoImport({
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      width: Number(file.width),
      height: Number(file.height),
      fileName: typeof file.fileName === 'string' ? file.fileName : null,
      imageBase64: typeof file.imageBase64 === 'string' ? file.imageBase64 : null,
    });

    res.status(httpStatusForPhotoImportResult(preview)).json(preview);
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/import/commit — persist reviewed resource drafts
resourcesRouter.post('/import/commit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body?.items;
    if (!Array.isArray(raw)) return res.status(400).json({ error: 'items must be an array' });
    if (raw.length === 0) return res.json([]);

    const userId = (req.user as AppUser).id;
    const items = raw as ImportResourceItem[];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const created: Resource[] = [];
      for (const item of items) {
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        if (!title) continue;

        const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 1
          ? Math.floor(Number(item.quantity))
          : 1;
        const status = ['available', 'allocated', 'retired'].includes(item.status) ? item.status : 'available';

        const inserted = await client.query<Resource>(
          `INSERT INTO resource.resources (title, description, status, is_public, quantity, available_until, owner_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            title,
            item.description?.trim() || null,
            status,
            item.is_public ?? true,
            quantity,
            item.available_until?.trim() || null,
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

// GET /api/resources/:id — own, or public
resourcesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const resource = await queryOne<Resource>(
      `SELECT * FROM resource.resources
       WHERE id = $1
         AND replaced_by_id IS NULL
         AND (owner_id = $2 OR is_public = true)`,
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
      `SELECT * FROM resource.resources
       WHERE id = $1 AND owner_id = $2 AND replaced_by_id IS NULL`,
      [req.params['id'], userId]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query<Resource>(
        `INSERT INTO resource.resources (title, description, status, is_public, quantity, available_until, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          title?.trim() ?? existing.title,
          description !== undefined ? description : existing.description,
          status ?? existing.status,
          is_public !== undefined ? is_public : existing.is_public,
          quantity ?? existing.quantity,
          available_until !== undefined ? available_until : existing.available_until,
          existing.owner_id,
        ]
      );

      const nextResource = inserted.rows[0];
      if (!nextResource) throw new Error('Failed to create new resource version');

      await client.query(
        `UPDATE resource.resources
         SET replaced_by_id = $1
         WHERE id = $2`,
        [nextResource.id, req.params['id']]
      );

      await client.query('COMMIT');
      res.json(nextResource);
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

// DELETE /api/resources/:id — owner only
resourcesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as AppUser).id;
    const result = await query<{ id: string }>(
      'DELETE FROM resource.resources WHERE id = $1 AND owner_id = $2 AND replaced_by_id IS NULL RETURNING id',
      [req.params['id'], userId]
    );
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
