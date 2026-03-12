'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';
import type { ApiListResponse, LeaderboardEntry, UserMe } from '@/lib/types';

export default function SellerRankingPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [periodKey, setPeriodKey] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!periodKey) return;
    (async () => {
      const s = getSession();
      if (!s) return (window.location.href = '/login');
      if (s.user.role !== 'salesperson') return (window.location.href = '/admin');

      try {
        const meRes = await apiFetch<UserMe>('/api/users/me', { token: s.access_token });
        const res = await apiFetch<ApiListResponse<LeaderboardEntry>>(
          `/api/companies/${meRes.company_id}/leaderboard?period_type=month&period_key=${encodeURIComponent(periodKey)}`,
          { token: s.access_token }
        );
        setData(res.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      }
    })();
  }, [periodKey]);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              PosiÃ§Ã£o no leaderboard do mÃªs.
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
          <input
            type="month"
            className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            PosiÃ§Ãµes ({data.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {data.map((r) => (
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
          <a className="underline" href="/seller">
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}