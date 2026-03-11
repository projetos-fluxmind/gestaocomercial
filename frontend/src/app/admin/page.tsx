'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminDashboard() {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/login';
      return;
    }
    if (s.user.role !== 'admin') {
      window.location.href = '/seller';
      return;
    }

    apiFetch('/api/users/me', { token: s.access_token })
      .then(setMe)
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar'));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Admin</h1>
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card title="Vendas (mês)" value="—" />
          <Card title="Receita (mês)" value="—" />
          <Card title="Conversão" value="—" />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Nav href="/admin/plans" title="Planos" />
          <Nav href="/admin/sales" title="Vendas" />
          <Nav href="/admin/goals" title="Metas" />
          <Nav href="/admin/commissions" title="Comissões" />
          <Nav href="/admin/ranking" title="Ranking" />
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Sessão</h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : (
            <pre className="mt-2 overflow-auto rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
              {JSON.stringify(me, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function Card(props: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{props.title}</div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
    </div>
  );
}

function Nav(props: { href: string; title: string }) {
  return (
    <a
      href={props.href}
      className="rounded-2xl border bg-white p-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      {props.title}
    </a>
  );
}

