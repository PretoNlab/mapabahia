import { PartyBalance } from "@/lib/analytics/elections";
import { cn } from "@/lib/utils";

interface PartyBalancePanelProps {
  balances: PartyBalance[];
  title: string;
}

export function PartyBalancePanel({ balances, title }: PartyBalancePanelProps) {
  const maxCount = Math.max(...balances.map((b) => b.currentCount), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">{title}</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {balances.map((item) => (
          <div 
            key={item.party} 
            className="group flex flex-col transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                {item.party}
              </span>
              <span className={cn(
                "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                item.delta > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : 
                item.delta < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" : 
                "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
              )}>
                {item.delta > 0 ? `+${item.delta}` : item.delta}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                {item.currentCount}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">municípios</span>
            </div>

            <div className="mt-2 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
               <div 
                 className={cn(
                   "h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80",
                   item.delta > 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                   item.delta < 0 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : 
                   "bg-zinc-400"
                 )}
                 style={{ width: `${(item.currentCount / maxCount) * 100}%` }}
               />
            </div>
            
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-zinc-400">Anterior</span>
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">{item.previousCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
