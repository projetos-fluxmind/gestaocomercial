'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminRankingPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    if (s.user.role !== 'admin') return (window.location.href = '/seller');

    setLoading(true);
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      const res: any = await apiFetch(`/api/companies/${meRes.company_id}/leaderboard`, {
        token: s.access_token,
      });
      setRows(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function compute() {
    const s = getSession();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      const res: any = await apiFetch(`/api/companies/${meRes.company_id}/leaderboard/compute`, {
        method: 'POST',
        token: s.access_token,
        body: JSON.stringify({ period_type: 'month' }),
      });
      setRows(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Leaderboard mensal (compute manual no MVP).
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

        <div className="mt-6 flex gap-3">
          <button
            onClick={compute}
            disabled={loading}
            className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            Recalcular
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="h-11 rounded-xl border bg-white px-4 text-sm font-medium disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
          >
            Atualizar
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Entradas ({rows.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {rows.map((r) => (
              <div key={r.user_id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="flex justify-between text-sm">
                  <div className="font-medium">#{r.rank_position}</div>
                  <div className="text-zinc-600 dark:text-zinc-400">
                    score {Number(r.performance_score).toFixed(4)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  user_id: {r.user_id}
                </div>
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

