export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}

export function validateBaseUrl(value: string, development: boolean): string {
  if (!value.trim()) throw new ApiError('Set EXPO_PUBLIC_API_URL in mobile/.env, then restart Expo.');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ApiError('The API URL is not valid.'); }
  const localHost = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;
  if (url.protocol !== 'https:' && !(development && url.protocol === 'http:' && localHost.test(url.hostname))) {
    throw new ApiError('Use HTTPS for the API. HTTP is allowed only for local development servers.');
  }
  if (url.username || url.password || url.search || url.hash || !url.pathname.replace(/\/$/, '').endsWith('/api')) {
    throw new ApiError('Use a plain API base URL ending in /api, without credentials or query parameters.');
  }
  return url.toString().replace(/\/$/, '');
}

export function createApiClient(baseUrl: string, options: {
  development?: boolean; fetcher?: typeof fetch; onUnauthorized?: (token: string) => void; timeoutMs?: number;
} = {}) {
  return async function request<T>(path: string, token = '', body?: unknown, method?: 'POST' | 'PATCH'): Promise<T> {
    const base = validateBaseUrl(baseUrl, options.development ?? false);
    if (!path.startsWith('/') || path.startsWith('//')) throw new ApiError('Invalid API path.');
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), options.timeoutMs ?? 15000);
    try {
      const response = await (options.fetcher ?? fetch)(base + path, {
        method: method ?? (body === undefined ? 'GET' : 'POST'),
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: abort.signal,
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401 && token) options.onUnauthorized?.(token);
      if (!response.ok || payload?.success === false) {
        throw new ApiError(typeof payload?.error === 'string' ? payload.error : `Request failed (${response.status}). Please try again.`, response.status);
      }
      if (!payload || typeof payload !== 'object') throw new ApiError('The server returned an unexpected response.');
      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(abort.signal.aborted ? 'The server took too long to respond. Please retry.'
        : 'Cannot reach the CRM. Check your connection and API server address.');
    } finally { clearTimeout(timeout); }
  };
}

export function unwrap<T>(payload: { data?: T } | T): T {
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data as T : payload as T;
}

export function readPage<T>(payload: unknown, page: number): import('./types').Page<T> {
  const value = payload as { data?: unknown; items?: unknown; meta?: { total?: number; total_pages?: number }; pagination?: { total?: number; totalPages?: number } };
  const items = Array.isArray(value?.items) ? value.items : Array.isArray(value?.data) ? value.data : null;
  if (!items) throw new ApiError('The server returned an unexpected list response.');
  return { items, total: Number(value.meta?.total ?? value.pagination?.total ?? items.length), page,
    totalPages: Math.max(1, Number(value.meta?.total_pages ?? value.pagination?.totalPages ?? 1)) };
}
