import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
  app.use(express.json({ limit: '20mb' }));
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
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // ── Passport ────────────────────────────────────────────────
  app.use(passport.initialize());
  app.use(passport.session());

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
      isProd: config.isProd,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Deep — verifies database connectivity
  app.get('/health/deep', async (_req: Request, res: Response) => {
    const start = Date.now();
    let dbOk = false;
    let dbLatencyMs: number | undefined;
    let dbError: string | undefined;

    try {
      await pool.query('SELECT 1');
      dbLatencyMs = Date.now() - start;
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }

    const ok = dbOk;
    res.status(ok ? 200 : 503).json({
      ok,
      isProd: config.isProd,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        db: {
          ok: dbOk,
          ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
          ...(dbError !== undefined && { error: dbError }),
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
