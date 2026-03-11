'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function SellerGoalsProgressPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = getSession();
      if (!s) return (window.location.href = '/login');
      if (s.user.role !== 'salesperson') return (window.location.href = '/admin');

      try {
        const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
        const res: any = await apiFetch(`/api/companies/${meRes.company_id}/goals/progress`, {
          token: s.access_token,
        });
        setData(res.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Progresso das metas</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Metas ativas do período.
            </p>
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

        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Metas ativas ({data.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {data.map((g) => (
              <div key={g.id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{g.status}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {g.target_type} · alvo: {g.target_value ?? '—'} · atual: {g.current_value} · {g.period_start} → {g.period_end}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm">
          <a className="underline" href="/seller">
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}
