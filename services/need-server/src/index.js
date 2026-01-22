const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 4020

app.use(bodyParser.json())

// Allow CORS for local dev web app and others
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

let needs = []

app.get('/', (req, res) => res.sendStatus(200))

// Support ALB path /need so requests routed to /need return 200 as well
app.get('/need', (req, res) => res.sendStatus(200))

app.get('/health', (req, res) => res.json({status: 'ok', service: 'need-server'}))

app.get('/needs', (req, res) => res.json(needs))

app.post('/needs', (req, res) => {
  const item = req.body
  item.id = needs.length + 1
  needs.push(item)
  res.status(201).json(item)
})

app.listen(port, () => console.log(`need-server listening on ${port}`))
