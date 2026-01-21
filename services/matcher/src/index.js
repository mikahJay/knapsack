const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 4030

app.use(bodyParser.json())

app.get('/health', (req, res) => res.json({status: 'ok', service: 'matcher'}))

// Placeholder match endpoint — later we'll implement AI/custom logic here
app.post('/match', (req, res) => {
  const { resources = [], needs = [] } = req.body
  // naive stub: pair first resource with first need
  const matches = []
  if (resources.length && needs.length) {
    matches.push({ resource: resources[0], need: needs[0], score: 0.5 })
  }
  res.json({ matches })
})

app.listen(port, () => console.log(`matcher listening on ${port}`))
