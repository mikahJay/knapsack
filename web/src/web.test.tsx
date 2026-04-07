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
const mockListResources = jest.fn();
const mockDeleteResource = jest.fn();
const mockSearchResources = jest.fn();
const mockCreateResource = jest.fn();
const mockGetOneResource = jest.fn();
const mockLogout = jest.fn();

const BOB = { id: 'bob-uuid', email: 'bob@example.com', name: 'Bob', provider: 'local' };
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
};

jest.mock('./lib/api', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  listNeeds: (...args: unknown[]) => mockListNeeds(...args),
  deleteNeed: (...args: unknown[]) => mockDeleteNeed(...args),
  searchNeeds: (...args: unknown[]) => mockSearchNeeds(...args),
  createNeed: (...args: unknown[]) => mockCreateNeed(...args),
  getOnNeed: (...args: unknown[]) => mockGetOnNeed(...args),
  listResources: (...args: unknown[]) => mockListResources(...args),
  deleteResource: (...args: unknown[]) => mockDeleteResource(...args),
  searchResources: (...args: unknown[]) => mockSearchResources(...args),
  createResource: (...args: unknown[]) => mockCreateResource(...args),
  getOneResource: (...args: unknown[]) => mockGetOneResource(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

// ── Component imports (after mocks) ───────────────────────────
import Layout from './components/Layout';
import HomePage from './pages/index';
import LoginPage from './pages/login';
import NeedsPage from './pages/needs/index';
import NewNeedPage from './pages/needs/new';
import NeedDetailPage from './pages/needs/[id]';
import ResourcesPage from './pages/resources/index';
import NewResourcePage from './pages/resources/new';
import ResourceDetailPage from './pages/resources/[id]';

// ── Helpers ───────────────────────────────────────────────────
function renderWithUser(component: React.ReactElement) {
  mockGetMe.mockResolvedValue(BOB);
  return render(component);
}

beforeEach(() => {
  jest.clearAllMocks();
  routerState.query = {};
  routerState.pathname = '/';
  mockGetMe.mockResolvedValue(BOB);
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
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows email when name is null', async () => {
    mockGetMe.mockResolvedValueOnce({ ...BOB, name: null });
    render(<Layout><p>x</p></Layout>);
    await waitFor(() => expect(screen.getByText(BOB.email)).toBeInTheDocument());
  });

  it('redirects to /login if getMe rejects', async () => {
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
  });

  it('shows "Resource not found" on error', async () => {
    mockGetOneResource.mockRejectedValue(new Error('Not found'));
    renderWithUser(<ResourceDetailPage />);
    await waitFor(() => expect(screen.getByText('Resource not found.')).toBeInTheDocument());
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
});
