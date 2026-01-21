#!/usr/bin/env node
// Simple smoke test: GET / and expect HTTP 200

const { URL } = require('url')

const urlStr = process.argv[2] || process.env.BASE_URL || 'http://localhost:5173/'
const target = new URL(urlStr)
const lib = target.protocol === 'https:' ? require('https') : require('http')

const options = {
  hostname: target.hostname,
  port: target.port || (target.protocol === 'https:' ? 443 : 80),
  path: target.pathname + target.search,
  method: 'GET',
  timeout: 5000,
}

const req = lib.request(options, (res) => {
  const { statusCode } = res
  if (statusCode === 200) {
    console.log(`OK: ${urlStr} returned ${statusCode}`)
    process.exit(0)
  } else {
    console.error(`FAIL: ${urlStr} returned ${statusCode}`)
    process.exit(2)
  }
})

req.on('error', (err) => {
  console.error('ERROR:', err.message)
  process.exit(2)
})

req.on('timeout', () => {
  console.error('ERROR: request timed out')
  req.destroy()
  process.exit(2)
})

req.end()
