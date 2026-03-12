'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';
import type { ApiListResponse, Plan, UserMe } from '@/lib/types';

export default function AdminPlansPage() {
  const [data, setData] = useState<Plan[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    const me = s.user;
    if (me.role !== 'admin') return (window.location.href = '/seller');

    setLoading(true);
    setError(null);
    try {
      // company_id estÃ¡ no token; para MVP, pedimos o usuÃ¡rio /me e pegamos company_id.
      const meRes = await apiFetch<UserMe>('/api/users/me', { token: s.access_token });
      const res = await apiFetch<ApiListResponse<Plan>>(`/api/companies/${meRes.company_id}/plans`, {
        token: s.access_token,
      });
      setData(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPlan() {
    const s = getSession();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const meRes = await apiFetch<UserMe>('/api/users/me', { token: s.access_token });
      await apiFetch(`/api/companies/${meRes.company_id}/plans`, {
        method: 'POST',
        token: s.access_token,
        body: JSON.stringify({
          name,
          commission_rules: [{ type: 'percentage', description: 'ComissÃ£o base', value: 5 }],
          is_active: true,
        }),
      });
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Configure planos e regras de comissÃ£o.</p>
          </div>
          <button
            className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            onClick={() => {
              clearSession();
              window.location.href = '/login';
            }}
          >
            Sair
          </button>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex gap-3">
            <input
              className="h-11 flex-1 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Nome do plano"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              disabled={!name || loading}
              className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
              onClick={createPlan}
            >
              Criar
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Lista ({data.length})</h2>
          <div className="mt-3 grid gap-3">
            {loading ? <p className="text-sm">Carregandoâ€¦</p> : null}
            {data.map((p) => (
              <div key={p.id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{p.is_active ? 'ativo' : 'inativo'}</div>
                </div>
                <pre className="mt-2 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
                  {JSON.stringify(p.commission_rules, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm">
          <a className="underline" href="/admin">
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}