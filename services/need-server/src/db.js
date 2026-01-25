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

console.log('DB_SSL env:', process.env.DB_SSL)

async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    await client.query(`
      CREATE TABLE IF NOT EXISTS needs (
        id text PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
        name text NOT NULL,
        owner text,
        description text,
        quantity numeric CHECK (quantity > 0),
        public boolean DEFAULT false,
        attributes jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `)

    await client.query(`ALTER TABLE needs ADD COLUMN IF NOT EXISTS owner text;`)

    await client.query(`CREATE INDEX IF NOT EXISTS needs_attrs_idx ON needs USING GIN (attributes);`)
    await client.query(`CREATE INDEX IF NOT EXISTS needs_fulltext_idx ON needs USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(attributes::text,'')));`)
    await client.query(`CREATE INDEX IF NOT EXISTS needs_owner_idx ON needs (owner);`)

    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp') THEN
          CREATE TRIGGER set_timestamp
          BEFORE UPDATE ON needs
          FOR EACH ROW
          EXECUTE PROCEDURE trigger_set_timestamp();
        END IF;
      END$$;
    `)
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
