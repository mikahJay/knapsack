const express = require('express')
const bodyParser = require('body-parser')
const { Pool } = require('pg')
const format = require('pg-format')
const { OAuth2Client } = require('google-auth-library')
const app = express()
const port = process.env.PORT || 4010

app.use(bodyParser.json())

// Allow CORS for local dev web app and others
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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

const googleClientId = process.env.GOOGLE_CLIENT_ID || null
const oauth2Client = googleClientId ? new OAuth2Client(googleClientId) : null

async function verifyIdToken(idToken){
  if(!oauth2Client) throw new Error('GOOGLE_CLIENT_ID not configured')
  const ticket = await oauth2Client.verifyIdToken({ idToken, audience: googleClientId })
  return ticket.getPayload()
}

// middleware: if Authorization: Bearer <id_token> header present, verify and attach req.user
async function authOptional(req, res, next){
  const auth = req.headers.authorization || ''
  if(!auth) return next()
  const m = auth.match(/^Bearer (.+)$/)
  if(!m) return res.status(400).json({ error: 'invalid authorization header' })
  const token = m[1]
  try{
    const payload = await verifyIdToken(token)
    // minimal user object
    req.user = { email: payload.email, name: payload.name, sub: payload.sub }
    return next()
  }catch(err){
    console.error('id token verify failed', err && err.message)
    return res.status(401).json({ error: 'invalid id_token' })
  }
}

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
        owner text,
        description text,
        quantity numeric CHECK (quantity > 0),
        public boolean DEFAULT false,
        attributes jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `)

    // ensure owner column exists for older deployments
    await client.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS owner text;`)

    // indexes for JSONB and full-text search
    await client.query(`CREATE INDEX IF NOT EXISTS resources_attrs_idx ON resources USING GIN (attributes);`)
    await client.query(`CREATE INDEX IF NOT EXISTS resources_fulltext_idx ON resources USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(attributes::text,'')));`)
    await client.query(`CREATE INDEX IF NOT EXISTS resources_owner_idx ON resources (owner);`)

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

  // owner filter
  if (req.query.owner) {
    filters.push(`owner = $${values.length + 1}`)
    values.push(req.query.owner)
  }

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

app.post('/resources', authOptional, async (req, res) => {
  const { name, description, quantity, public: isPublic = false, attributes = {} } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  // owner is derived from validated id_token if present
  const owner = req.user ? req.user.email : null
  try {
    const r = await pool.query(
      'INSERT INTO resources(name, owner, description, quantity, public, attributes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, owner, description || null, quantity || null, isPublic, attributes]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/resources/:id', authOptional, async (req, res) => {
  const fields = []
  const values = []
  // owner is immutable after creation; do not allow owner in updates
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
    // If caller attempted to set owner in body, reject if it differs from existing owner
    if(Object.prototype.hasOwnProperty.call(req.body, 'owner')){
      const cur = await pool.query('SELECT owner FROM resources WHERE id = $1', [req.params.id])
      if(!cur.rows.length) return res.status(404).json({ error: 'not found' })
      const existingOwner = cur.rows[0].owner
      if(existingOwner !== null && req.body.owner !== existingOwner){
        return res.status(403).json({ error: 'owner is immutable' })
      }
      // if existingOwner is null and caller provided owner, reject — owner is set only at creation
      if(existingOwner === null && req.body.owner){
        return res.status(403).json({ error: 'owner can only be set at creation' })
      }
    }
    // Prevent owner changes: ignore any owner in body and disallow updates that try to set owner
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
