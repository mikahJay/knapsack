const { Pool } = require('pg')

function parseDbCredentials() {
  const raw = process.env.DB_CREDENTIALS || '{}'
  try {
    return JSON.parse(raw)
  } catch (e) {
    return {}
  }
}

const dbCreds = parseDbCredentials()
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  database: process.env.DB_NAME || 'knapsack',
  user: dbCreds.username || process.env.DB_USER,
  password: dbCreds.password || process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

// Diagnostic: print database connection info (don't print secrets)
console.log('DB_SSL env:', process.env.DB_SSL)
console.log('DB connection info:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.DB_NAME || 'knapsack',
  has_db_credentials: !!(process.env.DB_CREDENTIALS || process.env.DB_USER || process.env.DB_PASSWORD),
})

async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    await client.query(`
      CREATE TABLE IF NOT EXISTS match_candidates (
        id text PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
        need_id text NOT NULL,
        resource_id text NOT NULL,
        match_reason text,
        match_statistics jsonb,
        created_at timestamptz DEFAULT now(),
        selected boolean DEFAULT false
      );
    `)

    // Indexes for efficient lookups
    await client.query(`CREATE INDEX IF NOT EXISTS match_candidates_need_id_idx ON match_candidates (need_id);`)
    await client.query(`CREATE INDEX IF NOT EXISTS match_candidates_resource_id_idx ON match_candidates (resource_id);`)
    await client.query(`CREATE INDEX IF NOT EXISTS match_candidates_selected_idx ON match_candidates (selected);`)
    await client.query(`CREATE INDEX IF NOT EXISTS match_candidates_created_at_idx ON match_candidates (created_at DESC);`)
    await client.query(`CREATE INDEX IF NOT EXISTS match_candidates_stats_idx ON match_candidates USING GIN (match_statistics);`)
  } finally {
    client.release()
  }
}

async function initDb() {
  const max = 30
  for (let i = 0; i < max; i++) {
    try {
      await pool.query('SELECT 1')
      await runMigrations()
      console.log('Database connected and migrations applied')
      return
    } catch (err) {
      console.log('Waiting for DB...', err.message)
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error('Could not connect to database')
}

module.exports = { pool, initDb }
