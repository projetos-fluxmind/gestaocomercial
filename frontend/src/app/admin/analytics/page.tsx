'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = getSession();
      if (!s) return (window.location.href = '/login');
      if (s.user.role !== 'admin') return (window.location.href = '/seller');

      try {
        const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
        const res = await apiFetch(`/api/companies/${meRes.company_id}/analytics/overview`, {
          token: s.access_token,
        });
        setData(res);
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
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Visão geral do mês: receita, vendas e conversão.
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

        {data ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Receita (mês)</div>
              <div className="mt-2 text-2xl font-semibold">
                R$ {Number(data.monthly_revenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Vendas fechadas</div>
              <div className="mt-2 text-2xl font-semibold">{data.sales_closed ?? 0}</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Prospects (mês)</div>
              <div className="mt-2 text-2xl font-semibold">{data.prospects_created ?? 0}</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Taxa de conversão</div>
              <div className="mt-2 text-2xl font-semibold">
                {((data.conversion_rate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ) : !error ? (
          <p className="mt-6 text-sm text-zinc-500">Carregando…</p>
        ) : null}

        <div className="mt-6 text-sm">
          <a className="underline" href="/admin">
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}
