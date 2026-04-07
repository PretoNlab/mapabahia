import { getMunicipalComparisons, getClosestMayoralDisputes } from "@/lib/analytics/elections";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComparisonTable } from "@/components/dashboard/comparison-table";
import { DisputeTable } from "@/components/dashboard/dispute-table";
import { TerritorySummaryTable } from "@/components/dashboard/territory-summary-table";
import { TERRITORY_OPTIONS } from "@/lib/territory";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ComparacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ territory?: string }>;
}) {
  const { territory } = await searchParams;

  const [{ overview, rows, territories }, closestDisputes] = await Promise.all([
    getMunicipalComparisons(),
    getClosestMayoralDisputes(10),
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Comparação <span className="text-blue-600">2020 x 2024</span>
        </h1>
        <p className="mt-1 text-zinc-500">
          Mudanças de liderança e continuidade partidária nas disputas municipais para prefeito.
        </p>
        {territoryLabel && (
          <p className="mt-2 text-sm text-zinc-600">
            Filtro ativo: <span className="font-semibold">{territoryLabel}</span>
          </p>
        )}
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Municípios Comparados"
          value={filteredRows.length.toLocaleString("pt-BR")}
          subtitle={`base completa de ${overview.totalMunicipalitiesCompared.toLocaleString("pt-BR")} municípios para prefeito`}
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
          title="Margem Média 2024"
          value={`${(filteredRows.reduce((sum, row) => sum + (row.currentMarginPercentage ?? 0), 0) / Math.max(filteredRows.length, 1)).toFixed(2)}%`}
          subtitle={`2020: ${(filteredRows.reduce((sum, row) => sum + (row.previousMarginPercentage ?? 0), 0) / Math.max(filteredRows.length, 1)).toFixed(2)}%`}
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
          description="Trocas mais relevantes de comando partidário entre 2020 e 2024."
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
          description="Recorte de municípios que mantiveram a liderança nominal entre 2020 e 2024."
          rows={retainedRows}
        />
      </div>

      <div className="mb-10">
        <DisputeTable
          title="Disputas Mais Apertadas de 2024"
          description="Contexto complementar para ler onde a continuidade ou a troca foi mais sensível."
          items={closestDisputes}
        />
      </div>
    </div>
  );
}
