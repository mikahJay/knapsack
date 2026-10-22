/// <reference types="node" />

import { test, expect, type BrowserContext } from '@playwright/test';

const DEMO_USER = {
  id: '44444444-4444-4444-4444-444444444444',
  email: 'demo@knapsack.test',
  name: 'Demo User',
  provider: 'local',
  is_admin: false,
} as const;

const NEED_ID = '11111111-1111-1111-1111-111111111111';
const RESOURCE_ID = '22222222-2222-2222-2222-222222222222';
const MATCH_ID = '33333333-3333-3333-3333-333333333333';

const DEMO_NEED_TITLE = 'Winter shelter cot request';

/** Pause so the recorder can rest on each step (milliseconds). Override with DEMO_STEP_PAUSE_MS. */
function stepPauseMs(): number {
  const raw = process.env.DEMO_STEP_PAUSE_MS;
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return 2000;
}

async function pauseBeat(page: { waitForTimeout: (ms: number) => Promise<void> }): Promise<void> {
  await page.waitForTimeout(stepPauseMs());
}

const RESOURCE_ROW = {
  id: RESOURCE_ID,
  title: 'Folding cots — warehouse bin',
  description: 'Drafted from a warehouse shelf photo.',
  status: 'available',
  is_public: true,
  quantity: 4,
  available_until: null,
  owner_id: DEMO_USER.id,
  created_at: '2026-05-01T11:58:00.000Z',
  updated_at: '2026-05-01T11:58:00.000Z',
  photo: null,
};

const DEMO_NEED = {
  id: NEED_ID,
  title: DEMO_NEED_TITLE,
  description: 'Shelters need additional folding cots for cold-weather capacity.',
  status: 'open',
  is_public: true,
  quantity: 8,
  needed_by: '2026-12-01',
  owner_id: DEMO_USER.id,
  created_at: '2026-05-01T12:01:00.000Z',
  updated_at: '2026-05-01T12:01:00.000Z',
};

const DEMO_MATCH = {
  id: MATCH_ID,
  need_id: NEED_ID,
  resource_id: RESOURCE_ID,
  score: 0.91,
  rationale: 'Shared cot / shelter supply category with aligned quantities.',
  strategy: 'demo',
  matched_at: '2026-05-01T12:02:00.000Z',
  need_title: DEMO_NEED_TITLE,
  need_status: 'open',
  need_owner_id: DEMO_USER.id,
  resource_title: RESOURCE_ROW.title,
  resource_status: 'available',
  resource_owner_id: '55555555-5555-5555-5555-555555555555',
  seen_at: null as string | null,
  pair_status: 'open' as const,
  my_action: null as string | null,
  my_action_details: null as string | null,
  my_action_updated_at: null as string | null,
  counterpart_action: null as string | null,
  counterpart_action_details: null as string | null,
  counterpart_action_updated_at: null as string | null,
};

