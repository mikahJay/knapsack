import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const IS_PROD = process.env['IS_PROD'] === 'true';

export const config = {
  isProd: IS_PROD,
  port: parseInt(process.env['PORT'] ?? '4000', 10),
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgres://knapsack:knapsack@localhost:5432/knapsack',
  sessionSecret: process.env['SESSION_SECRET'] ?? 'local-dev-secret',
  webUrl: process.env['WEB_URL'] ?? 'http://localhost:3000',
  google: IS_PROD
    ? {
        clientId: requireEnv('GOOGLE_CLIENT_ID'),
        clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
      }
    : {
        clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
      },
};
