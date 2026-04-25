import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { pool } from './db';
import { passport } from './auth/passport';
import { authRouter } from './auth/router';
import { needsRouter } from './needs/router';
import { resourcesRouter } from './resources/router';
import { adminRouter } from './admin/router';
import { matchesRouter } from './matches/router';

export function createApp(): express.Application {
  const app = express();

  // ── CORS (must be first so headers are present on error responses) ──────────
  app.use(
    cors({
      origin: config.webUrl,
      credentials: true,
    })
  );

  // ── Body / cookies ──────────────────────────────────────────
  // 1 MB is generous for text payloads and import commits; the multipart photo
  // path is handled by multer separately and is gated by PHOTO_IMPORT_MAX_SIZE_BYTES.
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // ── Sessions backed by Postgres ─────────────────────────────
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        schemaName: 'auth',
        tableName: 'sessions',
        createTableIfMissing: true,
      }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // ── Passport ────────────────────────────────────────────────
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Rate limiting ────────────────────────────────────────────
  // General limit: 300 requests per minute per IP
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict limit for AI-powered import endpoints (Claude API calls)
  const importLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many import requests, please slow down.' },
  });

  app.use(generalLimiter);

  // Apply tighter rate limiting to expensive AI import paths BEFORE routers so
  // every matching request is counted even if the router handles it first.
  app.use('/api/needs/import', importLimiter);
  app.use('/api/resources/import', importLimiter);

  // ── Routes ──────────────────────────────────────────────────
  app.use('/auth', authRouter);
  app.use('/api/needs', needsRouter);
  app.use('/api/resources', resourcesRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/admin', adminRouter);

  // ── Health checks ────────────────────────────────────────────
  // Shallow — always fast, no external dependencies
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Deep — verifies database connectivity
  app.get('/health/deep', async (_req: Request, res: Response) => {
    const start = Date.now();
    let dbOk = false;
    let dbLatencyMs: number | undefined;

    try {
      await pool.query('SELECT 1');
      dbLatencyMs = Date.now() - start;
      dbOk = true;
    } catch {
      // Do not expose internal DB error details to unauthenticated callers
    }

    const ok = dbOk;
    res.status(ok ? 200 : 503).json({
      ok,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        db: {
          ok: dbOk,
          ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
        },
      },
    });
  });

  // ── Error handler ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Start server when run directly
if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(
      `Knapsack API listening on port ${config.port} [${config.isProd ? 'PROD' : 'NON-PROD'}]`
    );
  });
}
