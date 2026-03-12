import { getSession, setSession, clearSession } from './auth';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function refreshTokens(): Promise<{ access_token: string; refresh_token: string } | null> {
  const session = getSession();
  if (!session?.refresh_token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) return null;
    const tokens = await res.json();
    setSession({ ...session, ...tokens });
    return tokens;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; skipAuth?: boolean } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  let token = options.token;
  if (!token && !options.skipAuth && typeof window !== 'undefined') {
    token = getSession()?.access_token ?? undefined;
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && token && !options.skipAuth && typeof window !== 'undefined') {
    const newTokens = await refreshTokens();
    if (newTokens) {
      headers.set('Authorization', `Bearer ${newTokens.access_token}`);
      res = await fetch(url, { ...options, headers });
    }
    if (res.status === 401) {
      clearSession();
      window.location.href = '/login';
      throw new Error('Sessão expirada');
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
