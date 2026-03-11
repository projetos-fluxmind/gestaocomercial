'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminSalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = getSession();
      if (!s) return (window.location.href = '/login');
      if (s.user.role !== 'admin') return (window.location.href = '/seller');

      try {
        const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
        const res: any = await apiFetch(`/api/companies/${meRes.company_id}/sales`, {
          token: s.access_token,
        });
        setSales(res.data ?? []);
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
            <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Lista de vendas registradas (empresa).
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
            Total ({sales.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {sales.map((s) => (
              <div key={s.id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="flex justify-between text-sm">
                  <div className="font-medium">R$ {Number(s.value).toFixed(2)}</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{s.status}</div>
                </div>
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  sale_id: {s.id}
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