async function installApiMock(context: BrowserContext) {
  let matchVisible = false;

  await context.route(
    (url) => url.hostname === 'localhost' && url.port === '4000',
    async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (method === 'GET' && path === '/auth/me') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEMO_USER) });
      }

      if (method === 'GET' && path === '/api/matches/unseen-count') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ count: matchVisible ? 1 : 0 }),
        });
      }

      if (method === 'POST' && path === '/api/matches/seen') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, marked: 1 }),
        });
      }

      if (method === 'GET' && path === '/api/matches') {
        const list = matchVisible ? [DEMO_MATCH] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) });
      }

      const msgPath = path.match(/^\/api\/matches\/([^/]+)\/messages$/);
      if (method === 'GET' && msgPath) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (method === 'POST' && msgPath) {
        const body = JSON.parse(req.postData() ?? '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '66666666-6666-6666-6666-666666666666',
            user_id: DEMO_USER.id,
            body: typeof body.body === 'string' ? body.body : '',
            created_at: new Date().toISOString(),
          }),
        });
      }

      const actionPath = path.match(/^\/api\/matches\/([^/]+)\/actions$/);
      if (method === 'POST' && actionPath) {
        const body = JSON.parse(req.postData() ?? '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            message: 'Action saved',
            matchId: actionPath[1],
            action: body.action ?? 'clarify',
            details: body.details ?? null,
            pairStatus: 'in_conversation',
          }),
        });
      }

      if (method === 'POST' && path === '/api/resources/import/photo/preview') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'allow',
            draft: {
              title: RESOURCE_ROW.title,
              description: RESOURCE_ROW.description,
              quantity: RESOURCE_ROW.quantity,
              status: 'available',
              is_public: true,
              available_until: null,
              evidence_status: 'photo_attached',
            },
            diagnostics: {
              provider: 'stub',
              model: 'playwright-demo',
              usedVision: true,
              latencyMs: 1,
              moderationVerdict: 'safe',
              relevanceVerdict: 'resource',
              extractedTextPreview: 'COTS · BIN A-14',
              detectionsCount: 1,
            },
          }),
        });
      }

      if (method === 'POST' && path === '/api/resources/import/commit') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([RESOURCE_ROW]),
        });
      }

      if (method === 'GET' && path === '/api/resources') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([RESOURCE_ROW]),
        });
      }

      if (method === 'POST' && path === '/api/needs') {
        matchVisible = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(DEMO_NEED),
        });
      }

      if (method === 'GET' && path === '/api/needs') {
        const list = matchVisible ? [DEMO_NEED] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) });
      }

      if (method === 'GET' && path.startsWith('/api/needs/search')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }

      if (method === 'GET' && path.startsWith('/api/resources/search')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }

      console.warn('[demo-video mock] unmatched', method, path);
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'demo mock miss: ' + path }),
      });
    }
  );
}

test.describe('demo recording', () => {
  test('record product demo (mock APIs)', async ({ page, context }) => {
    await installApiMock(context);

    await page.goto('/resources/import');

    await expect(page.getByRole('heading', { name: 'Bulk Import Resources' })).toBeVisible();
    await pauseBeat(page);

    await page.locator('#bulk-resource-photo').setInputFiles({
      name: 'shelf-demo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
        0x00, 0x00, 0xff, 0xd9,
      ]),
    });
    await pauseBeat(page);

    await page.getByRole('button', { name: 'Preview From Photo' }).click();

    await expect(page.getByText('Review Drafts (1)', { exact: false })).toBeVisible({ timeout: 30_000 });
    await pauseBeat(page);

    await page.getByRole('button', { name: /^Import 1 Resources/ }).click();

    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible({ timeout: 30_000 });
    await pauseBeat(page);

    await page.getByRole('link', { name: 'Needs', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Needs' })).toBeVisible();
    await pauseBeat(page);
    await page.getByRole('link', { name: /^\+ New Need/ }).click();

    await expect(page.getByRole('heading', { name: 'New Need' })).toBeVisible();
    await pauseBeat(page);

    await page.locator('#title').fill(DEMO_NEED_TITLE);
    await page.locator('#description').fill(DEMO_NEED.description ?? '');
    await page.getByLabel(/Make public/i).check();
    await pauseBeat(page);

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('heading', { name: 'Needs' })).toBeVisible({ timeout: 30_000 });
    await pauseBeat(page);

    // Layout sets aria-label to "Matches (n)" when unseen matches exist — not plain "Matches".
    await page.getByRole('link', { name: /^Matches/ }).click();

    await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible();
    await expect(page.getByRole('link', { name: DEMO_NEED_TITLE })).toBeVisible();
    await pauseBeat(page);

    // Match cards are tall; ensure action buttons below the rationale are scrolled into view.
    const matchRow = page.getByRole('listitem').filter({ hasText: DEMO_NEED_TITLE });
    const clarify = matchRow.getByRole('button', { name: 'Clarify' });
    await clarify.scrollIntoViewIfNeeded();
    await pauseBeat(page);
    await clarify.click();

    await expect(page.getByText('Draft action: Clarification requested')).toBeVisible();
    await pauseBeat(page);

    await page.getByPlaceholder(/optional notes/).fill('Can pallets ship Friday morning?');
    await pauseBeat(page);

    await page.getByRole('button', { name: 'Save action' }).click();

    await expect(page.getByText('Current workflow state: Clarification requested')).toBeVisible({ timeout: 15_000 });
    await pauseBeat(page);
  });
});
