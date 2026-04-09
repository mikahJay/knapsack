import { Pool } from 'pg';

export const pool = new Pool({
  connectionString:
    process.env['DATABASE_URL'] ??
    'postgres://knapsack:knapsack@localhost:5432/knapsack',
});

export async function query<T extends object>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}
