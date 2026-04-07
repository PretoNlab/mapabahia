"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ElectionInfo {
  id: string;
  year: number;
  round: number;
  type: string;
  description: string | null;
  candidateCount: number;
  voteResultCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  municipal: "Municipal",
  federal: "Federal/Estadual",
};

export function ElectionCards({
  elections,
}: {
  elections: ElectionInfo[];
}) {
  // Group by year, show only round 1 unless round 2 has data
  const byYear = new Map<number, ElectionInfo[]>();
  for (const e of elections) {
    const list = byYear.get(e.year) ?? [];
    list.push(e);
    byYear.set(e.year, list);
  }

  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-lg font-semibold">Eleicoes Disponiveis</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {years.map((year) => {
          const rounds = byYear.get(year)!;
          const main = rounds.find((r) => r.round === 1) ?? rounds[0];
          const totalCandidates = rounds.reduce(
            (s, r) => s + r.candidateCount,
            0
          );
          const totalVotes = rounds.reduce(
            (s, r) => s + r.voteResultCount,
            0
          );
          const hasRound2 = rounds.some(
            (r) => r.round === 2 && r.candidateCount > 0
          );

          return (
            <Link key={year} href={`/candidatos?year=${year}`}>
              <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-600 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{year}</span>
                    <Badge variant={main.type === "federal" ? "info" : "default"}>
                      {TYPE_LABELS[main.type] ?? main.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {main.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div>
                      <span className="font-semibold tabular-nums">
                        {totalCandidates.toLocaleString("pt-BR")}
                      </span>
                      <span className="ml-1 text-zinc-400">candidatos</span>
                    </div>
                    <div>
                      <span className="font-semibold tabular-nums">
                        {totalVotes.toLocaleString("pt-BR")}
                      </span>
                      <span className="ml-1 text-zinc-400">registros</span>
                    </div>
                  </div>
                  {hasRound2 && (
                    <p className="mt-2 text-xs text-amber-600">
                      Inclui 2o turno
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
