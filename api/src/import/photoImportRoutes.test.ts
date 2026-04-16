import request from 'supertest';
import { createApp } from '../index';
import { PhotoImportServices, setPhotoImportServicesForTests } from './moderation';

jest.mock('../db', () => ({
  pool: { query: jest.fn(), connect: jest.fn(), on: jest.fn() },
  query: jest.fn(),
  queryOne: jest.fn(),
}));

jest.mock('connect-pg-simple', () => {
  return () => {
    const session = require('express-session');
    return session.MemoryStore;
  };
});

import { queryOne as _queryOne } from '../db';
const mockQueryOne = _queryOne as jest.Mock;

const BOB = { id: 'bob-uuid', email: 'bob@local.dev', name: 'Bob', provider: 'local' };

function makeServices(overrides: Partial<PhotoImportServices> = {}): PhotoImportServices {
  return {
    async getModerationVerdict() {
      return 'safe';
    },
    async getRelevanceVerdict() {
      return 'resource';
    },
    async extractText() {
      return '';
    },
    ...overrides,
  };
}

async function makeLoggedInAgent() {
  const app = createApp();
  const agent = request.agent(app);
  mockQueryOne.mockResolvedValueOnce(BOB);
  await agent.post('/auth/login');
  return agent;
}

describe('Resource photo import preview route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPhotoImportServicesForTests();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(createApp()).post('/api/resources/import/photo/preview').send({
      file: { mimeType: 'image/jpeg', sizeBytes: 1024, width: 1200, height: 1200 },
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 for unsupported MIME types', async () => {
    const agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);

    const res = await agent.post('/api/resources/import/photo/preview').send({
      file: { mimeType: 'application/pdf', sizeBytes: 1024, width: 1200, height: 1200 },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ status: 'reject', code: 'UNSUPPORTED_MIME' }));
  });

  it('returns 400 for over-limit file size', async () => {
    const agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);

    const res = await agent.post('/api/resources/import/photo/preview').send({
      file: { mimeType: 'image/jpeg', sizeBytes: 11 * 1024 * 1024, width: 1200, height: 1200 },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ status: 'reject', code: 'FILE_TOO_LARGE' }));
  });

  it('returns 400 for undersized photo dimensions', async () => {
    const agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);

    const res = await agent.post('/api/resources/import/photo/preview').send({
      file: { mimeType: 'image/jpeg', sizeBytes: 1024, width: 320, height: 320 },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ status: 'reject', code: 'DIMENSIONS_TOO_SMALL' }));
  });

  it('returns 422 when moderation rejects the image', async () => {
    const agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);
    setPhotoImportServicesForTests(makeServices({
      async getModerationVerdict() {
        return 'unsafe';
      },
    }));

    const res = await agent.post('/api/resources/import/photo/preview').send({
      file: { mimeType: 'image/jpeg', sizeBytes: 1024, width: 1200, height: 1200 },
    });

    expect(res.status).toBe(422);
    expect(res.body).toEqual(expect.objectContaining({ status: 'reject', code: 'MODERATION_UNSAFE' }));
    expect(res.body).toEqual(expect.objectContaining({ diagnostics: expect.any(Object) }));
  });

  it('returns 200 with a draft preview when all gates pass', async () => {
    const agent = await makeLoggedInAgent();
    mockQueryOne.mockResolvedValue(BOB);
    setPhotoImportServicesForTests(makeServices());

    const res = await agent.post('/api/resources/import/photo/preview').send({
      file: { mimeType: 'image/jpeg', sizeBytes: 1024, width: 1200, height: 1200 },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      status: 'allow',
      draft: {
        title: 'Photo resource draft',
        description: null,
        quantity: 1,
        status: 'available',
        is_public: false,
        available_until: null,
        evidence_status: 'photo_attached',
      },
      diagnostics: expect.any(Object),
    }));
  });
});