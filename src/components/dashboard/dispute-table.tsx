import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MayoralRaceSummary } from "@/lib/analytics/elections";

interface DisputeTableProps {
  title: string;
  description: string;
  items: MayoralRaceSummary[];
}

export function DisputeTable({
  title,
  description,
  items,
}: DisputeTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <Link
              key={item.municipalityId}
              href={`/municipio/${item.municipalityId}`}
              className="block rounded-xl border border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.municipalityName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {item.winnerName}
                        {item.winnerParty ? ` (${item.winnerParty})` : ""} vs{" "}
                        {item.runnerUpName}
                        {item.runnerUpParty ? ` (${item.runnerUpParty})` : ""}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {item.marginPercentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    diferença de {item.marginVotes.toLocaleString("pt-BR")} votos
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
