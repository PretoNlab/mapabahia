import { getElectoralComparisons, getClosestMayoralDisputes, getPartyPerformanceBalances } from "@/lib/analytics/elections";
import { StatCard } from "@/components/dashboard/stat-card";
import { DisputeTable } from "@/components/dashboard/dispute-table";
import { TerritorySummaryTable } from "@/components/dashboard/territory-summary-table";
import { PartyBalancePanel } from "@/components/dashboard/party-balance-panel";
import { ExportButton } from "@/components/dashboard/export-button";
import { PartyGainLossChart } from "@/components/charts/party-gain-loss-chart";
import { ComparisonViewClient } from "@/components/dashboard/comparison-view-client";
import { TERRITORY_OPTIONS } from "@/lib/territory";
import { ChevronRight, Filter } from "lucide-react";
import Link from "next/link";

export default async function ComparacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ territory?: string; type?: "municipal" | "federal"; office?: string }>;
}) {
  const { territory, type = "municipal", office } = await searchParams;
  const isFederal = type === "federal";
  const targetOffice = office || (isFederal ? "governador" : "prefeito");
  const yearsLabel = isFederal ? "2018 x 2022" : "2020 x 2024";
  
  const officeLabels: Record<string, string> = {
    governador: "Governador",
    senador: "Senador",
    dep_federal: "Deputado Federal",
    dep_estadual: "Deputado Estadual",
    prefeito: "Prefeito",
  };

  const officeLabel = officeLabels[targetOffice] || targetOffice;
  const currYear = isFederal ? "2022" : "2024";
  const prevYear = isFederal ? "2018" : "2020";
  // Prefeito and governador are majoritarian; senador/dep_federal/dep_estadual
  // are plurinominal or proportional, so "winner per município" is misleading
  // and the UI uses softer, more descriptive language.
  const isMajoritarian = targetOffice === "prefeito" || targetOffice === "governador";

  const [{ overview, rows, territories }, closestDisputes, balances] = await Promise.all([
    getElectoralComparisons(type, targetOffice),
    getClosestMayoralDisputes(10),
    getPartyPerformanceBalances(type, targetOffice),
  ]);

  const filteredRows = territory
    ? rows.filter((row) => row.territorySlug === territory)
    : rows;
  const changedPartyRows = filteredRows.filter((row) => row.changedParty);
  const changedWinnerRows = filteredRows.filter((row) => row.changedWinner);
  const retainedCount = filteredRows.length - changedWinnerRows.length;
  
  const territoryLabel = territory 
    ? TERRITORY_OPTIONS.find((t) => t.value === territory)?.label 
    : "Todo o estado";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 mb-2">
            <span>Resultados</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-blue-600">Comparação {yearsLabel}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            {officeLabel} <span className="text-blue-600">Bahia</span>
          </h1>
          <p className="mt-2 text-lg text-zinc-500 max-w-2xl">
            {isMajoritarian
              ? "Análise detalhada de continuidade e alternância de lideranças locais e regionais."
              : `Quem liderou a votação em cada município entre ${prevYear} e ${currYear}. Em eleições proporcionais, o mais votado do município não equivale ao eleito.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Stats Overview */}
      <div className={`mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 ${isMajoritarian ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <StatCard
          title="Municípios"
          value={filteredRows.length.toLocaleString("pt-BR")}
          subtitle={`Filtrados de ${overview.totalMunicipalitiesCompared} totais`}
        />
        <StatCard
          title={isMajoritarian ? "Mudaram de Vencedor" : "Candidato mais votado mudou"}
          value={changedWinnerRows.length.toLocaleString("pt-BR")}
          subtitle={`${retainedCount.toLocaleString("pt-BR")} mantiveram o mesmo ${isMajoritarian ? "nome" : "candidato no topo"}`}
          trend="up"
        />
        {isMajoritarian && (
          <StatCard
            title="Mudaram de Partido"
            value={changedPartyRows.length.toLocaleString("pt-BR")}
            subtitle={`${(filteredRows.length - changedPartyRows.length).toLocaleString("pt-BR")} mantiveram a legenda`}
            trend="up"
          />
        )}
        <StatCard
          title={isMajoritarian ? `Margem Média ${currYear}` : `Vantagem média do 1º (${currYear})`}
          value={`${(filteredRows.reduce((sum, row) => sum + (row.currentMarginPercentage ?? 0), 0) / Math.max(filteredRows.length, 1)).toFixed(2)}%`}
          subtitle={`${prevYear}: ${(filteredRows.reduce((sum, row) => sum + (row.previousMarginPercentage ?? 0), 0) / Math.max(filteredRows.length, 1)).toFixed(2)}%`}
        />
      </div>
      
      {/* Visual Analytics Section */}
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PartyGainLossChart balances={balances} title="Ganhos e Perdas de Comando" />
        </div>
        <div className="lg:col-span-2">
          <PartyBalancePanel 
            balances={balances} 
            title={`Saldo Partidário - Bahia (${yearsLabel})`} 
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-10 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="flex items-center gap-2 mb-6 text-zinc-900 dark:text-zinc-100 font-bold">
          <Filter className="h-4 w-4 text-blue-600" />
          <h2>Refinar Visualização</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Cargo</h3>
            <div className="flex flex-wrap gap-2">
              {!isFederal ? (
                <Link
                  href="/comparacao?type=municipal&office=prefeito"
                  className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                    targetOffice === "prefeito"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white text-zinc-600 border border-zinc-200 hover:border-blue-400 hover:text-blue-600 dark:bg-zinc-900 dark:border-zinc-800"
                  }`}
                >
                  Prefeito
                </Link>
              ) : (
                <>
                  {[
                    { id: "governador", label: "Governador" },
                    { id: "senador", label: "Senador" },
                    { id: "dep_federal", label: "Dep. Federal" },
                    { id: "dep_estadual", label: "Dep. Estadual" },
                  ].map((off) => (
                    <Link
                      key={off.id}
                      href={`/comparacao?type=federal&office=${off.id}${territory ? `&territory=${territory}` : ""}`}
                      className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                        targetOffice === off.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "bg-white text-zinc-600 border border-zinc-200 hover:border-blue-400 hover:text-blue-600 dark:bg-zinc-900 dark:border-zinc-800"
                      }`}
                    >
                      {off.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Território (Recorte)</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/comparacao?type=${type}${office ? `&office=${office}` : ""}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  !territory
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                Todo o estado
              </Link>
              {TERRITORY_OPTIONS.filter((option) => option.value !== "indefinido").map((option) => (
                <Link
                  key={option.value}
                  href={`/comparacao?type=${type}${office ? `&office=${office}` : ""}&territory=${option.value}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    territory === option.value
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <TerritorySummaryTable
          title={`Distribuição Regional (${officeLabel})`}
          description={
            isMajoritarian
              ? "Volume de municípios e saldo de alternância por território de identidade."
              : "Volume de municípios e quantos tiveram troca no candidato/partido mais votado por território."
          }
          items={territories}
          currYear={currYear}
          isMajoritarian={isMajoritarian}
        />
      </div>

      {/* Main Content Area - Searchable Table */}
      <div className="mt-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">Detalhamento dos Municípios</h2>
        <p className="text-zinc-500 mb-8">Utilize a busca abaixo para encontrar municípios específicos ou grupos partidários.</p>
        
        <ComparisonViewClient
          rows={filteredRows}
          yearsLabel={yearsLabel}
          prevYear={prevYear}
          currYear={currYear}
          isMajoritarian={isMajoritarian}
        />
      </div>

      {!isFederal && (
        <div className="mt-20 pt-10 border-t border-zinc-200 dark:border-zinc-800">
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
