'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';
import type { AchievementDefinition, ApiListResponse, UnlockedAchievement, UserMe } from '@/lib/types';

export default function SellerAchievementsPage() {
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([]);
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = getSession();
      if (!s) return (window.location.href = '/login');
      if (s.user.role !== 'salesperson') return (window.location.href = '/admin');

      try {
        const meRes = await apiFetch<UserMe>('/api/users/me', { token: s.access_token });
        const [meRes2, defRes] = await Promise.all([
          apiFetch<ApiListResponse<UnlockedAchievement>>(`/api/companies/${meRes.company_id}/achievements/me`, {
            token: s.access_token,
          }),
          apiFetch<ApiListResponse<AchievementDefinition>>(`/api/companies/${meRes.company_id}/achievements`, {
            token: s.access_token,
          }),
        ]);
        setUnlocked(meRes2.data ?? []);
        setDefinitions(defRes.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      }
    })();
  }, []);

  const unlockedCodes = new Set(unlocked.map((u) => u.code));

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Conquistas</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Badges desbloqueados e disponÃ­veis.</p>
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
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Desbloqueados ({unlocked.length})</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {unlocked.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30"
              >
                <div className="font-medium">{u.name}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{u.description}</div>
                <div className="mt-2 text-xs text-zinc-500">{new Date(u.unlocked_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Todas as conquistas</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {definitions.map((d) => (
              <div
                key={d.id}
                className={`rounded-xl border p-4 ${
                  unlockedCodes.has(d.code)
                    ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30'
                    : 'border-zinc-200 opacity-70 dark:border-zinc-800'
                }`}
              >
                <div className="font-medium">{d.name}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{d.description}</div>
                {unlockedCodes.has(d.code) ? (
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400">Desbloqueado</div>
                ) : (
                  <div className="mt-2 text-xs text-zinc-500">Bloqueado</div>
                )}
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