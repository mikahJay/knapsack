/**
 * Web unit tests
 * Strategy: mock next/router, next/link, and all api calls.
 * Each component is rendered with @testing-library/react and
 * assertions are made on the resulting DOM.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Next.js stubs ─────────────────────────────────────────────
const mockPush = jest.fn();
const mockReplace = jest.fn();

const routerState = {
  query: {} as Record<string, string>,
  pathname: '/',
};

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    get query() { return routerState.query; },
    get pathname() { return routerState.pathname; },
  }),
}));

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) {
    return <a href={href} {...rest}>{children}</a>;
  };
});

// ── API stubs ─────────────────────────────────────────────────
const mockGetMe = jest.fn();
const mockListNeeds = jest.fn();
const mockDeleteNeed = jest.fn();
const mockSearchNeeds = jest.fn();
const mockCreateNeed = jest.fn();
const mockGetOnNeed = jest.fn();
const mockUpdateNeed = jest.fn();
const mockPreviewNeedImport = jest.fn();
const mockCommitNeedImport = jest.fn();
const mockListResources = jest.fn();
const mockDeleteResource = jest.fn();
const mockSearchResources = jest.fn();
const mockCreateResource = jest.fn();
const mockGetOneResource = jest.fn();
const mockUpdateResource = jest.fn();
const mockPreviewResourceImport = jest.fn();
const mockPreviewResourcePhotoImport = jest.fn();
const mockCommitResourceImport = jest.fn();
const mockLogin = jest.fn();
const mockListMatches = jest.fn();
const mockGetUnseenMatchesCount = jest.fn();
const mockMarkMatchesSeen = jest.fn();
const mockLogout = jest.fn();

const BOB = { id: 'bob-uuid', email: 'bob@example.com', name: 'Bob', provider: 'local', is_admin: false };
const NEED_1: import('./lib/api').Need = {
  id: 'n1', title: 'Need Alpha', description: 'A need', status: 'open',
  is_public: true, quantity: 1, needed_by: null, owner_id: 'bob-uuid',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
const NEED_OTHER: import('./lib/api').Need = {
  id: 'n2', title: 'Need Beta', description: null, status: 'open',
  is_public: true, quantity: 2, needed_by: null, owner_id: 'other-uuid',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
const RESOURCE_1: import('./lib/api').Resource = {
  id: 'r1', title: 'Resource Alpha', description: 'A resource', status: 'available',
  is_public: true, quantity: 3, available_until: null, owner_id: 'bob-uuid',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  photo: {
    mimeType: 'image/jpeg',
    imageBase64: 'ZmFrZS1pbWFnZS1ieXRlcw==',
    width: 1200,
    height: 800,
    focusBox: { x: 0.2, y: 0.25, width: 0.3, height: 0.4 },
    detections: [{ label: 'Mouse', confidence: 0.92, box: { x: 0.2, y: 0.25, width: 0.3, height: 0.4 } }],
  },
};
const MATCH_1: import('./lib/api').Match = {
  id: 'm1',
  need_id: 'n1',
  resource_id: 'r1',
  score: 0.95,
  rationale: 'Strong fit',
  strategy: 'claude',
  matched_at: '2026-04-15T12:00:00Z',
  need_title: 'Need Alpha',
  need_status: 'open',
  need_owner_id: 'bob-uuid',
  resource_title: 'Resource Alpha',
  resource_status: 'available',
  resource_owner_id: 'bob-uuid',
  seen_at: null,
};
const MATCH_2_SEEN: import('./lib/api').Match = {
  ...MATCH_1,
  id: 'm2',
  seen_at: '2026-04-15T12:30:00Z',
};

jest.mock('./lib/api', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  listNeeds: (...args: unknown[]) => mockListNeeds(...args),
  deleteNeed: (...args: unknown[]) => mockDeleteNeed(...args),
  searchNeeds: (...args: unknown[]) => mockSearchNeeds(...args),
  createNeed: (...args: unknown[]) => mockCreateNeed(...args),
  getOnNeed: (...args: unknown[]) => mockGetOnNeed(...args),
  updateNeed: (...args: unknown[]) => mockUpdateNeed(...args),
  previewNeedImport: (...args: unknown[]) => mockPreviewNeedImport(...args),
  commitNeedImport: (...args: unknown[]) => mockCommitNeedImport(...args),
  listResources: (...args: unknown[]) => mockListResources(...args),
  deleteResource: (...args: unknown[]) => mockDeleteResource(...args),
  searchResources: (...args: unknown[]) => mockSearchResources(...args),
  createResource: (...args: unknown[]) => mockCreateResource(...args),
  getOneResource: (...args: unknown[]) => mockGetOneResource(...args),
  updateResource: (...args: unknown[]) => mockUpdateResource(...args),
  previewResourceImport: (...args: unknown[]) => mockPreviewResourceImport(...args),
  previewResourcePhotoImport: (...args: unknown[]) => mockPreviewResourcePhotoImport(...args),
  commitResourceImport: (...args: unknown[]) => mockCommitResourceImport(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  listMatches: (...args: unknown[]) => mockListMatches(...args),
  getUnseenMatchesCount: (...args: unknown[]) => mockGetUnseenMatchesCount(...args),
  markMatchesSeen: (...args: unknown[]) => mockMarkMatchesSeen(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

// ── Component imports (after mocks) ───────────────────────────
import Layout from './components/Layout';
import HomePage from './pages/index';
import LoginPage from './pages/login';
import NeedsPage from './pages/needs/index';
import NewNeedPage from './pages/needs/new';
import NeedBulkImportPage from './pages/needs/import';
import NeedDetailPage from './pages/needs/[id]';
import EditNeedPage from './pages/needs/[id]/edit';
import ResourcesPage from './pages/resources/index';
import NewResourcePage from './pages/resources/new';
import ResourceBulkImportPage from './pages/resources/import';
import ResourceDetailPage from './pages/resources/[id]';
import EditResourcePage from './pages/resources/[id]/edit';
import MatchesPage from './pages/matches/index';

// ── Helpers ───────────────────────────────────────────────────
function renderWithUser(component: React.ReactElement) {
  mockLogin.mockResolvedValue(BOB);
  mockGetMe.mockResolvedValue(BOB);
  return render(component);
}

beforeEach(() => {
  jest.clearAllMocks();
  routerState.query = {};
  routerState.pathname = '/';
  mockGetMe.mockResolvedValue(BOB);
  mockListMatches.mockResolvedValue([]);
  mockGetUnseenMatchesCount.mockResolvedValue({ count: 0 });
  mockMarkMatchesSeen.mockResolvedValue({ ok: true, marked: 0 });
  mockPreviewNeedImport.mockResolvedValue({ items: [], estimatedTokens: 0, inputTokenLimit: 100000, inputMaxChars: 400000 });
  mockPreviewResourceImport.mockResolvedValue({ items: [], estimatedTokens: 0, inputTokenLimit: 100000, inputMaxChars: 1000 });
  mockLogin.mockResolvedValue(BOB);
  mockPreviewResourcePhotoImport.mockResolvedValue({
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
    additionalDrafts: [
      {
        title: 'Coffee Mug',
        description: null,
        quantity: 1,
        status: 'available',
        is_public: false,
        available_until: null,
        evidence_status: 'photo_attached',
      },
    ],
    diagnostics: {
      provider: 'claude',
      model: 'claude-3-haiku-20240307',
      usedVision: true,
      latencyMs: 123,
      moderationVerdict: 'safe',
      relevanceVerdict: 'resource',
      extractedTextPreview: 'wireless mouse',
      detectionsCount: 2,
    },
  });
  mockCommitNeedImport.mockResolvedValue([]);
  mockCommitResourceImport.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────
describe('Layout', () => {
  it('renders nav links and children after login resolves', async () => {
    renderWithUser(<Layout><p>Child content</p></Layout>);
    await waitFor(() => expect(screen.getByText('Child content')).toBeInTheDocument());
    expect(screen.getByText('knapsack')).toBeInTheDocument();
    expect(screen.getByText('Needs')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows a notification bubble when matches exist', async () => {
    mockGetUnseenMatchesCount.mockResolvedValueOnce({ count: 1 });
    renderWithUser(<Layout><p>x</p></Layout>);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Matches (1)' })).toBeInTheDocument());
  });

  it('hides bubble when unseen count is zero', async () => {
    mockGetUnseenMatchesCount.mockResolvedValueOnce({ count: 0 });
    renderWithUser(<Layout><p>x</p></Layout>);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Matches' })).toBeInTheDocument());
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows email when name is null', async () => {
    mockGetMe.mockResolvedValueOnce({ ...BOB, name: null });
    render(<Layout><p>x</p></Layout>);
    await waitFor(() => expect(screen.getByText(BOB.email)).toBeInTheDocument());
  });

  it('redirects to /login if auth bootstrap fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('login failed'));
    mockGetMe.mockRejectedValueOnce(new Error('unauth'));
    render(<Layout><p>x</p></Layout>);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
  });

  it('calls logout and redirects on Logout click', async () => {
    mockLogout.mockResolvedValue({ ok: true });
    renderWithUser(<Layout><p>x</p></Layout>);
    await waitFor(() => screen.getByText('Logout'));
    await userEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

// ─────────────────────────────────────────────────────────────
// HomePage
// ─────────────────────────────────────────────────────────────
describe('HomePage', () => {
  it('renders dashboard heading and nav links', async () => {
    renderWithUser(<HomePage />);
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getAllByText('Needs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resources').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  it('renders login page with knapsack title', () => {
    mockGetMe.mockRejectedValue(new Error('not logged in'));
    render(<LoginPage />);
    expect(screen.getAllByText('knapsack').length).toBeGreaterThan(0);
  });

  it('redirects to / if already logged in', async () => {
    mockGetMe.mockResolvedValueOnce(BOB);
    render(<LoginPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});

// ─────────────────────────────────────────────────────────────
// NeedsPage
// ─────────────────────────────────────────────────────────────
describe('NeedsPage', () => {
  beforeEach(() => {
    mockListNeeds.mockResolvedValue([NEED_1, NEED_OTHER]);
  });

  it('renders need titles after load', async () => {
    renderWithUser(<NeedsPage />);
    await waitFor(() => expect(screen.getByText('Need Alpha')).toBeInTheDocument());
    expect(screen.getByText('Need Beta')).toBeInTheDocument();
  });

  it('shows a Matched! link for owned matched needs', async () => {
    mockListMatches.mockResolvedValue([MATCH_1]);
    renderWithUser(<NeedsPage />);
    await waitFor(() => expect(screen.getByText('Need Alpha')).toBeInTheDocument());
    expect(screen.getByText('Matched!')).toBeInTheDocument();
  });

  it('shows "No needs yet" when list is empty', async () => {
    mockListNeeds.mockResolvedValue([]);
    renderWithUser(<NeedsPage />);
    await waitFor(() => expect(screen.getByText(/No needs yet/)).toBeInTheDocument());
  });

  it('shows remaining-letters hint while query has fewer than 5 alpha chars', async () => {
    renderWithUser(<NeedsPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public needs/));
    await userEvent.type(screen.getByPlaceholderText(/Search public needs/), 'abc');
    expect(screen.getByText(/more letter/)).toBeInTheDocument();
  });

  it('fires search after 5+ alpha chars (debounced)', async () => {
    mockSearchNeeds.mockResolvedValue([NEED_1]);
    renderWithUser(<NeedsPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public needs/));
    await userEvent.type(screen.getByPlaceholderText(/Search public needs/), 'hello');
    await waitFor(() => expect(mockSearchNeeds).toHaveBeenCalledWith('hello'), { timeout: 1000 });
    await waitFor(() => expect(screen.getByText('Need Alpha')).toBeInTheDocument());
  });

  it('marks owned search result with (mine)', async () => {
    mockSearchNeeds.mockResolvedValue([NEED_1, NEED_OTHER]);
    renderWithUser(<NeedsPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public needs/));
    await userEvent.type(screen.getByPlaceholderText(/Search public needs/), 'alpha');
    await waitFor(() => expect(screen.getByText('(mine)')).toBeInTheDocument(), { timeout: 1000 });
    expect(screen.getAllByText('(mine)').length).toBe(1);
  });

  it('shows "No matches found" when search returns empty', async () => {
    mockSearchNeeds.mockResolvedValue([]);
    renderWithUser(<NeedsPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public needs/));
    await userEvent.type(screen.getByPlaceholderText(/Search public needs/), 'zzzzz');
    await waitFor(() => expect(screen.getByText('No matches found.')).toBeInTheDocument(), { timeout: 1000 });
  });
});

// ─────────────────────────────────────────────────────────────
// NewNeedPage
// ─────────────────────────────────────────────────────────────
describe('NewNeedPage', () => {
  it('renders the form', async () => {
    renderWithUser(<NewNeedPage />);
    await waitFor(() => expect(screen.getByText('New Need')).toBeInTheDocument());
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
  });

  it('shows validation error when title is empty', async () => {
    renderWithUser(<NewNeedPage />);
    await waitFor(() => screen.getByText('Create'));
    await userEvent.click(screen.getByText('Create'));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('submits and redirects on success', async () => {
    mockCreateNeed.mockResolvedValue(NEED_1);
    renderWithUser(<NewNeedPage />);
    await waitFor(() => screen.getByLabelText(/Title/));
    await userEvent.type(screen.getByLabelText(/Title/), 'My Need');
    await userEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(mockCreateNeed).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith('/needs');
  });

  it('shows error message when API rejects', async () => {
    mockCreateNeed.mockRejectedValue(new Error('Server error'));
    renderWithUser(<NewNeedPage />);
    await waitFor(() => screen.getByLabelText(/Title/));
    await userEvent.type(screen.getByLabelText(/Title/), 'My Need');
    await userEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('defaults needed_by to today', async () => {
    renderWithUser(<NewNeedPage />);
    await waitFor(() => screen.getByLabelText(/Needed by/));
    const input = screen.getByLabelText(/Needed by/) as HTMLInputElement;
    expect(input.value).toBe(new Date().toISOString().slice(0, 10));
  });
});

// ─────────────────────────────────────────────────────────────
// NeedBulkImportPage
// ─────────────────────────────────────────────────────────────
describe('NeedBulkImportPage', () => {
  it('previews and commits reviewed need drafts', async () => {
    routerState.pathname = '/needs/import';
    mockPreviewNeedImport.mockResolvedValue({
      items: [{ title: 'Blankets', description: 'Warm blankets', quantity: 5, status: 'open', is_public: true, needed_by: null }],
      estimatedTokens: 20,
      inputTokenLimit: 100000,
      inputMaxChars: 400000,
    });

    renderWithUser(<NeedBulkImportPage />);
    await waitFor(() => expect(screen.getByText('Bulk Import Needs')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/Source text/i), 'We need blankets and coats');
    await userEvent.click(screen.getByText('Preview Drafts'));

    await waitFor(() => expect(screen.getByDisplayValue('Blankets')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Import 1 Needs'));
    await waitFor(() => expect(mockCommitNeedImport).toHaveBeenCalled());
  });
});

// ─────────────────────────────────────────────────────────────
// NeedDetailPage
// ─────────────────────────────────────────────────────────────
describe('NeedDetailPage', () => {
  beforeEach(() => {
    routerState.query = { id: 'n1' };
    routerState.pathname = '/needs/n1';
  });

  it('renders need details', async () => {
    mockGetOnNeed.mockResolvedValue(NEED_1);
    renderWithUser(<NeedDetailPage />);
    await waitFor(() => expect(screen.getByText('Need Alpha')).toBeInTheDocument());
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('A need')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('shows "Need not found" on 404', async () => {
    mockGetOnNeed.mockRejectedValue(new Error('Not found'));
    renderWithUser(<NeedDetailPage />);
    await waitFor(() => expect(screen.getByText('Need not found.')).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────
// ResourcesPage
// ─────────────────────────────────────────────────────────────
describe('ResourcesPage', () => {
  beforeEach(() => {
    mockListResources.mockResolvedValue([RESOURCE_1]);
  });

  it('renders resource titles after load', async () => {
    renderWithUser(<ResourcesPage />);
    await waitFor(() => expect(screen.getByText('Resource Alpha')).toBeInTheDocument());
  });

  it('shows "No resources yet" when list is empty', async () => {
    mockListResources.mockResolvedValue([]);
    renderWithUser(<ResourcesPage />);
    await waitFor(() => expect(screen.getByText(/No resources yet/)).toBeInTheDocument());
  });

  it('shows remaining-letters hint for short query', async () => {
    renderWithUser(<ResourcesPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public resources/));
    await userEvent.type(screen.getByPlaceholderText(/Search public resources/), 'ab');
    expect(screen.getByText(/more letter/)).toBeInTheDocument();
  });

  it('fires search after 5+ alpha chars', async () => {
    mockSearchResources.mockResolvedValue([RESOURCE_1]);
    renderWithUser(<ResourcesPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public resources/));
    await userEvent.type(screen.getByPlaceholderText(/Search public resources/), 'alpha');
    await waitFor(() => expect(mockSearchResources).toHaveBeenCalledWith('alpha'), { timeout: 1000 });
  });

  it('marks owned search result with (mine)', async () => {
    mockSearchResources.mockResolvedValue([RESOURCE_1]);
    renderWithUser(<ResourcesPage />);
    await waitFor(() => screen.getByPlaceholderText(/Search public resources/));
    await userEvent.type(screen.getByPlaceholderText(/Search public resources/), 'alpha');
    await waitFor(() => expect(screen.getByText('(mine)')).toBeInTheDocument(), { timeout: 1000 });
  });
});

// ─────────────────────────────────────────────────────────────
// NewResourcePage
// ─────────────────────────────────────────────────────────────
describe('NewResourcePage', () => {
  it('renders the form', async () => {
    renderWithUser(<NewResourcePage />);
    await waitFor(() => expect(screen.getByText('New Resource')).toBeInTheDocument());
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
  });

  it('shows validation error when title is empty', async () => {
    renderWithUser(<NewResourcePage />);
    await waitFor(() => screen.getByText('Create'));
    await userEvent.click(screen.getByText('Create'));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('submits and redirects on success', async () => {
    mockCreateResource.mockResolvedValue(RESOURCE_1);
    renderWithUser(<NewResourcePage />);
    await waitFor(() => screen.getByLabelText(/Title/));
    await userEvent.type(screen.getByLabelText(/Title/), 'My Resource');
    await userEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(mockCreateResource).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith('/resources');
  });

  it('defaults available_until to 7 days from now', async () => {
    renderWithUser(<NewResourcePage />);
    await waitFor(() => screen.getByLabelText(/Available until/));
    const input = screen.getByLabelText(/Available until/) as HTMLInputElement;
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(input.value).toBe(sevenDays);
  });
});

// ─────────────────────────────────────────────────────────────
// ResourceBulkImportPage
// ─────────────────────────────────────────────────────────────
describe('ResourceBulkImportPage', () => {
  it('previews and commits reviewed resource drafts', async () => {
    routerState.pathname = '/resources/import';
    mockPreviewResourceImport.mockResolvedValue({
      items: [{ title: 'Projector', description: 'HD projector', quantity: 1, status: 'available', is_public: true, available_until: null }],
      estimatedTokens: 20,
      inputTokenLimit: 100000,
      inputMaxChars: 1000,
    });

    renderWithUser(<ResourceBulkImportPage />);
    await waitFor(() => expect(screen.getByText('Bulk Import Resources')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/Source text/i), 'We have one projector to lend');
    await userEvent.click(screen.getByText('Preview Drafts'));

    await waitFor(() => expect(screen.getByDisplayValue('Projector')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Import 1 Resources'));
    await waitFor(() => expect(mockCommitResourceImport).toHaveBeenCalled());
  });

  it('previews resource drafts from uploaded photo', async () => {
    routerState.pathname = '/resources/import';
    renderWithUser(<ResourceBulkImportPage />);
    await waitFor(() => expect(screen.getByText('Bulk Import Resources')).toBeInTheDocument());

    const input = screen.getByLabelText(/Or upload a photo/i) as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'resource.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByText('Preview From Photo'));

    await waitFor(() => expect(mockPreviewResourcePhotoImport).toHaveBeenCalled());
    expect(screen.getByDisplayValue('Photo resource draft')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coffee Mug')).toBeInTheDocument();
    expect(screen.getByText(/Photo diagnostics \(non-prod\)/i)).toBeInTheDocument();
    expect(screen.getByText(/provider: claude/i)).toBeInTheDocument();
    expect(screen.getByText(/detectionsCount: 2/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// ResourceDetailPage
// ─────────────────────────────────────────────────────────────
describe('ResourceDetailPage', () => {
  beforeEach(() => {
    routerState.query = { id: 'r1' };
    routerState.pathname = '/resources/r1';
  });

  it('renders resource details', async () => {
    mockGetOneResource.mockResolvedValue(RESOURCE_1);
    renderWithUser(<ResourceDetailPage />);
    await waitFor(() => expect(screen.getByText('Resource Alpha')).toBeInTheDocument());
    expect(screen.getByText('available')).toBeInTheDocument();
    expect(screen.getByText('A resource')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText(/Click to open highlighted photo/i)).toBeInTheDocument();
  });

  it('opens enlarged highlighted photo when thumbnail is clicked', async () => {
    mockGetOneResource.mockResolvedValue(RESOURCE_1);
    renderWithUser(<ResourceDetailPage />);
    await waitFor(() => expect(screen.getByText('Resource Alpha')).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Click to open highlighted photo/i));
    expect(screen.getByAltText('Resource full')).toBeInTheDocument();
  });

  it('shows "Resource not found" on error', async () => {
    mockGetOneResource.mockRejectedValue(new Error('Not found'));
    renderWithUser(<ResourceDetailPage />);
    await waitFor(() => expect(screen.getByText('Resource not found.')).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────
// EditNeedPage
// ─────────────────────────────────────────────────────────────
describe('EditNeedPage', () => {
  beforeEach(() => {
    routerState.query = { id: 'n1' };
    routerState.pathname = '/needs/n1/edit';
    mockGetOnNeed.mockResolvedValue(NEED_1);
  });

  it('loads current need values and saves a new version', async () => {
    mockUpdateNeed.mockResolvedValue({ ...NEED_1, id: 'n1v2', title: 'Need Alpha v2' });
    renderWithUser(<EditNeedPage />);

    await waitFor(() => expect(screen.getByDisplayValue('Need Alpha')).toBeInTheDocument());
    await userEvent.clear(screen.getByLabelText(/Title/));
    await userEvent.type(screen.getByLabelText(/Title/), 'Need Alpha v2');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockUpdateNeed).toHaveBeenCalledWith('n1', expect.objectContaining({ title: 'Need Alpha v2' })));
    expect(mockPush).toHaveBeenCalledWith('/needs/n1v2');
  });
});

// ─────────────────────────────────────────────────────────────
// EditResourcePage
// ─────────────────────────────────────────────────────────────
describe('EditResourcePage', () => {
  beforeEach(() => {
    routerState.query = { id: 'r1' };
    routerState.pathname = '/resources/r1/edit';
    mockGetOneResource.mockResolvedValue(RESOURCE_1);
  });

  it('loads current resource values and saves a new version', async () => {
    mockUpdateResource.mockResolvedValue({ ...RESOURCE_1, id: 'r1v2', title: 'Resource Alpha v2' });
    renderWithUser(<EditResourcePage />);

    await waitFor(() => expect(screen.getByDisplayValue('Resource Alpha')).toBeInTheDocument());
    await userEvent.clear(screen.getByLabelText(/Title/));
    await userEvent.type(screen.getByLabelText(/Title/), 'Resource Alpha v2');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockUpdateResource).toHaveBeenCalledWith('r1', expect.objectContaining({ title: 'Resource Alpha v2' })));
    expect(mockPush).toHaveBeenCalledWith('/resources/r1v2');
  });
});

// ─────────────────────────────────────────────────────────────
// MatchesPage
// ─────────────────────────────────────────────────────────────
describe('MatchesPage', () => {
  it('renders filtered matches for the selected need and marks unseen as seen', async () => {
    routerState.query = { needId: 'n1' };
    routerState.pathname = '/matches';
    mockListMatches.mockResolvedValue([MATCH_1, MATCH_2_SEEN]);

    renderWithUser(<MatchesPage />);

    await waitFor(() => expect(screen.getByText('Matches For Need')).toBeInTheDocument());
    expect(screen.getAllByText('Need Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resource Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Strong fit').length).toBeGreaterThan(0);
    expect(screen.getByText('New')).toBeInTheDocument();
    await waitFor(() => expect(mockMarkMatchesSeen).toHaveBeenCalledWith(['m1']));
  });
});

// ─────────────────────────────────────────────────────────────
// lib/api — unit tests (no DOM needed)
// ─────────────────────────────────────────────────────────────
describe('lib/api helpers', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function okResponse(body: unknown) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    } as Response);
  }

  function errorResponse(body: unknown) {
    return Promise.resolve({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve(body),
    } as Response);
  }

  let api: typeof import('./lib/api');
  beforeAll(async () => {
    jest.unmock('./lib/api');
    api = await import('./lib/api');
  });

  it('getMe calls /auth/me', async () => {
    mockFetch.mockReturnValueOnce(okResponse(BOB));
    const result = await api.getMe();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(result).toEqual(BOB);
  });

  it('apiFetch throws on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(errorResponse({ error: 'Unauthorized' }));
    await expect(api.getMe()).rejects.toThrow('Unauthorized');
  });

  it('searchNeeds encodes the query string', async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    await api.searchNeeds('hello world');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=hello%20world'),
      expect.anything()
    );
  });

  it('searchResources encodes the query string', async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    await api.searchResources('foo bar');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=foo%20bar'),
      expect.anything()
    );
  });

  it('listMatches encodes filter parameters', async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    await api.listMatches({ needId: 'need 1', resourceId: 'resource 1' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('needId=need+1&resourceId=resource+1'),
      expect.anything()
    );
  });

  it('getUnseenMatchesCount calls unseen-count endpoint', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ count: 3 }));
    await api.getUnseenMatchesCount();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/matches/unseen-count'),
      expect.anything()
    );
  });

  it('markMatchesSeen posts match ids', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ ok: true, marked: 1 }));
    await api.markMatchesSeen(['m1']);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/matches/seen'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('previewNeedImport posts free text', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ items: [], estimatedTokens: 1, inputTokenLimit: 100000, inputMaxChars: 400000 }));
    await api.previewNeedImport('need tents and blankets');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/needs/import/preview'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('previewResourceImport posts free text', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ items: [], estimatedTokens: 1, inputTokenLimit: 100000, inputMaxChars: 400000 }));
    await api.previewResourceImport('have tents and blankets');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/resources/import/preview'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('previewResourcePhotoImport posts multipart form data', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ status: 'allow', draft: { title: 'Photo resource draft' } }));
    await api.previewResourcePhotoImport(new File(['fake-image-bytes'], 'resource.jpg', { type: 'image/jpeg' }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/resources/import/photo/preview'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
