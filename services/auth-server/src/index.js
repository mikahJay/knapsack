const express = require('express')
const app = express()
const port = process.env.PORT || 4001

app.get('/health', (req, res) => res.json({status: 'ok', service: 'auth-server'}))

app.get('/', (req, res) => {
  res.json({message: 'auth-server scaffold — SSO endpoints to be implemented'})
})

app.listen(port, () => console.log(`auth-server listening on ${port}`))
