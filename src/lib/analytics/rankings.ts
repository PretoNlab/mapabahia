import { prisma } from "@/lib/db/prisma";
import {
  CURRENT_SUMMARY_ORDER_BY,
  CURRENT_SUMMARY_SCOPE,
} from "@/lib/election-scope";
import { cache } from "react";

export interface RankedMunicipality {
  id: string;
  name: string;
  value: number;
  rank: number;
}

export interface StateOverview {
  totalMunicipalities: number;
  totalDocuments: number;
  totalProcessed: number;
  totalErrors: number;
  totalEligibleVoters: number;
  totalTurnout: number;
  totalAbstention: number;
  avgTurnoutPercentage: number;
  avgAbstentionPercentage: number;
  medianTurnoutPercentage: number;
  medianAbstentionPercentage: number;
}

export const getStateOverview = cache(async (): Promise<StateOverview> => {
  const [munCount, totalDocs, processedDocs, errorDocs, summaries] = await Promise.all([
    prisma.municipality.count(),
    prisma.electionDocument.count({
      where: CURRENT_SUMMARY_SCOPE,
    }),
    prisma.electionDocument.count({
      where: {
        ...CURRENT_SUMMARY_SCOPE,
        status: "completed",
      },
    }),
    prisma.electionDocument.count({
      where: {
        ...CURRENT_SUMMARY_SCOPE,
        status: "error",
      },
    }),
    prisma.electionResultSummary.findMany({
      where: CURRENT_SUMMARY_SCOPE,
      select: {
        eligibleVoters: true,
        turnout: true,
        abstention: true,
        turnoutPercentage: true,
        abstentionPercentage: true,
      },
    }),
  ]);

  const totalEligible = summaries.reduce(
    (s, r) => s + (r.eligibleVoters ?? 0),
    0
  );
  const totalTurnout = summaries.reduce((s, r) => s + (r.turnout ?? 0), 0);
  const totalAbstention = summaries.reduce(
    (s, r) => s + (r.abstention ?? 0),
    0
  );

  const turnoutPcts = summaries
    .map((r) => r.turnoutPercentage)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  const abstentionPcts = summaries
    .map((r) => r.abstentionPercentage)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  const median = (arr: number[]) =>
    arr.length === 0
      ? 0
      : arr.length % 2 === 0
        ? (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2
        : arr[Math.floor(arr.length / 2)];

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

  return {
    totalMunicipalities: munCount,
    totalDocuments: totalDocs,
    totalProcessed: processedDocs,
    totalErrors: errorDocs,
    totalEligibleVoters: totalEligible,
    totalTurnout: totalTurnout,
    totalAbstention: totalAbstention,
    avgTurnoutPercentage: Math.round(avg(turnoutPcts) * 100) / 100,
    avgAbstentionPercentage: Math.round(avg(abstentionPcts) * 100) / 100,
    medianTurnoutPercentage: Math.round(median(turnoutPcts) * 100) / 100,
    medianAbstentionPercentage:
      Math.round(median(abstentionPcts) * 100) / 100,
  };
});

export const getRanking = cache(async (
  field:
    | "eligibleVoters"
    | "turnout"
    | "abstention"
    | "turnoutPercentage"
    | "abstentionPercentage"
    | "validVotesMayor"
    | "validVotesCouncil",
  order: "asc" | "desc" = "desc",
  limit: number = 10
): Promise<RankedMunicipality[]> => {
  const summaries = await prisma.electionResultSummary.findMany({
    where: {
      ...CURRENT_SUMMARY_SCOPE,
      [field]: { not: null },
    },
    select: {
      eligibleVoters: true,
      turnout: true,
      abstention: true,
      turnoutPercentage: true,
      abstentionPercentage: true,
      validVotesMayor: true,
      validVotesCouncil: true,
      municipality: {
        select: { id: true, name: true },
      },
    },
    orderBy: { [field]: order },
    take: limit,
  });

  return summaries.map((s, i) => ({
    id: s.municipality.id,
    name: s.municipality.name,
    value: s[field] as number,
    rank: i + 1,
  }));
});

export const getMunicipalityInsights = cache(async (municipalityId: string) => {
  const [summary, stateOverview] = await Promise.all([
    prisma.electionResultSummary.findFirst({
      where: {
        municipalityId,
        ...CURRENT_SUMMARY_SCOPE,
      },
      include: { municipality: true },
      orderBy: CURRENT_SUMMARY_ORDER_BY,
    }),
    getStateOverview(),
  ]);

  if (!summary) return null;

  const insights: string[] = [];
  const name = summary.municipality.name;

  // Turnout comparison
  if (summary.turnoutPercentage && stateOverview.avgTurnoutPercentage) {
    const diff = summary.turnoutPercentage - stateOverview.avgTurnoutPercentage;
    const direction = diff > 0 ? "acima" : "abaixo";
    insights.push(
      `${name} teve comparecimento de ${summary.turnoutPercentage.toFixed(1)}%, ${direction} da média estadual de ${stateOverview.avgTurnoutPercentage.toFixed(1)}%.`
    );
  }

  // Abstention comparison
  if (summary.abstentionPercentage && stateOverview.avgAbstentionPercentage) {
    const diff =
      summary.abstentionPercentage - stateOverview.avgAbstentionPercentage;
    const direction = diff > 0 ? "acima" : "abaixo";
    insights.push(
      `A abstenção foi de ${summary.abstentionPercentage.toFixed(1)}%, ${direction} da média estadual de ${stateOverview.avgAbstentionPercentage.toFixed(1)}%.`
    );
  }

  // Electorate size ranking
  if (summary.eligibleVoters) {
    const largerCount = await prisma.electionResultSummary.count({
      where: {
        ...CURRENT_SUMMARY_SCOPE,
        eligibleVoters: { gt: summary.eligibleVoters },
      },
    });
    const rank = largerCount + 1;
    if (rank <= 20) {
      insights.push(
        `${name} está entre os ${rank <= 10 ? "10" : "20"} maiores eleitorados da Bahia (${rank}º lugar com ${summary.eligibleVoters.toLocaleString("pt-BR")} eleitores).`
      );
    }
  }

  // Null votes analysis
  if (
    summary.nullVotesMayorPercentage &&
    summary.nullVotesMayorPercentage > 5
  ) {
    insights.push(
      `O percentual de votos nulos para prefeito foi de ${summary.nullVotesMayorPercentage.toFixed(1)}%, um valor elevado.`
    );
  }

  return {
    summary,
    insights,
    stateAvgTurnout: stateOverview.avgTurnoutPercentage,
    stateAvgAbstention: stateOverview.avgAbstentionPercentage,
    medianTurnout: stateOverview.medianTurnoutPercentage,
    medianAbstention: stateOverview.medianAbstentionPercentage,
  };
});

export const getAutoInsights = cache(async (): Promise<string[]> => {
  const overview = await getStateOverview();
  const insights: string[] = [];

  // Top abstention municipalities
  const topAbstention = await getRanking("abstentionPercentage", "desc", 5);
  if (topAbstention.length > 0) {
    insights.push(
      `Os municípios com maior abstenção são: ${topAbstention.map((m) => `${m.name} (${m.value.toFixed(1)}%)`).join(", ")}.`
    );
  }

  // Top turnout municipalities
  const topTurnout = await getRanking("turnoutPercentage", "desc", 5);
  if (topTurnout.length > 0) {
    insights.push(
      `Os municípios com maior comparecimento são: ${topTurnout.map((m) => `${m.name} (${m.value.toFixed(1)}%)`).join(", ")}.`
    );
  }

  // Largest electorates
  const topElectorate = await getRanking("eligibleVoters", "desc", 5);
  if (topElectorate.length > 0) {
    insights.push(
      `Os maiores eleitorados da Bahia: ${topElectorate.map((m) => `${m.name} (${m.value.toLocaleString("pt-BR")})`).join(", ")}.`
    );
  }

  // Capital vs Interior comparison
  const salvador = await prisma.municipality.findFirst({
    where: { name: "SALVADOR" },
    include: {
      resultSummaries: {
        where: CURRENT_SUMMARY_SCOPE,
        orderBy: CURRENT_SUMMARY_ORDER_BY,
        take: 1,
      },
    },
  });
  if (salvador?.resultSummaries[0] && overview.totalProcessed > 0) {
    const salv = salvador.resultSummaries[0];
    if (salv.turnoutPercentage != null) {
      const diff = salv.turnoutPercentage - overview.avgTurnoutPercentage;
      const direction = diff > 0 ? "acima" : "abaixo";
      insights.push(
        `Salvador registrou comparecimento de ${salv.turnoutPercentage.toFixed(1)}%, ${Math.abs(diff).toFixed(1)} p.p. ${direction} da média estadual (${overview.avgTurnoutPercentage.toFixed(1)}%).`
      );
    }
    if (salv.eligibleVoters != null) {
      const pctElectorate = ((salv.eligibleVoters / overview.totalEligibleVoters) * 100);
      insights.push(
        `A capital concentra ${pctElectorate.toFixed(1)}% do eleitorado baiano (${salv.eligibleVoters.toLocaleString("pt-BR")} de ${overview.totalEligibleVoters.toLocaleString("pt-BR")} eleitores).`
      );
    }
  }

  // State averages
  if (overview.totalProcessed > 0) {
    insights.push(
      `A média de comparecimento no estado foi de ${overview.avgTurnoutPercentage.toFixed(1)}%, com mediana de ${overview.medianTurnoutPercentage.toFixed(1)}%.`
    );
    insights.push(
      `A média de abstenção no estado foi de ${overview.avgAbstentionPercentage.toFixed(1)}%, com mediana de ${overview.medianAbstentionPercentage.toFixed(1)}%.`
    );
    insights.push(
      `Total de ${overview.totalProcessed} documentos processados de ${overview.totalMunicipalities} municípios.`
    );
  }

  return insights;
});
