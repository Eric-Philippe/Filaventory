import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Runtime state ────────────────────────────────────────────────────────────

let _serverUrl = '';
let _token = '';

export async function initApi(): Promise<void> {
  _serverUrl = (await AsyncStorage.getItem('serverUrl')) ?? '';
  _token = (await AsyncStorage.getItem('token')) ?? '';
}

export function getServerUrl(): string { return _serverUrl; }
export function getToken(): string { return _token; }
export function isAuthenticated(): boolean { return !!_token && !!_serverUrl; }

export async function saveServerUrl(url: string): Promise<void> {
  _serverUrl = url.replace(/\/$/, '');
  await AsyncStorage.setItem('serverUrl', _serverUrl);
}

export async function saveToken(token: string, user: User): Promise<void> {
  _token = token;
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

export async function clearAuth(): Promise<void> {
  _token = '';
  await AsyncStorage.multiRemove(['token', 'user']);
}

export async function clearAll(): Promise<void> {
  _token = '';
  _serverUrl = '';
  await AsyncStorage.multiRemove(['token', 'user', 'serverUrl']);
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function updateStoredUser(user: User): Promise<void> {
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id_user: string;
  email: string;
  username: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id_brand: string;
  name: string;
  website?: string;
  empty_spool_weight_grams?: number;
}

export interface Filament {
  id_filament: string;
  title: string;
  color_hex: string;
  weight_grams: number;
  image_url?: string;
  material_type: string;
  density: number;
  nozzle_temp_min?: number;
  nozzle_temp_max?: number;
  bed_temp_min?: number;
  bed_temp_max?: number;
  dry_temp?: number;
  dry_time?: number;
  id_brand: string;
  brand?: Brand;
}

export interface Spool {
  id_spool: number;
  id_user: string;
  id_filament: string;
  is_spooled: boolean;
  is_dry: boolean;
  weight_remaining_grams: number;
  rfid_tag?: string;
  id_rack?: number;
  notes?: string;
  acquired_at: string;
  filament?: Filament;
  rack?: { id_rack: number; name: string };
}

export interface Rack {
  id_rack: number;
  name: string;
  description?: string;
  max_capacity?: number;
  spool_count: number;
}

export interface Preference {
  id_user: string;
  id_filament: string;
  nozzle_temp_override?: number;
  bed_temp_override?: number;
  ironing_flow?: number;
  ironing_speed?: number;
  notes?: string;
}

export interface WishlistItem {
  id_wish: number;
  id_filament: string;
  quantity_spools: number;
  desired_price?: number;
  purchase_url?: string;
  comment?: string;
  priority: number;
  added_at: string;
  filament?: Filament;
}

export interface Tag {
  id_tag: number;
  name: string;
  color?: string;
}

export interface Project {
  id_project: number;
  title: string;
  priority: number;
  comment?: string;
  target_person?: string;
  model_url?: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  filaments: Array<{
    id_link: number;
    id_spool?: number;
    id_wish?: number;
    spool?: Spool;
    wish?: WishlistItem;
  }>;
}

export interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export type ApiError = { error: string; status?: number };
export type Result<T> = { data: T } | ApiError;

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${_serverUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const msg = (await res.text()).trim() || res.statusText;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function reqSafe<T>(path: string, options: RequestInit = {}): Promise<Result<T>> {
  try {
    const data = await req<T>(path, options);
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof Error && 'status' in err ? (err as any).status : undefined;
    return { error: message, status };
  }
}

async function safeQuery<T>(path: string, defaultValue: T, options: RequestInit = {}): Promise<T> {
  try { return await req<T>(path, options); }
  catch { return defaultValue; }
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      reqSafe<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, username: string, password: string) =>
      reqSafe<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      }),
  },

  account: {
    get: () => req<User>('/api/account'),
    update: (body: { email?: string; username?: string; currency?: string }) =>
      reqSafe<User>('/api/account', { method: 'PUT', body: JSON.stringify(body) }),
    updatePassword: (current_password: string, new_password: string) =>
      reqSafe<void>('/api/account/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password, new_password }),
      }),
    generateApiKey: () => req<{ api_key: string }>('/api/account/api-key', { method: 'POST' }),
  },

  spools: {
    list: (params: { q?: string; material?: string; rack_id?: string } = {}) =>
      safeQuery<Spool[]>(`/api/spools${qs(params)}`, []),
    get: (id: number) => req<Spool>(`/api/spools/${id}`),
    create: (body: Partial<Spool>) =>
      req<Spool>('/api/spools', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Spool>) =>
      req<Spool>(`/api/spools/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    assignRack: (id: number, rackId: number | null) =>
      req<Spool>(`/api/spools/${id}/rack`, { method: 'PATCH', body: JSON.stringify({ id_rack: rackId }) }),
    delete: (id: number) => req<void>(`/api/spools/${id}`, { method: 'DELETE' }),
    updateWeight: (id: number, weight: number) =>
      req<Spool>(`/api/spools/${id}/weight`, {
        method: 'PATCH',
        body: JSON.stringify({ weight_remaining_grams: weight }),
      }),
  },

  racks: {
    list: () => safeQuery<Rack[]>('/api/racks', []),
  },

  filaments: {
    list: (params: { q?: string; material?: string; page?: number; per_page?: number } = {}) =>
      safeQuery<PagedResponse<Filament>>(`/api/filaments${qs(params)}`, {
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      }),
    materials: () => req<string[]>('/api/filaments/materials'),
  },

  preferences: {
    get: (filamentId: string) => req<Preference>(`/api/preferences/${filamentId}`),
    upsert: (filamentId: string, body: Partial<Preference>) =>
      req<Preference>(`/api/preferences/${filamentId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    delete: (filamentId: string) =>
      req<void>(`/api/preferences/${filamentId}`, { method: 'DELETE' }),
  },

  rfid: {
    assign: (id_spool: number, rfid_tag: string) =>
      req<Spool>('/api/rfid/assign', {
        method: 'POST',
        body: JSON.stringify({ id_spool, rfid_tag }),
      }),
    unassign: (id_spool: number) =>
      req<Spool>('/api/rfid/assign', {
        method: 'DELETE',
        body: JSON.stringify({ id_spool }),
      }),
  },

  wishlist: {
    list: () => safeQuery<WishlistItem[]>('/api/wishlist', []),
    create: (body: Partial<WishlistItem>) =>
      req<WishlistItem>('/api/wishlist', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<WishlistItem>) =>
      req<WishlistItem>(`/api/wishlist/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => req<void>(`/api/wishlist/${id}`, { method: 'DELETE' }),
  },

  projects: {
    list: () => safeQuery<Project[]>('/api/projects', []),
    create: (body: Partial<Project> & { tag_ids?: number[] }) =>
      req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Project> & { tag_ids?: number[] }) =>
      req<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => req<void>(`/api/projects/${id}`, { method: 'DELETE' }),
    addFilament: (projectId: number, body: { id_spool?: number; id_wish?: number }) =>
      req<Project>(`/api/projects/${projectId}/filaments`, { method: 'POST', body: JSON.stringify(body) }),
    removeFilament: (projectId: number, linkId: number) =>
      req<void>(`/api/projects/${projectId}/filaments/${linkId}`, { method: 'DELETE' }),
  },

  tags: {
    list: () => safeQuery<Tag[]>('/api/tags', []),
    create: (body: { name: string }) =>
      req<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: number) => req<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  },
};
