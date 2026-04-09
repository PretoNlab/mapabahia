import { getStateOverview, getRanking, getAutoInsights } from "@/lib/analytics/rankings";
import { getElectoralComparisons, getClosestMayoralDisputes } from "@/lib/analytics/elections";
import { getDistribution, TURNOUT_BANDS, ABSTENTION_BANDS } from "@/lib/analytics/distributions";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankingTable } from "@/components/dashboard/ranking-table";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { InsightList } from "@/components/insights/insight-list";
import { ElectionCards } from "@/components/dashboard/election-cards";
import { CandidateSpotlight } from "@/components/dashboard/candidate-spotlight";
import { DisputeTable } from "@/components/dashboard/dispute-table";
import Link from "next/link";
import { cache } from "react";

// Move candidate highlights fetching here as a cached function
const getCandidateHighlights = cache(async () => {
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
});

export async function ElectoralDynamicsContainer() {
  const [{ overview: overviewMunicipal }, { overview: overviewFederal }] = await Promise.all([
    getElectoralComparisons("municipal"),
    getElectoralComparisons("federal"),
  ]);

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
        Dinâmicas de Mudança Eleitoral
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link href="/comparacao?type=municipal" className="group block">
          <div className="h-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                Municipal 2020 x 2024
              </span>
              <span className="text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Ver detalhes →
              </span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Pulsar das Prefeituras
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Análise de continuidade e alternância de poder nos 417 municípios.
            </p>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatPercentage((overviewMunicipal.changedPartyCount / overviewMunicipal.totalMunicipalitiesCompared) * 100)}
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Troca de Partido
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-600">
                  {overviewMunicipal.retainedPartyCount}
                </div>
                <div className="text-xs text-zinc-500">
                  Mantiveram a legenda
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/comparacao?type=federal" className="group block">
          <div className="h-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                Estadual 2018 x 2022
              </span>
              <span className="text-sm font-medium text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Ver detalhes →
              </span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Votação para Governador
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Comparativo regional da preferência por candidatos ao governo do estado.
            </p>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatPercentage((overviewFederal.changedPartyCount / overviewFederal.totalMunicipalitiesCompared) * 100)}
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Alternância Partidária
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">
                  {overviewFederal.retainedPartyCount}
                </div>
                <div className="text-xs text-zinc-500">
                  Mesmo partido vencedor
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export async function OverviewStatsContainer() {
  const overview = await getStateOverview();
  
  return (
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
  );
}

export async function SecondaryStatsContainer() {
  const overview = await getStateOverview();
  
  return (
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
  );
}

export async function ElectionCardsContainer() {
  const elections = await prisma.election.findMany({
    orderBy: [{ year: "desc" }, { round: "asc" }],
    select: {
      id: true, year: true, round: true, type: true, description: true,
      _count: { select: { candidates: true, voteResults: true } },
    },
  });

  return (
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
  );
}

export async function CandidateSpotlightsContainer() {
  const candidateHighlights = await getCandidateHighlights();
  
  return (
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
  );
}

export async function DisputesContainer() {
  const closestDisputes = await getClosestMayoralDisputes(5);
  
  return (
    <div className="mb-10">
      <DisputeTable
        title="Municipios Em Disputa"
        description="Corridas mais apertadas para prefeito no 1º turno municipal de 2024."
        items={closestDisputes}
      />
    </div>
  );
}

export async function InsightsContainer() {
  const insights = await getAutoInsights();
  
  if (insights.length === 0) return null;
  
  return (
    <div className="mb-10">
      <InsightList title="Insights Automaticos" insights={insights} />
    </div>
  );
}

export async function DistributionsContainer() {
  const [turnoutDist, abstentionDist] = await Promise.all([
    getDistribution("turnoutPercentage", TURNOUT_BANDS),
    getDistribution("abstentionPercentage", ABSTENTION_BANDS)
  ]);
  
  return (
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
  );
}

export async function RankingsContainer() {
  const [topElectorate, topTurnout, topAbstention] = await Promise.all([
    getRanking("eligibleVoters", "desc", 10),
    getRanking("turnoutPercentage", "desc", 10),
    getRanking("abstentionPercentage", "desc", 10)
  ]);
  
  return (
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
  );
}
