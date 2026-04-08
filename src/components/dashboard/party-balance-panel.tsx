import { PartyBalance } from "@/lib/analytics/elections";
import { cn } from "@/lib/utils";

interface PartyBalancePanelProps {
  balances: PartyBalance[];
  title: string;
}

export function PartyBalancePanel({ balances, title }: PartyBalancePanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {balances.map((item) => (
          <div key={item.party} className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{item.party}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{item.currentCount}</span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded leading-none",
                item.delta > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : 
                item.delta < 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30" : 
                "bg-zinc-50 text-zinc-400 dark:bg-zinc-800"
              )}>
                {item.delta > 0 ? `+${item.delta}` : item.delta}
              </span>
            </div>
            <div className="mt-1 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
               <div 
                 className={cn(
                   "h-full rounded-full transition-all duration-500",
                   item.delta > 0 ? "bg-emerald-500" : item.delta < 0 ? "bg-rose-500" : "bg-zinc-300"
                 )}
                 style={{ width: `${Math.min(100, (item.currentCount / Math.max(...balances.map(b => b.currentCount))) * 100)}%` }}
               />
            </div>
            <span className="text-[10px] text-zinc-400 mt-1">Anterior: {item.previousCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
