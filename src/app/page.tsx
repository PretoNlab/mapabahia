import { getStateOverview, getRanking, getAutoInsights } from "@/lib/analytics/rankings";
import { getDistribution, TURNOUT_BANDS, ABSTENTION_BANDS } from "@/lib/analytics/distributions";
import { getClosestMayoralDisputes } from "@/lib/analytics/elections";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankingTable } from "@/components/dashboard/ranking-table";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { SearchBar } from "@/components/dashboard/search-bar";
import { InsightList } from "@/components/insights/insight-list";
import { ElectionCards } from "@/components/dashboard/election-cards";
import { CandidateSpotlight } from "@/components/dashboard/candidate-spotlight";
import { DisputeTable } from "@/components/dashboard/dispute-table";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCandidateHighlights() {
  const [topCandidatesRaw, topMayorsRaw] = await Promise.all([
    prisma.voteResult.groupBy({
      by: ["candidateId"],
      _sum: { votes: true },
      orderBy: { _sum: { votes: "desc" } },
      take: 6,
    }),
    prisma.voteResult.groupBy({
      by: ["candidateId"],
      where: {
        candidate: { is: { office: "prefeito" } },
        election: { is: { year: 2024, round: 1, type: "municipal" } },
      },
      _sum: { votes: true },
      orderBy: { _sum: { votes: "desc" } },
      take: 6,
    }),
  ]);

  const candidateIds = [...new Set([
    ...topCandidatesRaw.map((item) => item.candidateId),
    ...topMayorsRaw.map((item) => item.candidateId),
  ])];

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds } },
    include: {
      election: {
        select: { year: true, round: true },
      },
    },
  });

  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  const mapHighlights = (items: typeof topCandidatesRaw) =>
    items
      .map((item) => {
        const candidate = candidateMap.get(item.candidateId);
        if (!candidate) return null;

        return {
          id: candidate.id,
          ballotName: candidate.ballotName,
          party: candidate.party,
          office: candidate.office,
          year: candidate.election.year,
          round: candidate.election.round,
          totalVotes: item._sum.votes ?? 0,
          status: candidate.status,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    topCandidates: mapHighlights(topCandidatesRaw),
    topMayors2024: mapHighlights(topMayorsRaw),
  };
}

export default async function DashboardPage() {
  const [overview, topElectorate, topTurnout, topAbstention, insights, turnoutDist, abstentionDist, elections, candidateHighlights, closestDisputes] =
    await Promise.all([
      getStateOverview(),
      getRanking("eligibleVoters", "desc", 10),
      getRanking("turnoutPercentage", "desc", 10),
      getRanking("abstentionPercentage", "desc", 10),
      getAutoInsights(),
      getDistribution("turnoutPercentage", TURNOUT_BANDS),
      getDistribution("abstentionPercentage", ABSTENTION_BANDS),
      prisma.election.findMany({
        orderBy: [{ year: "desc" }, { round: "asc" }],
        select: {
          id: true, year: true, round: true, type: true, description: true,
          _count: { select: { candidates: true, voteResults: true } },
        },
      }),
      getCandidateHighlights(),
      getClosestMayoralDisputes(5),
    ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 px-8 py-10 text-white shadow-lg">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-4xl font-bold tracking-tight">
            Pulso Bahia
          </h1>
          <p className="mt-2 text-lg text-blue-100">
            Inteligencia eleitoral e territorial — Eleicoes Municipais 2024
          </p>
          <div className="mt-6">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Municipios"
          value={formatNumber(overview.totalMunicipalities)}
          subtitle="cadastrados no sistema"
        />
        <StatCard
          title="Documentos Processados"
          value={formatNumber(overview.totalProcessed)}
          subtitle={
            overview.totalErrors > 0
              ? `${overview.totalErrors} com erro`
              : "todos processados"
          }
          trend={overview.totalErrors > 0 ? "down" : "up"}
        />
        <StatCard
          title="Eleitorado Total"
          value={formatNumber(overview.totalEligibleVoters)}
          subtitle="eleitores aptos na Bahia"
        />
        <StatCard
          title="Comparecimento Medio"
          value={formatPercentage(overview.avgTurnoutPercentage)}
          subtitle={`Mediana: ${formatPercentage(overview.medianTurnoutPercentage)}`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Comparecimento"
          value={formatNumber(overview.totalTurnout)}
          subtitle="votos computados"
        />
        <StatCard
          title="Abstencao Media"
          value={formatPercentage(overview.avgAbstentionPercentage)}
          subtitle={`Mediana: ${formatPercentage(overview.medianAbstentionPercentage)}`}
        />
        <StatCard
          title="Total Abstencao"
          value={formatNumber(overview.totalAbstention)}
          subtitle="eleitores que nao votaram"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-10 flex flex-wrap gap-3">
        <Link
          href="/candidatos"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Buscar Candidatos
        </Link>
        <Link
          href="/mapa"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Ver Mapa da Bahia
        </Link>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Rankings Completos
        </Link>
        <Link
          href="/comparacao"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Comparar 2020 x 2024
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Painel Admin
        </Link>
      </div>

      {/* Election Cards */}
      <ElectionCards
        elections={elections.map((e) => ({
          id: e.id,
          year: e.year,
          round: e.round,
          type: e.type,
          description: e.description,
          candidateCount: e._count.candidates,
          voteResultCount: e._count.voteResults,
        }))}
      />

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CandidateSpotlight
          title="Candidatos Em Destaque"
          description="Os nomes com maior volume de votos no banco carregado."
          items={candidateHighlights.topCandidates}
        />
        <CandidateSpotlight
          title="Prefeitos 2024 Em Evidencia"
          description="Recorte dos candidatos a prefeito com mais votos no 1º turno municipal de 2024."
          items={candidateHighlights.topMayors2024}
        />
      </div>

      <div className="mb-10">
        <DisputeTable
          title="Municipios Em Disputa"
          description="Corridas mais apertadas para prefeito no 1º turno municipal de 2024."
          items={closestDisputes}
        />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-10">
          <InsightList title="Insights Automaticos" insights={insights} />
        </div>
      )}

      {/* Distribution Charts */}
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DistributionChart
          title="Distribuicao de Comparecimento"
          data={turnoutDist}
          gradient={["#10b981", "#065f46"]}
        />
        <DistributionChart
          title="Distribuicao de Abstencao"
          data={abstentionDist}
          gradient={["#fca5a5", "#991b1b"]}
        />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RankingTable
          title="Maiores Eleitorados"
          items={topElectorate.map((i) => ({ ...i, formattedValue: formatNumber(i.value) }))}
        />
        <RankingTable
          title="Maior Comparecimento (%)"
          items={topTurnout.map((i) => ({ ...i, formattedValue: formatPercentage(i.value) }))}
        />
        <RankingTable
          title="Maior Abstencao (%)"
          items={topAbstention.map((i) => ({ ...i, formattedValue: formatPercentage(i.value) }))}
        />
      </div>
    </div>
  );
}
