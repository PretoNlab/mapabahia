import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TerritoryComparisonSummary } from "@/lib/analytics/elections";

interface TerritorySummaryTableProps {
  title: string;
  description: string;
  items: TerritoryComparisonSummary[];
}

export function TerritorySummaryTable({
  title,
  description,
  items,
}: TerritorySummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-3 text-left font-medium text-zinc-500">Território</th>
                <th className="pb-3 text-right font-medium text-zinc-500">Municípios</th>
                <th className="pb-3 text-right font-medium text-zinc-500">Mudança de vencedor</th>
                <th className="pb-3 text-right font-medium text-zinc-500">Mudança de partido</th>
                <th className="pb-3 text-right font-medium text-zinc-500">Margem média 2024</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.territorySlug}
                  className="border-b border-zinc-100 dark:border-zinc-800/50"
                >
                  <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {item.territoryLabel}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {item.municipalityCount.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {item.changedWinnerCount.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 text-right tabular-nums font-semibold">
                    {item.changedPartyCount.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {item.averageCurrentMargin.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
