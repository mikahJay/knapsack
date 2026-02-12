const express = require('express')
const app = express()
const port = process.env.PORT || 4001

// Allow CORS for local dev web app and others
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.get('/health', (req, res) => res.json({status: 'ok', service: 'auth-server'}))
app.get('/auth/health', (req, res) => res.json({ status: 'ok', service: 'auth-server' }))
// Support ALB path /auth so requests routed to /auth return 200 as well
app.get('/auth', (req, res) => res.sendStatus(200))

app.listen(port, () => console.log(`auth-server listening on ${port}`))
