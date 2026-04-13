import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MunicipalComparisonRow } from "@/lib/analytics/elections";

interface ComparisonTableProps {
  title: string;
  description: string;
  rows: MunicipalComparisonRow[];
  prevYear: string;
  currYear: string;
  isMajoritarian?: boolean;
}

export function ComparisonTable({
  title,
  description,
  rows,
  prevYear,
  currYear,
  isMajoritarian = true,
}: ComparisonTableProps) {
  const changeHeader = isMajoritarian ? "Mudança" : "Diferença";
  const marginHeader = isMajoritarian
    ? `Margem ${currYear}`
    : `Vantagem sobre 2º (${currYear})`;

  const labelForChangedParty = isMajoritarian ? "Mudou partido" : "Partido diferente";
  const labelForChangedWinner = isMajoritarian ? "Mudou nome" : "Nome diferente";
  const labelForRetained = "Manteve";

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
                <th className="pb-3 text-left font-medium text-zinc-500">{prevYear}</th>
                <th className="pb-3 text-left font-medium text-zinc-500">{currYear}</th>
                <th className="pb-3 text-right font-medium text-zinc-500">{changeHeader}</th>
                <th className="pb-3 text-right font-medium text-zinc-500">{marginHeader}</th>
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
                        ? labelForChangedParty
                        : row.changedWinner
                          ? labelForChangedWinner
                          : labelForRetained}
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
