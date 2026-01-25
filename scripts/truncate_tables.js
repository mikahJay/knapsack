const { Pool } = require('pg')

function parseDbCredentials() {
  const raw = process.env.DB_CREDENTIALS || '{}'
  try { return JSON.parse(raw) } catch (e) { return {} }
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

async function truncate() {
  if(!pool.options.user || !pool.options.password) {
    console.error('DB credentials not found in env. Set DB_CREDENTIALS JSON or DB_USER/DB_PASSWORD.')
    process.exit(1)
  }
  const client = await pool.connect()
  try {
    console.log('Truncating tables: resources, needs')
    await client.query('BEGIN')
    await client.query('TRUNCATE TABLE resources RESTART IDENTITY CASCADE')
    await client.query('TRUNCATE TABLE needs RESTART IDENTITY CASCADE')
    await client.query('COMMIT')
    console.log('Truncate complete')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Truncate failed:', err.message)
    process.exit(2)
  } finally {
    client.release()
    await pool.end()
  }
}

if(require.main === module) truncate()

module.exports = { truncate }
