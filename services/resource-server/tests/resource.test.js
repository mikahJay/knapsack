import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createRequire } from 'module'

// Require the real auth module and override its exports so the app (CommonJS) uses our stubs
const require = createRequire(import.meta.url)
const authModule = require('../src/auth')
authModule.verifyIdToken = async () => ({ email: 'tester@example.com', name: 'Tester', sub: 'sub-1' })
authModule.authOptional = (req, res, next) => { req.user = { email: 'tester@example.com', name: 'Tester', sub: 'sub-1' }; return next() }
authModule.authRequired = (req, res, next) => { req.user = { email: 'tester@example.com', name: 'Tester', sub: 'sub-1' }; return next() }

process.env.GOOGLE_CLIENT_ID = 'test-client'

// Prepare mocks and import the CommonJS app module; replace its pool.query with mock
const mockQuery = vi.fn()
const moduleUnderTest = require('../src/index.js')
moduleUnderTest.pool.query = mockQuery
const { app } = moduleUnderTest

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resource-server endpoints', () => {
  it('GET /resources returns rows from DB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', name: 'thing' }] })
    const res = await request(app).get('/resources')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id: '1', name: 'thing' }])
    expect(mockQuery).toHaveBeenCalled()
  })

  it('POST /resources without name returns 400', async () => {
    const res = await request(app).post('/resources').send({ description: 'no name' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('GET /resources/:id returns 404 when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/resources/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
    expect(mockQuery).toHaveBeenCalled()
  })

  it('GET /me/resources returns user resources when authenticated', async () => {
    // authRequired will verify token using mocked OAuth2Client
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '2', name: 'mine', owner: 'tester@example.com' }] })
    const res = await request(app).get('/me/resources').set('Authorization', 'Bearer faketoken')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id: '2', name: 'mine', owner: 'tester@example.com' }])
    expect(mockQuery).toHaveBeenCalled()
  })

  it('POST /resources/:id/toggle-public updates public flag', async () => {
    const updated = { id: '3', name: 'toggled', public: true }
    mockQuery.mockResolvedValueOnce({ rows: [updated] })
    const res = await request(app).post('/resources/3/toggle-public').send({ public: true })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(updated)
    expect(mockQuery).toHaveBeenCalled()
  })
})
