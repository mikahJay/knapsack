import 'dotenv/config';
import { Pool } from 'pg';

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
