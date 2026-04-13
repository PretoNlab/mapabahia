"use client";

import { useState, useMemo } from "react";
import { ComparisonTable } from "./comparison-table";
import { MunicipalComparisonRow } from "@/lib/analytics/elections";
import { Search, X, Info } from "lucide-react";

interface ComparisonViewClientProps {
  rows: MunicipalComparisonRow[];
  yearsLabel: string;
  prevYear: string;
  currYear: string;
  isMajoritarian?: boolean;
}

export function ComparisonViewClient({
  rows,
  yearsLabel,
  prevYear,
  currYear,
  isMajoritarian = true,
}: ComparisonViewClientProps) {
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

  const titleChangedParty = isMajoritarian
    ? "Municípios com Mudança de Partido"
    : "Municípios onde o partido mais votado mudou";
  const titleChangedWinner = isMajoritarian
    ? "Municípios com Mudança de Vencedor"
    : "Municípios onde o candidato mais votado mudou";
  const titleRetained = isMajoritarian
    ? "Municípios com Continuidade"
    : "Municípios que mantiveram o mesmo candidato no topo";

  const descriptionChangedParty = isMajoritarian
    ? `Trocas de comando partidário entre ${yearsLabel}.`
    : `Municípios em que o partido do candidato mais votado mudou entre ${yearsLabel}.`;
  const descriptionChangedWinner = isMajoritarian
    ? "Mudança de nome vencedor (mesmo se o partido foi mantido)."
    : "Mudança de candidato no topo da votação (mesmo se o partido foi mantido).";
  const descriptionRetained = isMajoritarian
    ? `Recorte de municípios que mantiveram a liderança nominal entre ${yearsLabel}.`
    : `Municípios em que o mesmo candidato liderou a votação em ${prevYear} e ${currYear}.`;

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
            Encontrados {filteredRows.length} municípios para &quot;{search}&quot;
          </p>
        )}
      </div>

      {!isMajoritarian && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p>
            Em eleições proporcionais e plurinominais (senador, deputado federal
            e estadual), o candidato mais votado em um município não é
            necessariamente o eleito — a eleição é decidida pelo total estadual
            e pelo quociente partidário. Leia as tabelas abaixo como &quot;quem
            liderou a votação em cada município&quot;, não como &quot;quem foi
            eleito&quot;.
          </p>
        </div>
      )}

      <div className="space-y-10">
        <section>
          <ComparisonTable
            title={titleChangedParty}
            description={descriptionChangedParty}
            rows={changedPartyRows.slice(0, 50)}
            prevYear={prevYear}
            currYear={currYear}
            isMajoritarian={isMajoritarian}
          />
          {changedPartyRows.length > 50 && (
            <p className="mt-2 text-xs text-center text-zinc-400 italic">
              Exibindo os primeiros 50 de {changedPartyRows.length} resultados.
            </p>
          )}
        </section>

        <section>
          <ComparisonTable
            title={titleChangedWinner}
            description={descriptionChangedWinner}
            rows={changedWinnerRows.slice(0, 50)}
            prevYear={prevYear}
            currYear={currYear}
            isMajoritarian={isMajoritarian}
          />
        </section>

        <section>
          <ComparisonTable
            title={titleRetained}
            description={descriptionRetained}
            rows={retainedRows.slice(0, 50)}
            prevYear={prevYear}
            currYear={currYear}
            isMajoritarian={isMajoritarian}
          />
        </section>
      </div>
    </div>
  );
}
