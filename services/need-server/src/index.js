const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 4020

app.use(bodyParser.json())

let needs = []

app.get('/', (req, res) => res.sendStatus(200))

app.get('/health', (req, res) => res.json({status: 'ok', service: 'need-server'}))

app.get('/needs', (req, res) => res.json(needs))

app.post('/needs', (req, res) => {
  const item = req.body
  item.id = needs.length + 1
  needs.push(item)
  res.status(201).json(item)
})

app.listen(port, () => console.log(`need-server listening on ${port}`))
