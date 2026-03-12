'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    if (s.user.role !== 'admin') return (window.location.href = '/seller');

    try {
      const meRes: any = await apiFetch('/api/users/me');
      const url = statusFilter
        ? `/api/companies/${meRes.company_id}/clients?status=${statusFilter}&limit=50`
        : `/api/companies/${meRes.company_id}/clients?limit=50`;
      const res: any = await apiFetch(url);
      setClients(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function updateClientStatus(clientId: string, newStatus: 'prospect' | 'client') {
    const s = getSession();
    if (!s) return;
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me');
      await apiFetch(`/api/companies/${meRes.company_id}/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  async function createClient() {
    const s = getSession();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me');
      await apiFetch(`/api/companies/${meRes.company_id}/clients`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          status: 'prospect',
        }),
      });
      setName('');
      setEmail('');
      setPhone('');
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
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Listar e cadastrar prospects/clientes.
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

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Novo cliente / prospect</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Nome *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button
            disabled={!name.trim() || loading}
            className="mt-3 h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
            onClick={createClient}
          >
            Cadastrar
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <select
            className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="prospect">Prospects</option>
            <option value="client">Clientes</option>
          </select>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Lista ({clients.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border p-4 dark:border-zinc-800">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{c.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {c.email ?? '—'} · {c.phone ?? '—'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {c.status === 'prospect' ? (
                    <button
                      type="button"
                      className="rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                      onClick={() => updateClientStatus(c.id, 'client')}
                    >
                      Virar cliente
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                      onClick={() => updateClientStatus(c.id, 'prospect')}
                    >
                      Voltar prospect
                    </button>
                  )}
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
