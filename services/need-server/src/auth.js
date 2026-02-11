const { OAuth2Client } = require('google-auth-library')

const googleClientId = process.env.GOOGLE_CLIENT_ID || null
const oauth2Client = googleClientId ? new OAuth2Client(googleClientId) : null

async function verifyIdToken(idToken) {
  if (!oauth2Client) throw new Error('GOOGLE_CLIENT_ID not configured')
  const ticket = await oauth2Client.verifyIdToken({ idToken, audience: googleClientId })
  return ticket.getPayload()
}

// middleware: if Authorization: Bearer <id_token> header present, verify and attach req.user
async function authOptional(req, res, next){
  const auth = req.headers.authorization || ''
  if(!auth) return next()
  const m = auth.match(/^Bearer (.+)$/)
  if(!m) return res.status(400).json({ error: 'invalid authorization header' })
  const token = m[1]
  try{
    const payload = await verifyIdToken(token)
    req.user = { email: payload.email, name: payload.name, sub: payload.sub }
    return next()
  }catch(err){
    console.error('id token verify failed (authOptional)', {
      message: err && err.message,
      code: err && err.code,
      errno: err && err.errno,
      syscall: err && err.syscall,
      hostname: err && err.hostname,
      stack: err && err.stack
    })
    return res.status(401).json({ error: 'invalid id_token' })
  }
}

async function authRequired(req, res, next){
  const auth = req.headers.authorization || ''
  if(!auth){
    console.warn('auth header missing', { path: req.path, origin: req.headers.origin || '' })
    return res.status(401).json({ error: 'missing or invalid authorization header' })
  }
  const m = auth.match(/^Bearer (.+)$/)
  if(!m){
    const prefix = auth.split(' ')[0]
    console.warn('auth header malformed', { path: req.path, origin: req.headers.origin || '', prefix, length: auth.length })
    return res.status(401).json({ error: 'missing or invalid authorization header' })
  }
  const token = m[1]
  try{
    const payload = await verifyIdToken(token)
    req.user = { email: payload.email, name: payload.name, sub: payload.sub }
    return next()
  }catch(err){
    console.error('id token verify failed (authRequired)', {
      message: err && err.message,
      code: err && err.code,
      errno: err && err.errno,
      syscall: err && err.syscall,
      hostname: err && err.hostname,
      stack: err && err.stack
    })
    return res.status(401).json({ error: 'invalid id_token' })
  }
}

module.exports = { verifyIdToken, authOptional, authRequired }
