'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function SellerVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    if (s.user.role !== 'salesperson') return (window.location.href = '/admin');

    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      const [vehRes, clientsRes]: any[] = await Promise.all([
        apiFetch(`/api/companies/${meRes.company_id}/vehicles?limit=50`, { token: s.access_token }),
        apiFetch(`/api/companies/${meRes.company_id}/clients?limit=100`, { token: s.access_token }),
      ]);
      setVehicles(vehRes.data ?? []);
      setClients(clientsRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createVehicle() {
    const s = getSession();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      await apiFetch(`/api/companies/${meRes.company_id}/vehicles`, {
        method: 'POST',
        token: s.access_token,
        body: JSON.stringify({
          client_id: clientId,
          brand: brand || undefined,
          model: model || undefined,
          year: year ? Number(year) : undefined,
          plate: plate || undefined,
        }),
      });
      setClientId('');
      setBrand('');
      setModel('');
      setYear('');
      setPlate('');
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
            <h1 className="text-2xl font-semibold tracking-tight">Veículos</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Cadastre veículos vinculados a clientes.
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
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Cadastrar veículo</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Cliente *</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Marca"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Modelo"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Ano"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Placa"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            />
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button
            disabled={!clientId || loading}
            className="mt-3 h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
            onClick={createVehicle}
          >
            Cadastrar
          </button>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Lista ({vehicles.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {vehicles.map((v) => (
              <div key={v.id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="text-sm font-medium">
                  {v.brand ?? '—'} {v.model ?? ''} {v.year ?? ''}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Placa: {v.plate ?? '—'} · client_id: {v.client_id?.slice(0, 8)}…
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
