const express = require('express')
const bodyParser = require('body-parser')
const { Pool } = require('pg')
const format = require('pg-format')
const app = express()
const port = process.env.PORT || 4010

app.use(bodyParser.json())

// Allow CORS for local dev web app and others
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function runMigrations() {
  const client = await pool.connect()
  try {
    // extensions
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    // resources table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        quantity numeric CHECK (quantity > 0),
        public boolean DEFAULT false,
        attributes jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `)

    // indexes for JSONB and full-text search
    await client.query(`CREATE INDEX IF NOT EXISTS resources_attrs_idx ON resources USING GIN (attributes);`)
    await client.query(`CREATE INDEX IF NOT EXISTS resources_fulltext_idx ON resources USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(attributes::text,'')));`)

    // trigger to update updated_at
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
          BEFORE UPDATE ON resources
          FOR EACH ROW
          EXECUTE PROCEDURE trigger_set_timestamp();
        END IF;
      END$$;
    `)
  } finally {
    client.release()
  }
}

// retry connecting and run migrations
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

app.get('/', (req, res) => res.sendStatus(200))

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'resource-server' }))

app.get('/resource', (req, res) => res.sendStatus(200))

// List / search resources
app.get('/resources', async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query
  const filters = []
  const values = []

  if (search) {
    filters.push(`to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(attributes::text,'')) @@ plainto_tsquery($${values.length + 1})`)
    values.push(search)
  }

  // support attributes filtering via query params attr.<key>=value
  Object.keys(req.query).forEach(k => {
    if (k.startsWith('attr.')) {
      const key = k.slice(5)
      filters.push(`attributes->> $${values.length + 1} ILIKE $${values.length + 2}`)
      values.push(key)
      values.push(`%${req.query[k]}%`)
    }
  })

  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : ''
  const sql = format('SELECT * FROM resources %s ORDER BY created_at DESC LIMIT %L OFFSET %L', where, limit, offset)
  try {
    const result = await pool.query(sql, values)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/resources/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM resources WHERE id = $1', [req.params.id])
    if (!r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/resources', async (req, res) => {
  const { name, description, quantity, public: isPublic = false, attributes = {} } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const r = await pool.query(
      'INSERT INTO resources(name, description, quantity, public, attributes) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [name, description || null, quantity || null, isPublic, attributes]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/resources/:id', async (req, res) => {
  const fields = []
  const values = []
  const allowed = ['name', 'description', 'quantity', 'public', 'attributes']
  Object.keys(req.body).forEach(k => {
    if (allowed.includes(k)) {
      values.push(req.body[k])
      fields.push(k)
    }
  })
  if (!fields.length) return res.status(400).json({ error: 'no updatable fields' })
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
  values.push(req.params.id)
  try {
    const r = await pool.query(`UPDATE resources SET ${sets} WHERE id = $${values.length} RETURNING *`, values)
    if (!r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/resources/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM resources WHERE id = $1', [req.params.id])
    res.sendStatus(204)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

initDb().then(() => {
  app.listen(port, () => console.log(`resource-server listening on ${port}`))
}).catch(err => {
  console.error('Failed to initialize DB:', err.message)
  process.exit(1)
})
