import { getRanking } from "@/lib/analytics/rankings";
import { getClosestMayoralDisputes } from "@/lib/analytics/elections";
import {
  getDistribution,
  TURNOUT_BANDS,
  ABSTENTION_BANDS,
  ELECTORATE_BANDS,
} from "@/lib/analytics/distributions";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { DisputeTable } from "@/components/dashboard/dispute-table";
import { RankingTable } from "@/components/dashboard/ranking-table";
import { DistributionChart } from "@/components/charts/distribution-chart";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const [
    topElectorate,
    bottomElectorate,
    topTurnout,
    bottomTurnout,
    topAbstention,
    bottomAbstention,
    turnoutDist,
    abstentionDist,
    electorateDist,
    closestDisputes,
  ] = await Promise.all([
    getRanking("eligibleVoters", "desc", 10),
    getRanking("eligibleVoters", "asc", 10),
    getRanking("turnoutPercentage", "desc", 10),
    getRanking("turnoutPercentage", "asc", 10),
    getRanking("abstentionPercentage", "desc", 10),
    getRanking("abstentionPercentage", "asc", 10),
    getDistribution("turnoutPercentage", TURNOUT_BANDS),
    getDistribution("abstentionPercentage", ABSTENTION_BANDS),
    getDistribution("eligibleVoters", ELECTORATE_BANDS),
    getClosestMayoralDisputes(10),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Rankings e <span className="text-blue-600">Distribuicoes</span>
        </h1>
        <p className="mt-1 text-zinc-500">
          Comparacoes e rankings completos dos municipios da Bahia
        </p>
      </div>

      {/* Distributions */}
      <h2 className="mb-4 text-xl font-semibold">
        Distribuicao por Faixas
      </h2>
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DistributionChart
          title="Comparecimento"
          data={turnoutDist}
          gradient={["#10b981", "#065f46"]}
        />
        <DistributionChart
          title="Abstencao"
          data={abstentionDist}
          gradient={["#fca5a5", "#991b1b"]}
        />
        <DistributionChart
          title="Eleitorado"
          data={electorateDist}
          gradient={["#93c5fd", "#1e3a5f"]}
        />
      </div>

      <div className="mb-10">
        <DisputeTable
          title="Disputas Mais Apertadas para Prefeito"
          description="Municípios em que a eleição municipal de 2024 teve a menor margem entre primeiro e segundo colocado."
          items={closestDisputes}
        />
      </div>

      {/* Rankings Grid */}
      <h2 className="mb-4 text-xl font-semibold">Rankings Top 10</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingTable
          title="Maiores Eleitorados"
          items={topElectorate.map((i) => ({ ...i, formattedValue: formatNumber(i.value) }))}
        />
        <RankingTable
          title="Menores Eleitorados"
          items={bottomElectorate.map((i) => ({ ...i, formattedValue: formatNumber(i.value) }))}
        />
        <RankingTable
          title="Maior Comparecimento (%)"
          items={topTurnout.map((i) => ({ ...i, formattedValue: formatPercentage(i.value) }))}
        />
        <RankingTable
          title="Menor Comparecimento (%)"
          items={bottomTurnout.map((i) => ({ ...i, formattedValue: formatPercentage(i.value) }))}
        />
        <RankingTable
          title="Maior Abstencao (%)"
          items={topAbstention.map((i) => ({ ...i, formattedValue: formatPercentage(i.value) }))}
        />
        <RankingTable
          title="Menor Abstencao (%)"
          items={bottomAbstention.map((i) => ({ ...i, formattedValue: formatPercentage(i.value) }))}
        />
      </div>
    </div>
  );
}
