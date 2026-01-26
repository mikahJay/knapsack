const express = require('express')
const bodyParser = require('body-parser')
const format = require('pg-format')
const { authOptional, authRequired } = require('./auth')
const { pool, initDb } = require('./db')
const app = express()
const port = process.env.PORT || 4020

app.use(bodyParser.json())

// Allow CORS for local dev web app and others
app.use((req, res, next) => {
  const origin = req.headers.origin || '*'
  if (origin && origin !== '*') {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS')
  const reqHeaders = req.headers['access-control-request-headers']
  const allowedHeaders = reqHeaders && typeof reqHeaders === 'string' ? reqHeaders : 'Content-Type, Authorization, X-Requested-With, Accept'
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '600')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Enforce requests come from the web-app origin and require authenticated users.
// Allow OPTIONS through for CORS preflight.
const WEB_APP_ORIGIN = process.env.WEB_APP_ORIGIN || `https://${process.env.DOMAIN_NAME || 'knap-sack.com'}`

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  const origin = req.headers.origin
  if (!origin || origin !== WEB_APP_ORIGIN) return res.status(403).json({ error: 'forbidden origin' })
  next()
})

// Require a valid Google ID token for all routes (except preflight). This ensures the
// request originates from an authenticated web-app user.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  return authRequired(req, res, next)
})

app.get('/', (req, res) => res.sendStatus(200))

// Support ALB path /need so requests routed to /need return 200 as well
app.get('/need', (req, res) => res.sendStatus(200))

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'need-server' }))

// List / search needs
app.get('/needs', async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query
  const filters = []
  const values = []

  if (req.query.owner) {
    filters.push(`owner = $${values.length + 1}`)
    values.push(req.query.owner)
  }

  if (search) {
    // build a prefix tsquery so short partial terms match (e.g., 'mon' -> 'mon:*')
    const terms = String(search).trim().split(/\s+/).map(t => t.replace(/'/g, "\\'") + ':*').join(' & ')
    filters.push(`to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(attributes::text,'')) @@ to_tsquery($${values.length + 1})`)
    values.push(terms)
  }

  Object.keys(req.query).forEach(k => {
    if (k.startsWith('attr.')) {
      const key = k.slice(5)
      filters.push(`attributes->> $${values.length + 1} ILIKE $${values.length + 2}`)
      values.push(key)
      values.push(`%${req.query[k]}%`)
    }
  })

  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : ''
  const sql = format('SELECT * FROM needs %s ORDER BY created_at DESC LIMIT %L OFFSET %L', where, limit, offset)
  try {
    const result = await pool.query(sql, values)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/needs/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM needs WHERE id = $1', [req.params.id])
    if (!r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/me/needs', authRequired, async (req, res) => {
  try{
    const email = req.user && req.user.email
    if(!email) return res.status(401).json({ error: 'unauthenticated' })
    const r = await pool.query('SELECT * FROM needs WHERE owner = $1 ORDER BY created_at DESC', [email])
    res.json(r.rows)
  }catch(err){
    res.status(500).json({ error: err.message })
  }
})

app.post('/needs', async (req, res) => {
  const { name, description, quantity, public: isPublic = false, attributes = {}, owner = null } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const r = await pool.query(
      'INSERT INTO needs(name, owner, description, quantity, public, attributes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, owner, description || null, quantity || null, isPublic, attributes]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/needs/:id', authOptional, async (req, res) => {
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
    if(Object.prototype.hasOwnProperty.call(req.body, 'owner')){
      const cur = await pool.query('SELECT owner FROM needs WHERE id = $1', [req.params.id])
      if(!cur.rows.length) return res.status(404).json({ error: 'not found' })
      const existingOwner = cur.rows[0].owner
      if(existingOwner !== null && req.body.owner !== existingOwner){
        return res.status(403).json({ error: 'owner is immutable' })
      }
      if(existingOwner === null && req.body.owner){
        return res.status(403).json({ error: 'owner can only be set at creation' })
      }
    }
    const r = await pool.query(`UPDATE needs SET ${sets} WHERE id = $${values.length} RETURNING *`, values)
    if (!r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/needs/:id/toggle-public', authOptional, async (req, res) => {
  const id = req.params.id
  const { public: newPublic } = req.body
  if (typeof newPublic === 'undefined') return res.status(400).json({ error: 'public required' })
  try{
    const r = await pool.query('UPDATE needs SET public = $1 WHERE id = $2 RETURNING *', [newPublic, id])
    if(!r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json(r.rows[0])
  }catch(err){
    res.status(500).json({ error: err.message })
  }
})

app.delete('/needs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM needs WHERE id = $1', [req.params.id])
    res.sendStatus(204)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Only start the server when run directly. This allows importing `app` in tests
// and mocking `pg` before the module initializes.
if (require.main === module) {
  initDb().then(() => {
    app.listen(port, () => console.log(`need-server listening on ${port}`))
  }).catch(err => {
    console.error('Failed to initialize DB:', err.message)
    process.exit(1)
  })
}

module.exports = { app, initDb, pool }
