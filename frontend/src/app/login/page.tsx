'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { setSession, type AuthSession } from '@/lib/auth';

type LoginResponse = AuthSession;

export default function LoginPage() {
  const [companySlug, setCompanySlug] = useState('crm-vendas-demo');
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('ChangeMeNow!123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => companySlug.trim() && email.trim() && password.trim(),
    [companySlug, email, password]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          company_slug: companySlug,
          email,
          password,
        }),
      });
      setSession(data);
      window.location.href = data.user.role === 'admin' ? '/admin' : '/seller';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Entre com seu tenant e credenciais.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Empresa (slug)</span>
            <input
              className="h-11 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-white/20"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              autoComplete="organization"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              className="h-11 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-white/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Senha</span>
            <input
              type="password"
              className="h-11 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-white/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <button
            disabled={!canSubmit || loading}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Dica: use o seed padrão (slug <b>crm-vendas-demo</b>, email <b>admin@demo.local</b>).
          </p>
        </div>
      </form>
    </div>
  );
}

