const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 4010

app.use(bodyParser.json())

// Allow CORS for local dev web app and others
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

let resources = []

app.get('/', (req, res) => res.sendStatus(200))

app.get('/health', (req, res) => res.json({status: 'ok', service: 'resource-server'}))

// Support ALB path /resource so requests routed to /resource return 200 as well
app.get('/resource', (req, res) => res.sendStatus(200))

app.get('/resources', (req, res) => res.json(resources))

app.post('/resources', (req, res) => {
  const item = req.body
  item.id = resources.length + 1
  resources.push(item)
  res.status(201).json(item)
})

app.listen(port, () => console.log(`resource-server listening on ${port}`))
