const { OAuth2Client } = require('google-auth-library')

const googleClientId = process.env.GOOGLE_CLIENT_ID
const client = googleClientId ? new OAuth2Client(googleClientId) : null

// Verify a Google ID token and return the claims
async function verifyToken(token) {
  if (!client) {
    throw new Error('GOOGLE_CLIENT_ID not configured')
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    })
    return ticket.getPayload()
  } catch (err) {
    throw new Error(`Invalid token: ${err.message}`)
  }
}

// Middleware to require authenticated users (via Google ID token in Authorization header)
async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or invalid authorization header' })
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix
  try {
    const claims = await verifyToken(token)
    req.user = claims
    next()
  } catch (err) {
    console.error(`Auth error: ${err.message}`)
    return res.status(401).json({ error: 'unauthorized' })
  }
}

// Middleware to optionally verify auth but don't fail if missing
async function authOptional(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const claims = await verifyToken(token)
      req.user = claims
    } catch (err) {
      console.log(`Optional auth parse failed (non-fatal): ${err.message}`)
    }
  }
  next()
}

module.exports = { verifyToken, authRequired, authOptional }
