import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({ connectionString: config.databaseUrl });

/** Run a query and return all rows. */
export async function query<T extends object>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

/** Run a query and return the first row (or undefined). */
export async function queryOne<T extends object>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}
