export default function MapaLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-5 w-80 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-6 h-[600px] rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
      </div>
    </div>
  );
}
