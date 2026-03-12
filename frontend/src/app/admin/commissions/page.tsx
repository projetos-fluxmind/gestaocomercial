'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminCommissionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    if (s.user.role !== 'admin') return (window.location.href = '/seller');
    try {
      const meRes: any = await apiFetch('/api/users/me');
      const res: any = await apiFetch(`/api/companies/${meRes.company_id}/commissions`);
      setData(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAsPaid(commissionId: string) {
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me');
      await apiFetch(`/api/companies/${meRes.company_id}/commissions/${commissionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paid' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Comissões</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Histórico de comissões.
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
            Total ({data.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {data.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border p-4 dark:border-zinc-800">
                <div>
                  <div className="flex justify-between text-sm">
                    <div className="font-medium">R$ {Number(c.amount).toFixed(2)}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{c.status}</div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    sale_id: {c.sale_id}
                  </div>
                </div>
                {c.status === 'pending' && (
                  <button
                    type="button"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    onClick={() => markAsPaid(c.id)}
                  >
                    Marcar como pago
                  </button>
                )}
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

