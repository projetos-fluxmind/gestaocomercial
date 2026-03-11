export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">CRM Vendas</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Acesse o sistema para continuar.
        </p>
        <a
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          href="/login"
        >
          Ir para login
        </a>
      </main>
    </div>
  );
}
