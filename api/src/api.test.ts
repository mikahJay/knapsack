import request from 'supertest';
import { createApp } from './index';

// ── DB mock (no real Postgres needed) ────────────────────────
jest.mock('./db', () => ({
  pool: { query: jest.fn(), connect: jest.fn(), on: jest.fn() },
  query: jest.fn(),
  queryOne: jest.fn(),
}));

// ── Session store: use in-memory store instead of Postgres ───
jest.mock('connect-pg-simple', () => {
  return () => {
    const session = require('express-session');
    return session.MemoryStore;
  };
});

import { query as _query, queryOne as _queryOne, pool as _pool } from './db';
const mockQuery = _query as jest.Mock;
const mockQueryOne = _queryOne as jest.Mock;
const mockPool = _pool as unknown as { query: jest.Mock };

const BOB = { id: 'bob-uuid', email: 'bob@local.dev', name: 'Bob', provider: 'local' };

// ── Helper: create a logged-in supertest agent ────────────────
async function makeLoggedInAgent() {
  const app = createApp();
  const agent = request.agent(app);

  // upsertBypassUser: existing user found on first queryOne
  mockQueryOne.mockResolvedValueOnce(BOB);
  await agent.post('/auth/login');
  return agent;
}

// ── Auth tests ────────────────────────────────────────────────
describe('Auth — non-prod bypass', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /health returns isProd:false', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.isProd).toBe(false);
  });

  it('GET /auth/me returns 401 when not logged in', async () => {
    const res = await request(createApp()).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /auth/login logs in as bob and returns user', async () => {
    mockQueryOne.mockResolvedValueOnce(BOB);
    const res = await request(createApp()).post('/auth/login');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('bob@local.dev');
  });

  it('POST /auth/login creates bob if not found yet', async () => {
    mockQueryOne.mockResolvedValueOnce(undefined); // SELECT → not found
    mockQuery.mockResolvedValueOnce([BOB]);         // INSERT → created
    const res = await request(createApp()).post('/auth/login');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('bob@local.dev');
  });

  it('GET /auth/me returns user after login', async () => {
    mockQueryOne.mockResolvedValueOnce(BOB); // login
    // deserializeUser call on /auth/me
    mockQueryOne.mockResolvedValueOnce(BOB);
    const agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);
    const res = await agent.get('/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('bob@local.dev');
  });
});

// ── Needs CRUD ────────────────────────────────────────────────
describe('Needs CRUD — unauthenticated returns 401', () => {
  it('GET /api/needs → 401', async () => {
    const res = await request(createApp()).get('/api/needs');
    expect(res.status).toBe(401);
  });
  it('POST /api/needs → 401', async () => {
    const res = await request(createApp()).post('/api/needs').send({ title: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('Needs CRUD — authenticated', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    jest.clearAllMocks();
    agent = await makeLoggedInAgent();
    // All subsequent queryOne calls (e.g. deserializeUser) return BOB
    mockQueryOne.mockResolvedValue(BOB);
  });

  it('GET /api/needs returns list', async () => {
    const needs = [{ id: 'n1', title: 'Test Need', status: 'open' }];
    mockQuery.mockResolvedValueOnce(needs);

    const res = await agent.get('/api/needs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(needs);
  });

  it('POST /api/needs creates a need', async () => {
    const need = { id: 'n2', title: 'New Need', status: 'open', owner_id: BOB.id };
    mockQueryOne
      .mockResolvedValueOnce(BOB)  // deserializeUser
      .mockResolvedValueOnce(need); // INSERT returning

    const res = await agent.post('/api/needs').send({ title: 'New Need' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Need');
  });

  it('POST /api/needs returns 400 when title is missing', async () => {
    const res = await agent.post('/api/needs').send({});
    expect(res.status).toBe(400);
  });

  it('DELETE /api/needs/:id returns 404 for unknown id', async () => {
    mockQuery.mockResolvedValueOnce([]); // DELETE returning nothing
    const res = await agent.delete('/api/needs/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

// ── Resources CRUD ────────────────────────────────────────────
describe('Resources CRUD — unauthenticated returns 401', () => {
  it('GET /api/resources → 401', async () => {
    const res = await request(createApp()).get('/api/resources');
    expect(res.status).toBe(401);
  });
  it('POST /api/resources → 401', async () => {
    const res = await request(createApp()).post('/api/resources').send({ title: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('Resources CRUD — authenticated', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    jest.clearAllMocks();
    agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);
  });

  it('GET /api/resources returns list', async () => {
    const resources = [{ id: 'r1', title: 'A Resource', status: 'available' }];
    mockQuery.mockResolvedValueOnce(resources);

    const res = await agent.get('/api/resources');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(resources);
  });

  it('POST /api/resources creates a resource', async () => {
    const resource = { id: 'r2', title: 'New Resource', status: 'available', owner_id: BOB.id };
    mockQueryOne
      .mockResolvedValueOnce(BOB)      // deserializeUser
      .mockResolvedValueOnce(resource); // INSERT returning

    const res = await agent.post('/api/resources').send({ title: 'New Resource' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Resource');
  });

  it('POST /api/resources returns 400 when title is missing', async () => {
    const res = await agent.post('/api/resources').send({});
    expect(res.status).toBe(400);
  });
});

// ── Health checks ─────────────────────────────────────────────
describe('Health checks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /health returns shallow health fields', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.isProd).toBe(false);
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /health/deep returns 200 and db.ok when DB is reachable', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(createApp()).get('/health/deep');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.checks.db.ok).toBe(true);
    expect(typeof res.body.checks.db.latencyMs).toBe('number');
    expect(res.body.checks.db.error).toBeUndefined();
  });

  it('GET /health/deep returns 503 and db error when DB is unreachable', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(createApp()).get('/health/deep');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.checks.db.ok).toBe(false);
    expect(res.body.checks.db.error).toBe('connection refused');
    expect(res.body.checks.db.latencyMs).toBeUndefined();
  });
});
