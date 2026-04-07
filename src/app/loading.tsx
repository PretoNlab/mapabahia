export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-8">
        <div>
          <div className="h-10 w-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-5 w-96 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-96 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
