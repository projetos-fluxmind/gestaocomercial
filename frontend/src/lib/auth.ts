export type Role = 'admin' | 'salesperson';

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; full_name: string; role: Role };
};

const KEY = 'crm_vendas_session';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}

