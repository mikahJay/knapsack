import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config';
import { queryOne, query } from '../db';
import type { UUID } from '../types';

export interface AppUser {
  id: UUID;
  email: string;
  name: string | null;
  provider: string;
  is_admin: boolean;
}

// ── Serialise / deserialise ────────────────────────────────────
passport.serializeUser((user, done) => {
  done(null, (user as AppUser).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await queryOne<AppUser>(
      'SELECT id, email, name, provider, is_admin FROM auth.users WHERE id = $1',
      [id]
    );
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

// ── Non-prod bypass: upsert "bob" on every login ───────────────
export async function upsertBypassUser(): Promise<AppUser> {
  const existing = await queryOne<AppUser>(
    'SELECT id, email, name, provider, is_admin FROM auth.users WHERE email = $1',
    ['bob@local.dev']
  );
  if (existing) return existing;

  const [created] = await query<AppUser>(
    `INSERT INTO auth.users (email, name, provider)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, provider, is_admin`,
    ['bob@local.dev', 'Bob', 'local']
  );
  return created;
}

// ── Google OAuth strategy (prod only) ─────────────────────────
if (config.isProd) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: `${config.webUrl.replace(':3000', ':4000')}/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ?? `${profile.id}@google.invalid`;
          const name = profile.displayName;

          const existing = await queryOne<AppUser>(
            'SELECT id, email, name, provider, is_admin FROM auth.users WHERE provider = $1 AND provider_id = $2',
            ['google', profile.id]
          );
          if (existing) return done(null, existing);

          const [created] = await query<AppUser>(
            `INSERT INTO auth.users (email, name, provider, provider_id)
             VALUES ($1, $2, 'google', $3)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, provider_id = EXCLUDED.provider_id
             RETURNING id, email, name, provider, is_admin`,
            [email, name, profile.id]
          );
          done(null, created);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

export { passport };
