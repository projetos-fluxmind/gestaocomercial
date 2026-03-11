'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';

export default function SellerActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [entityType, setEntityType] = useState('client');
  const [action, setAction] = useState('view');
  const [entityId, setEntityId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const s = getSession();
    if (!s) return (window.location.href = '/login');
    if (s.user.role !== 'salesperson') return (window.location.href = '/admin');

    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      const res: any = await apiFetch(`/api/companies/${meRes.company_id}/activities`, {
        token: s.access_token,
      });
      setActivities(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function logActivity() {
    const s = getSession();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const meRes: any = await apiFetch('/api/users/me', { token: s.access_token });
      await apiFetch(`/api/companies/${meRes.company_id}/activities`, {
        method: 'POST',
        token: s.access_token,
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId || undefined,
          action,
          payload: {},
        }),
      });
      setEntityId('');
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
            <h1 className="text-2xl font-semibold tracking-tight">Atividades</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Registre e veja seu histórico de atividades.
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
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Registrar atividade</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Tipo (ex: client)"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Ação (ex: view, call)"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <input
              className="h-11 rounded-xl border px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="ID entidade (opcional)"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
            <button
              disabled={loading}
              className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
              onClick={logActivity}
            >
              Registrar
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Histórico ({activities.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {activities.map((a) => (
              <div key={a.id} className="rounded-xl border p-4 dark:border-zinc-800">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{a.entity_type}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {new Date(a.created_at).toLocaleString()}
                  {a.entity_id ? ` · ${a.entity_id}` : ''}
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
