'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function AdminGoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [targetType, setTargetType] = useState<'revenue' | 'count' | 'conversion'>('revenue');
  const [targetValue, setTargetValue] = useState('');
  const [salespersonId, setSalespersonId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    if (s.user.role !== 'admin') return (window.location.href = '/seller');

    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      const [goalsRes, usersRes]: any[] = await Promise.all([
        apiFetch(`/api/companies/${meRes.company_id}/goals`, { token: s.access_token }),
        apiFetch(`/api/companies/${meRes.company_id}/users`, { token: s.access_token }),
      ]);
      setGoals(goalsRes.data ?? []);
      setUsers((usersRes.data ?? []).filter((u: any) => u.role === 'salesperson'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createGoal() {
    const s = getSession();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      await apiFetch(`/api/companies/${meRes.company_id}/goals`, {
        method: 'POST',
        token: s.access_token,
        body: JSON.stringify({
          salesperson_id: salespersonId,
          title,
          target_type: targetType,
          target_value: targetValue ? Number(targetValue) : undefined,
          period_start: periodStart || new Date().toISOString().slice(0, 10),
          period_end: periodEnd || new Date().toISOString().slice(0, 10),
        }),
      });
      setTitle('');
      setTargetValue('');
      setSalespersonId('');
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
            <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Crie e acompanhe metas por vendedor.
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
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Nova meta</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              value={salespersonId}
              onChange={(e) => setSalespersonId(e.target.value)}
            >
              <option value="">Vendedor…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
            >
              <option value="revenue">Receita</option>
              <option value="count">Quantidade</option>
              <option value="conversion">Conversão</option>
            </select>
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Valor alvo (opcional)"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
            <input
              type="date"
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <input
              type="date"
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button
            disabled={!title || !salespersonId || loading}
            className="mt-3 h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
            onClick={createGoal}
          >
            Criar meta
          </button>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Lista ({goals.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {goals.map((g) => (
              <div key={g.id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{g.status}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {g.target_type} · {g.period_start} → {g.period_end} · atual: {g.current_value}
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
