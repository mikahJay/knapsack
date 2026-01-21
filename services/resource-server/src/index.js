const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 4010

app.use(bodyParser.json())

let resources = []

app.get('/health', (req, res) => res.json({status: 'ok', service: 'resource-server'}))

app.get('/resources', (req, res) => res.json(resources))

app.post('/resources', (req, res) => {
  const item = req.body
  item.id = resources.length + 1
  resources.push(item)
  res.status(201).json(item)
})

app.listen(port, () => console.log(`resource-server listening on ${port}`))
