function getApiBase(): string {
  return (localStorage.getItem("serverUrl") ?? "").replace(/\/$/, "");
}

export function setServerUrl(url: string): void {
  localStorage.setItem("serverUrl", url.replace(/\/$/, ""));
}

export function clearServerUrl(): void {
  localStorage.removeItem("serverUrl");
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
  id_origin?: string;
  name: string;
  website?: string;
  empty_spool_weight_grams?: number;
  created_at: string;
}

export interface Filament {
  id_filament: string;
  title: string;
  color_hex: string;
  color_info?: { type: string; colors: string[] };
  weight_grams: number;
  image_url?: string;
  material_type: string;
  filled_type?: string;
  density: number;
  nozzle_temp_min?: number;
  nozzle_temp_max?: number;
  bed_temp_min?: number;
  bed_temp_max?: number;
  dry_temp?: number;
  dry_time?: number;
  id_brand: string;
  id_origin?: string;
  created_at: string;
  updated_at: string;
  brand?: Brand;
}

export interface RackRef {
  id_rack: number;
  name: string;
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
  rack?: RackRef;
}

export interface Rack {
  id_rack: number;
  name: string;
  description?: string;
  max_capacity?: number;
  id_user: string;
  created_at: string;
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
  id_user: string;
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
  id_user: string;
  name: string;
  color?: string;
  icon?: string;
  created_at: string;
}

export interface ProjectFilamentLink {
  id_link: number;
  id_project: number;
  id_spool?: number;
  id_wish?: number;
  spool?: Spool;
  wish?: WishlistItem;
}

export interface Project {
  id_project: number;
  id_user: string;
  title: string;
  priority: number;
  comment?: string;
  target_person?: string;
  model_url?: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  filaments: ProjectFilamentLink[];
}

export interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ApiError {
  error: string;
  status?: number;
}
export type Result<T> = { data: T } | ApiError;

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:expired"));
    }
    const msg = (await res.text()).trim() || res.statusText;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function reqSafe<T>(
  path: string,
  options: RequestInit = {},
): Promise<Result<T>> {
  try {
    const data = await req<T>(path, options);
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      err instanceof Error && "status" in err ? (err as any).status : undefined;
    return { error: message, status };
  }
}

async function safeQuery<T>(
  path: string,
  defaultValue: T,
  options: RequestInit = {},
): Promise<T> {
  try {
    return await req<T>(path, options);
  } catch (err) {
    console.error(`API error at ${path}:`, err);
    return defaultValue;
  }
}

