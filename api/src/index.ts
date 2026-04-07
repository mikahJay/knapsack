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

export function createApp(): express.Application {
  const app = express();

  // ── Body / cookies ──────────────────────────────────────────
  app.use(express.json());
  app.use(cookieParser());

  // ── CORS (allow web frontend) ───────────────────────────────
  app.use(
    cors({
      origin: config.webUrl,
      credentials: true,
    })
  );

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

  // ── Health check ────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, isProd: config.isProd });
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
