import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { passport, upsertBypassUser, AppUser } from './passport';

export const authRouter = Router();

// ── requireAuth middleware ─────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ── requireAdmin middleware ────────────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated() && (req.user as AppUser).is_admin) return next();
  res.status(403).json({ error: 'Forbidden' });
}

// ── GET /auth/me — return current user (or 401) ───────────────
authRouter.get('/me', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// ── Non-prod bypass login ─────────────────────────────────────
if (!config.isProd) {
  authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await upsertBypassUser();
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (err) {
      next(err);
    }
  });
}

// ── Google OAuth (prod) ────────────────────────────────────────
if (config.isProd) {
  authRouter.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  authRouter.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: `${config.webUrl}/login?error=auth` }),
    (_req: Request, res: Response) => {
      res.redirect(config.webUrl);
    }
  );
}

// ── Logout ────────────────────────────────────────────────────
authRouter.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});


