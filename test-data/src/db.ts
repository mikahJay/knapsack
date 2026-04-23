import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

// Load from test-data/.env first, then fall back to repo root .env
dotenvConfig();
dotenvConfig({ path: resolve(__dirname, '../../.env'), override: false });

const connectionString =
  process.env['DATABASE_URL'] ?? 'postgres://knapsack:knapsack@localhost:5432/knapsack';

export const pool = new Pool({ connectionString });

export async function query<T extends object>(sql: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function queryOne<T extends object>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function end(): Promise<void> {
  await pool.end();
}