function qs(
  params: Record<string, string | number | undefined | Array<string | number>>,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== "") p.append(k, String(item));
      }
      continue;
    }
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      reqSafe<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, extended: true }),
      }),
    register: (email: string, username: string, password: string) =>
      reqSafe<{ token: string; user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password, extended: true }),
      }),
  },

  account: {
    get: () => req<User>("/api/account"),
    update: (body: { email?: string; username?: string; currency?: string }) =>
      reqSafe<User>("/api/account", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updatePassword: (current_password: string, new_password: string) =>
      reqSafe<void>("/api/account/password", {
        method: "PUT",
        body: JSON.stringify({ current_password, new_password }),
      }),
    generateApiKey: () =>
      req<{ api_key: string }>("/api/account/api-key", { method: "POST" }),
  },

  rfid: {
    assign: (id_spool: number, rfid_tag: string) =>
      req<Spool>("/api/rfid/assign", {
        method: "POST",
        body: JSON.stringify({ id_spool, rfid_tag }),
      }),
    unassign: (id_spool: number) =>
      req<Spool>("/api/rfid/assign", {
        method: "DELETE",
        body: JSON.stringify({ id_spool }),
      }),
  },

  brands: {
    list: (params: { q?: string; page?: number; per_page?: number } = {}) =>
      safeQuery<PagedResponse<Brand>>(`/api/brands${qs(params)}`, {
        data: [],
        total: 0,
        page: 1,
        per_page: 100,
      }),
    get: (id: string) => req<Brand>(`/api/brands/${id}`),
    create: (body: Partial<Brand>) =>
      req<Brand>("/api/brands", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Brand>) =>
      req<Brand>(`/api/brands/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      req<void>(`/api/brands/${id}`, { method: "DELETE" }),
  },

  filaments: {
    list: (
      params: {
        q?: string;
        material?: string;
        materials?: string[];
        brand_id?: string;
        page?: number;
        per_page?: number;
        sort_by?: string;
        sort_dir?: string;
      } = {},
    ) =>
      safeQuery<PagedResponse<Filament>>(`/api/filaments${qs(params)}`, {
        data: [],
        total: 0,
        page: 1,
        per_page: 50,
      }),
    materials: () => req<string[]>("/api/filaments/materials"),
    get: (id: string) => req<Filament>(`/api/filaments/${id}`),
    create: (body: Partial<Filament>) =>
      req<Filament>("/api/filaments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<Filament>) =>
      req<Filament>(`/api/filaments/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      req<void>(`/api/filaments/${id}`, { method: "DELETE" }),
  },

  spools: {
    list: (
      params: {
        q?: string;
        material?: string;
        rack_id?: string;
        page?: number;
        per_page?: number;
      } = {},
    ) => safeQuery<Spool[]>(`/api/spools${qs(params)}`, []),
    get: (id: number) => req<Spool>(`/api/spools/${id}`),
    create: (body: Partial<Spool>) =>
      req<Spool>("/api/spools", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Spool>) =>
      req<Spool>(`/api/spools/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      req<void>(`/api/spools/${id}`, { method: "DELETE" }),
    updateWeight: (id: number, weight: number) =>
      req<Spool>(`/api/spools/${id}/weight`, {
        method: "PATCH",
        body: JSON.stringify({ weight_remaining_grams: weight }),
      }),
    updateRack: (id: number, rackId: number | null) =>
      req<Spool>(`/api/spools/${id}/rack`, {
        method: "PATCH",
        body: JSON.stringify({ id_rack: rackId }),
      }),
  },

  racks: {
    list: () => safeQuery<Rack[]>("/api/racks", []),
    get: (id: number) => req<Rack>(`/api/racks/${id}`),
    create: (body: Partial<Rack>) =>
      req<Rack>("/api/racks", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Rack>) =>
      req<Rack>(`/api/racks/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) => req<void>(`/api/racks/${id}`, { method: "DELETE" }),
  },

  preferences: {
    get: (filamentId: string) =>
      req<Preference>(`/api/preferences/${filamentId}`),
    upsert: (filamentId: string, body: Partial<Preference>) =>
      req<Preference>(`/api/preferences/${filamentId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (filamentId: string) =>
      req<void>(`/api/preferences/${filamentId}`, { method: "DELETE" }),
  },

  wishlist: {
    list: () => safeQuery<WishlistItem[]>("/api/wishlist", []),
    create: (body: Partial<WishlistItem>) =>
      req<WishlistItem>("/api/wishlist", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<WishlistItem>) =>
      req<WishlistItem>(`/api/wishlist/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      req<void>(`/api/wishlist/${id}`, { method: "DELETE" }),
  },

  projects: {
    list: () => safeQuery<Project[]>("/api/projects", []),
    get: (id: number) => req<Project>(`/api/projects/${id}`),
    create: (body: Partial<Project> & { tag_ids?: number[] }) =>
      req<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<Project> & { tag_ids?: number[] }) =>
      req<Project>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      req<void>(`/api/projects/${id}`, { method: "DELETE" }),
    reorder: (ids: number[]) =>
      req<void>("/api/projects/reorder", {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      }),
    addFilament: (
      projectId: number,
      body: { id_spool?: number; id_wish?: number },
    ) =>
      req<{ id_link: number }>(`/api/projects/${projectId}/filaments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    removeFilament: (projectId: number, linkId: number) =>
      req<void>(`/api/projects/${projectId}/filaments/${linkId}`, {
        method: "DELETE",
      }),
  },

  tags: {
    list: () => safeQuery<Tag[]>("/api/tags", []),
    create: (body: Partial<Tag>) =>
      req<Tag>("/api/tags", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Tag>) =>
      req<Tag>(`/api/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) => req<void>(`/api/tags/${id}`, { method: "DELETE" }),
  },
};
