import { getElectoralComparisons, getClosestMayoralDisputes, getPartyPerformanceBalances } from "@/lib/analytics/elections";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComparisonTable } from "@/components/dashboard/comparison-table";
import { DisputeTable } from "@/components/dashboard/dispute-table";
import { TerritorySummaryTable } from "@/components/dashboard/territory-summary-table";
import { PartyBalancePanel } from "@/components/dashboard/party-balance-panel";
import { ExportButton } from "@/components/dashboard/export-button";
import { TERRITORY_OPTIONS } from "@/lib/territory";
import Link from "next/link";

// Page is dynamic because it uses searchParams, but data is cached at the layer below.

export default async function ComparacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ territory?: string; type?: "municipal" | "federal" }>;
}) {
  const { territory, type = "municipal" } = await searchParams;
  const isFederal = type === "federal";
  const yearsLabel = isFederal ? "2018 x 2022" : "2020 x 2024";
  const officeLabel = isFederal ? "governador" : "prefeito";
  const currYear = isFederal ? "2022" : "2024";
  const prevYear = isFederal ? "2018" : "2020";

  const [{ overview, rows, territories }, closestDisputes, balances] = await Promise.all([
    getElectoralComparisons(type),
    getClosestMayoralDisputes(10),
    getPartyPerformanceBalances(type),
  ]);

  const filteredRows = territory
    ? rows.filter((row) => row.territorySlug === territory)
    : rows;
  const changedPartyRows = filteredRows.filter((row) => row.changedParty);
  const changedWinnerRows = filteredRows.filter((row) => row.changedWinner);
  const retainedRows = filteredRows.filter((row) => !row.changedWinner).slice(0, 20);
  const territoryLabel = territories.find((item) => item.territorySlug === territory)?.territoryLabel;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Comparação <span className="text-blue-600">{yearsLabel}</span>
          </h1>
          <p className="mt-1 text-zinc-500">
            Mudanças de liderança e continuidade partidária nas disputas para {officeLabel}.
          </p>
        </div>
        <div className="flex gap-3">
          <ExportButton 
            data={filteredRows.map(r => ({
              Municipio: r.municipalityName,
              Territorio: r.territoryLabel,
              [`Vencedor ${prevYear}`]: r.previousWinnerName,
              [`Partido ${prevYear}`]: r.previousWinnerParty,
              [`Vencedor ${currYear}`]: r.currentWinnerName,
              [`Partido ${currYear}`]: r.currentWinnerParty,
              [`Margem ${prevYear}`]: `${r.previousMarginPercentage?.toFixed(2)}%`,
              [`Margem ${currYear}`]: `${r.currentMarginPercentage?.toFixed(2)}%`,
              Alternancia: r.changedWinner ? "Sim" : "Não",
              TrocaPartido: r.changedParty ? "Sim" : "Não",
            }))}
            filename={`comparacao_bahia_${type}_${territory || "estado"}`}
          />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Municípios Comparados"
          value={filteredRows.length.toLocaleString("pt-BR")}
          subtitle={`base completa de ${overview.totalMunicipalitiesCompared.toLocaleString("pt-BR")} municípios para ${officeLabel}`}
        />
        <StatCard
          title="Mudaram de Vencedor"
          value={changedWinnerRows.length.toLocaleString("pt-BR")}
          subtitle={`${retainedRows.length.toLocaleString("pt-BR")} mantiveram o mesmo nome`}
        />
        <StatCard
          title="Mudaram de Partido"
          value={changedPartyRows.length.toLocaleString("pt-BR")}
          subtitle={`${(filteredRows.length - changedPartyRows.length).toLocaleString("pt-BR")} mantiveram o partido`}
        />
        <StatCard
          title={`Margem Média ${currYear}`}
          value={`${(filteredRows.reduce((sum, row) => sum + (row.currentMarginPercentage ?? 0), 0) / Math.max(filteredRows.length, 1)).toFixed(2)}%`}
          subtitle={`${prevYear}: ${(filteredRows.reduce((sum, row) => sum + (row.previousMarginPercentage ?? 0), 0) / Math.max(filteredRows.length, 1)).toFixed(2)}%`}
        />
      </div>
      
      <div className="mb-10">
        <PartyBalancePanel 
          balances={balances} 
          title={`Saldo Partidário - Bahia (${yearsLabel})`} 
        />
      </div>

      <div className="mb-10">
        <div className="mb-3 flex flex-wrap gap-2">
          <Link
            href="/comparacao"
            className={`rounded-full px-3 py-1.5 text-sm ${
              !territory
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Todo o estado
          </Link>
          {TERRITORY_OPTIONS.filter((option) => option.value !== "indefinido").map((option) => (
            <Link
              key={option.value}
              href={`/comparacao?territory=${option.value}`}
              className={`rounded-full px-3 py-1.5 text-sm ${
                territory === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <TerritorySummaryTable
          title="Resumo Territorial"
          description="Leitura regional estimada a partir do centroid geográfico de cada município."
          items={territories}
        />
      </div>

      <div className="mb-10">
        <ComparisonTable
          title="Municípios com Mudança de Partido"
          description={`Trocas mais relevantes de comando partidário entre ${yearsLabel}.`}
          rows={changedPartyRows.slice(0, 30)}
        />
      </div>

      <div className="mb-10">
        <ComparisonTable
          title="Municípios com Mudança de Vencedor"
          description="Mudança de nome vencedor, mesmo quando o partido foi mantido."
          rows={changedWinnerRows.slice(0, 30)}
        />
      </div>

      <div className="mb-10">
        <ComparisonTable
          title="Municípios com Continuidade"
          description={`Recorte de municípios que mantiveram a liderança nominal entre ${yearsLabel}.`}
          rows={retainedRows}
        />
      </div>

      {!isFederal && (
        <div className="mb-10">
          <DisputeTable
            title={`Disputas Mais Apertadas de ${currYear}`}
            description="Contexto complementar para ler onde a continuidade ou a troca foi mais sensível."
            items={closestDisputes}
          />
        </div>
      )}
    </div>
  );
}
