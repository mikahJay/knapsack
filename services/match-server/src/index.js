const express = require('express')
const bodyParser = require('body-parser')
const { authRequired } = require('./auth')
const { pool, initDb } = require('./db')

const app = express()
const port = process.env.PORT || 4030

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
const domainName = process.env.DOMAIN_NAME || 'knap-sack.com'
const defaultOrigins = [`https://${domainName}`, `https://www.${domainName}`]
const envOrigins = (process.env.WEB_APP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const webAppOrigin = process.env.WEB_APP_ORIGIN ? [process.env.WEB_APP_ORIGIN] : []
const allowedOrigins = [...new Set([...webAppOrigin, ...envOrigins, ...defaultOrigins])]
const allowedHosts = new Set([
  domainName,
  `www.${domainName}`
])
allowedOrigins.forEach(origin => {
  try {
    const url = new URL(origin)
    if (url.hostname) allowedHosts.add(url.hostname)
  } catch (err) {
    // Ignore invalid origin strings
  }
})

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  // Permit ALB health checks (no Origin header) to reach /health
  if (req.path === '/health') return next()
  const origin = req.headers.origin
  if (origin) {
    try {
      const url = new URL(origin)
      const allowed = allowedHosts.has(url.hostname)
      console.log(`Origin check: received="${origin}" host="${url.hostname}" allowed_hosts="${[...allowedHosts].join(',')}" path="${req.path}"`)
      if (!allowed) return res.status(403).json({ error: 'forbidden origin' })
    } catch (err) {
      console.log(`Origin check: received="${origin}" invalid origin path="${req.path}"`)
      return res.status(403).json({ error: 'forbidden origin' })
    }
  }
  next()
})

// Require a valid Google ID token for all routes (except preflight). This ensures the
// request originates from an authenticated web-app user.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  // Allow health checks to bypass authentication
  if (req.path === '/health') return next()
  return authRequired(req, res, next)
})

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'match-server' }))

// Get match candidates for a specific need
app.get('/match/needs/:needId/candidates', async (req, res) => {
  const { needId } = req.params
  
  // Hardcoded random matches for now - no database query
  const resourceNames = [
    'Winter Clothing Bundle',
    'Food Supplies Package',
    'Medical Equipment Set',
    'Educational Materials',
    'Furniture Collection',
    'Kitchen Essentials',
    'Baby Care Items',
    'Hygiene Products Set',
    'Sports Equipment',
    'Tech Devices Bundle'
  ]
  
  const matchReasons = [
    'Geographic proximity and similar category match',
    'High compatibility based on quantity and timing',
    'Strong semantic match in description keywords',
    'Donor has history of similar successful matches',
    'Urgent need timeframe aligns with availability',
    'Category and subcategory exact match',
    'Machine learning confidence score above threshold',
    'Community preference and prior engagement',
    'Seasonal demand patterns indicate good fit',
    'Logistics efficiency and cost optimization'
  ]
  
  // Generate 0-5 random matches
  const numMatches = Math.floor(Math.random() * 6)
  const matches = []
  
  for (let i = 0; i < numMatches; i++) {
    const randomHoursAgo = Math.random() * 24
    const createdAt = new Date(Date.now() - randomHoursAgo * 60 * 60 * 1000)
    
    matches.push({
      id: `match-${Math.random().toString(36).substr(2, 9)}`,
      need_id: needId,
      resource_id: `resource-${Math.random().toString(36).substr(2, 9)}`,
      resource_name: resourceNames[Math.floor(Math.random() * resourceNames.length)],
      match_reason: matchReasons[Math.floor(Math.random() * matchReasons.length)],
      match_statistics: {
        confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        score: Math.floor(Math.random() * 30) + 70 // 70 to 100
      },
      created_at: createdAt.toISOString(),
      selected: false
    })
  }
  
  // Sort by created_at descending (newest first)
  matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
  res.json(matches)
})

// Match a need against available resources
// Returns hard-coded dummy resources for now
app.post('/match/needs', (req, res) => {
  const { needId, needData } = req.body
  
  // Placeholder: return dummy matched resources
  const dummyMatches = [
    {
      id: 'resource-123',
      title: 'Canned Goods Bundle',
      description: 'Mixed canned vegetables and fruits',
      category: 'food',
      quantity: 10,
      unit: 'items',
      userId: 'user-456',
      createdAt: new Date(),
      matchScore: 0.95
    },
    {
      id: 'resource-124',
      title: 'Blankets',
      description: 'Warm winter blankets',
      category: 'household',
      quantity: 5,
      unit: 'items',
      userId: 'user-457',
      createdAt: new Date(),
      matchScore: 0.85
    }
  ]
  
  res.json({ needId, matches: dummyMatches })
})

// Match a resource against available needs
// Returns hard-coded dummy needs for now
app.post('/match/resources', (req, res) => {
  const { resourceId, resourceData } = req.body
  
  // Placeholder: return dummy matched needs
  const dummyMatches = [
    {
      id: 'need-789',
      title: 'Food for families',
      description: 'Families in need of basic food staples',
      category: 'food',
      quantity: 50,
      unit: 'people',
      userId: 'user-101',
      createdAt: new Date(),
      matchScore: 0.92
    },
    {
      id: 'need-790',
      title: 'Winter shelter supplies',
      description: 'Blankets and warm clothing needed',
      category: 'household',
      quantity: 20,
      unit: 'items',
      userId: 'user-102',
      createdAt: new Date(),
      matchScore: 0.88
    }
  ]
  
  res.json({ resourceId, matches: dummyMatches })
})

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

initDb().then(() => {
  app.listen(port, () => {
    console.log(`Match server listening on port ${port}`)
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
