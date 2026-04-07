const API_URL =
  typeof window === 'undefined'
    ? (process.env['API_URL'] ?? 'http://localhost:4000')       // server-side (container)
    : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'); // browser

export interface User {
  id: string;
  email: string;
  name: string | null;
  provider: string;
}

export interface Need {
  id: string;
  title: string;
  description: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────
export const getMe = () => apiFetch<User>('/auth/me');
export const login = () => apiFetch<User>('/auth/login', { method: 'POST' });
export const logout = () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });

// ── Needs ─────────────────────────────────────────────────────
export const listNeeds = () => apiFetch<Need[]>('/api/needs');
export const getOnNeed = (id: string) => apiFetch<Need>(`/api/needs/${id}`);
export const createNeed = (body: { title: string; description?: string }) =>
  apiFetch<Need>('/api/needs', { method: 'POST', body: JSON.stringify(body) });
export const updateNeed = (
  id: string,
  body: { title?: string; description?: string; status?: string }
) => apiFetch<Need>(`/api/needs/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteNeed = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/needs/${id}`, { method: 'DELETE' });

// ── Resources ─────────────────────────────────────────────────
export const listResources = () => apiFetch<Resource[]>('/api/resources');
export const getOneResource = (id: string) => apiFetch<Resource>(`/api/resources/${id}`);
export const createResource = (body: { title: string; description?: string }) =>
  apiFetch<Resource>('/api/resources', { method: 'POST', body: JSON.stringify(body) });
export const updateResource = (
  id: string,
  body: { title?: string; description?: string; status?: string }
) => apiFetch<Resource>(`/api/resources/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteResource = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/resources/${id}`, { method: 'DELETE' });
