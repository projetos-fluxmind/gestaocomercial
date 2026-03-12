'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';
import type { ApiListResponse, Plan, UserMe, Vehicle } from '@/lib/types';

export default function SellerSalesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [planId, setPlanId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [value, setValue] = useState('1000');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const s = getSession();
      if (!s) return (window.location.href = '/login');
      if (s.user.role !== 'salesperson') return (window.location.href = '/admin');

      try {
        const meRes = await apiFetch<UserMe>('/api/users/me', { token: s.access_token });
        setCompanyId(meRes.company_id);

        const plansRes = await apiFetch<ApiListResponse<Plan>>(`/api/companies/${meRes.company_id}/plans`, {
          token: s.access_token,
        });
        setPlans(plansRes.data ?? []);

        const vehRes = await apiFetch<ApiListResponse<Vehicle>>(`/api/companies/${meRes.company_id}/vehicles`, {
          token: s.access_token,
        });
        setVehicles(vehRes.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      }
    })();
  }, []);

  async function submit() {
    const s = getSession();
    if (!s || !companyId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<unknown>(`/api/companies/${companyId}/sales`, {
        method: 'POST',
        token: s.access_token,
        body: JSON.stringify({
          vehicle_id: vehicleId,
          plan_id: planId,
          value: Number(value),
          status: 'closed',
        }),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Registrar venda</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Fecha uma venda e gera comissÃ£o automaticamente.</p>
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
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Plano</span>
              <select
                className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                <option value="">Selecioneâ€¦</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium">VeÃ­culo</span>
              <select
                className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Selecioneâ€¦</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand ?? 'â€”'} {v.model ?? ''} ({v.id.slice(0, 8)}â€¦)
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium">Valor</span>
              <input
                className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
              />
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              onClick={submit}
              disabled={!planId || !vehicleId || loading}
              className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {loading ? 'Enviandoâ€¦' : 'Registrar venda'}
            </button>
          </div>
        </div>

        {result ? (
          <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Resultado</h2>
            <pre className="mt-2 overflow-auto rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : null}

        <div className="mt-6 text-sm">
          <a className="underline" href="/seller">
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}