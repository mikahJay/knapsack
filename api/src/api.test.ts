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
const mockPool = _pool as unknown as { query: jest.Mock; connect: jest.Mock };

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

  it('GET /health returns ok:true', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
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

  it('PUT /api/needs/:id creates a new immutable version', async () => {
    const existingNeed = {
      id: 'n1',
      title: 'Old Need',
      description: 'old',
      status: 'open',
      is_public: false,
      quantity: 1,
      needed_by: null,
      owner_id: BOB.id,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const nextNeed = { ...existingNeed, id: 'n2', title: 'Updated Need' };

    mockQueryOne.mockResolvedValueOnce(BOB).mockResolvedValueOnce(existingNeed);
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [nextNeed] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValueOnce(client);

    const res = await agent.put('/api/needs/n1').send({ title: 'Updated Need' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('n2');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('POST /api/needs/import/commit creates reviewed drafts', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'n-import-1', title: 'Imported Need 1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'n-import-2', title: 'Imported Need 2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValueOnce(client);

    const res = await agent.post('/api/needs/import/commit').send({
      items: [
        { title: 'Imported Need 1', quantity: 1, status: 'open', is_public: true },
        { title: 'Imported Need 2', quantity: 2, status: 'open', is_public: true },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
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

// ── Matches ───────────────────────────────────────────────────
describe('Matches — authenticated', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    jest.clearAllMocks();
    agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);
  });

  it('GET /api/matches returns current user matches ordered by latest first', async () => {
    const matches = [
      {
        id: 'm1',
        need_id: 'n1',
        resource_id: 'r1',
        score: 0.98,
        rationale: 'Strong fit',
        strategy: 'claude',
        matched_at: '2026-04-15T09:00:00Z',
        need_title: 'Need Alpha',
        need_status: 'open',
        need_owner_id: BOB.id,
        resource_title: 'Resource Alpha',
        resource_status: 'available',
        resource_owner_id: 'other-uuid',
        seen_at: null,
        pair_status: 'open',
        my_action: null,
        my_action_details: null,
        my_action_updated_at: null,
        counterpart_action: null,
        counterpart_action_details: null,
        counterpart_action_updated_at: null,
      },
    ];
    mockQuery.mockResolvedValueOnce(matches);

    const res = await agent.get('/api/matches');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(matches);
  });

  it('GET /api/matches/unseen-count returns count payload', async () => {
    mockQuery.mockResolvedValueOnce([{ count: '2' }]);

    const res = await agent.get('/api/matches/unseen-count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 2 });
  });

  it('POST /api/matches/seen marks matches as seen', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'm1' }])
      .mockResolvedValueOnce([]);

    const res = await agent.post('/api/matches/seen').send({ matchIds: ['m1'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, marked: 1 });
  });

  it('POST /api/matches/seen returns 400 for non-array payload', async () => {
    const res = await agent.post('/api/matches/seen').send({ matchIds: 'm1' });
    expect(res.status).toBe(400);
  });

  it('POST /api/matches/:id/actions returns 400 for invalid action', async () => {
    const res = await agent.post('/api/matches/m1/actions').send({ action: 'nope' });
    expect(res.status).toBe(400);
  });

  it('POST /api/matches/:id/actions returns 404 when user cannot access match', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await agent.post('/api/matches/missing/actions').send({ action: 'clarify' });
    expect(res.status).toBe(404);
  });

  it('POST /api/matches/:id/actions upserts action and updates pair status', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          id: 'm1',
          pair_status: 'open',
          need_owner_id: BOB.id,
          resource_owner_id: 'other-uuid',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ user_id: BOB.id, action: 'rejected' }])
      .mockResolvedValueOnce([]);

    const res = await agent
      .post('/api/matches/m1/actions')
      .send({ action: 'rejected', details: 'Not a fit' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      matchId: 'm1',
      action: 'rejected',
      details: 'Not a fit',
      pairStatus: 'closed_rejected',
    });
    expect(mockQuery).toHaveBeenCalledTimes(4);
  });

  it('POST /api/matches/:id/actions returns 409 when match already closed', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        id: 'm1',
        pair_status: 'closed_rejected',
        need_owner_id: BOB.id,
        resource_owner_id: 'other-uuid',
      },
    ]);

    const res = await agent.post('/api/matches/m1/actions').send({ action: 'soft_yes', details: 'Still interested' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'Match is already closed' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('POST /api/matches/:id/actions sets mutual_interest when both owners soft_yes', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          id: 'm1',
          pair_status: 'in_conversation',
          need_owner_id: BOB.id,
          resource_owner_id: 'other-uuid',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { user_id: BOB.id, action: 'soft_yes' },
        { user_id: 'other-uuid', action: 'soft_yes' },
      ])
      .mockResolvedValueOnce([]);

    const res = await agent.post('/api/matches/m1/actions').send({ action: 'soft_yes', details: 'Works for me' });

    expect(res.status).toBe(200);
    expect(res.body.pairStatus).toBe('mutual_interest');
    expect(mockQuery).toHaveBeenCalledTimes(4);
  });

  it('GET /api/matches/:id/messages returns list', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'm1' }])
      .mockResolvedValueOnce([
        { id: 'msg1', user_id: BOB.id, body: 'Hello', created_at: '2026-01-01T00:00:00Z' },
      ]);

    const res = await agent.get('/api/matches/m1/messages');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'msg1', user_id: BOB.id, body: 'Hello', created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('POST /api/matches/:id/messages creates a message', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'm1' }])
      .mockResolvedValueOnce([
        { id: 'msg1', user_id: BOB.id, body: 'Hi there', created_at: '2026-01-02T00:00:00Z' },
      ]);

    const res = await agent.post('/api/matches/m1/messages').send({ body: 'Hi there' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ body: 'Hi there', user_id: BOB.id });
    expect(mockQuery).toHaveBeenCalledTimes(2);
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

  it('PUT /api/resources/:id creates a new immutable version', async () => {
    const existingResource = {
      id: 'r1',
      title: 'Old Resource',
      description: 'old',
      status: 'available',
      is_public: false,
      quantity: 1,
      available_until: null,
      owner_id: BOB.id,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const nextResource = { ...existingResource, id: 'r2', title: 'Updated Resource' };

    mockQueryOne.mockResolvedValueOnce(BOB).mockResolvedValueOnce(existingResource);
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [nextResource] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValueOnce(client);

    const res = await agent.put('/api/resources/r1').send({ title: 'Updated Resource' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('r2');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('POST /api/resources/import/commit creates reviewed drafts', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'r-import-1', title: 'Imported Resource 1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'r-import-2', title: 'Imported Resource 2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValueOnce(client);

    const res = await agent.post('/api/resources/import/commit').send({
      items: [
        { title: 'Imported Resource 1', quantity: 1, status: 'available', is_public: true },
        { title: 'Imported Resource 2', quantity: 2, status: 'available', is_public: true },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
  });
});

// ── Health checks ─────────────────────────────────────────────
describe('Health checks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /health returns shallow health fields', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // isProd is intentionally not exposed (reduces information leakage)
    expect(res.body.isProd).toBeUndefined();
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

  it('GET /health/deep returns 503 without leaking db error when DB is unreachable', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(createApp()).get('/health/deep');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.checks.db.ok).toBe(false);
    // DB error details must NOT be exposed to unauthenticated callers
    expect(res.body.checks.db.error).toBeUndefined();
    expect(res.body.checks.db.latencyMs).toBeUndefined();
  });
});
