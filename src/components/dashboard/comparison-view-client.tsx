"use client";

import { useState, useMemo } from "react";
import { ComparisonTable } from "./comparison-table";
import { MunicipalComparisonRow } from "@/lib/analytics/elections";
import { Search, X } from "lucide-react";

interface ComparisonViewClientProps {
  rows: MunicipalComparisonRow[];
  yearsLabel: string;
}

export function ComparisonViewClient({ rows, yearsLabel }: ComparisonViewClientProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.municipalityName.toLowerCase().includes(s) ||
        r.previousWinnerParty?.toLowerCase().includes(s) ||
        r.currentWinnerParty?.toLowerCase().includes(s) ||
        r.previousWinnerName?.toLowerCase().includes(s) ||
        r.currentWinnerName?.toLowerCase().includes(s)
    );
  }, [rows, search]);

  const changedPartyRows = filteredRows.filter((row) => row.changedParty);
  const changedWinnerRows = filteredRows.filter((row) => row.changedWinner);
  const retainedRows = filteredRows.filter((row) => !row.changedWinner);

  return (
    <div className="space-y-10">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 -mx-4 bg-zinc-50/80 px-4 py-4 backdrop-blur-md dark:bg-zinc-950/80">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por município, partido ou nome..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-3 w-3 text-zinc-400" />
            </button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-xs text-zinc-500">
            Encontrados {filteredRows.length} municípios para "{search}"
          </p>
        )}
      </div>

      <div className="space-y-10">
        <section>
          <ComparisonTable
            title="Municípios com Mudança de Partido"
            description={`Trocas de comando partidário entre ${yearsLabel}.`}
            rows={changedPartyRows.slice(0, 50)}
          />
          {changedPartyRows.length > 50 && (
            <p className="mt-2 text-xs text-center text-zinc-400 italic">
              Exibindo os primeiros 50 de {changedPartyRows.length} resultados.
            </p>
          )}
        </section>

        <section>
          <ComparisonTable
            title="Municípios com Mudança de Vencedor"
            description="Mudança de nome vencedor (mesmo se o partido foi mantido)."
            rows={changedWinnerRows.slice(0, 50)}
          />
        </section>

        <section>
          <ComparisonTable
            title="Municípios com Continuidade"
            description={`Recorte de municípios que mantiveram a liderança nominal entre ${yearsLabel}.`}
            rows={retainedRows.slice(0, 50)}
          />
        </section>
      </div>
    </div>
  );
}
