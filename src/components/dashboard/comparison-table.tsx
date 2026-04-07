import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MunicipalComparisonRow } from "@/lib/analytics/elections";

interface ComparisonTableProps {
  title: string;
  description: string;
  rows: MunicipalComparisonRow[];
}

export function ComparisonTable({
  title,
  description,
  rows,
}: ComparisonTableProps) {
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
                <th className="pb-3 text-left font-medium text-zinc-500">Município</th>
                <th className="pb-3 text-left font-medium text-zinc-500">2020</th>
                <th className="pb-3 text-left font-medium text-zinc-500">2024</th>
                <th className="pb-3 text-right font-medium text-zinc-500">Mudança</th>
                <th className="pb-3 text-right font-medium text-zinc-500">Margem 2024</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.municipalityId}
                  className="border-b border-zinc-100 dark:border-zinc-800/50"
                >
                  <td className="py-3">
                    <Link
                      href={`/municipio/${row.municipalityId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.municipalityName}
                    </Link>
                  </td>
                  <td className="py-3 text-zinc-600">
                    {row.previousWinnerName ?? "—"}
                    {row.previousWinnerParty ? ` (${row.previousWinnerParty})` : ""}
                  </td>
                  <td className="py-3 text-zinc-600">
                    {row.currentWinnerName ?? "—"}
                    {row.currentWinnerParty ? ` (${row.currentWinnerParty})` : ""}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={
                        row.changedParty
                          ? "font-semibold text-amber-600"
                          : row.changedWinner
                            ? "font-semibold text-blue-600"
                            : "text-zinc-500"
                      }
                    >
                      {row.changedParty
                        ? "Mudou partido"
                        : row.changedWinner
                          ? "Mudou nome"
                          : "Manteve"}
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums font-semibold">
                    {row.currentMarginPercentage?.toFixed(2) ?? "—"}%
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
