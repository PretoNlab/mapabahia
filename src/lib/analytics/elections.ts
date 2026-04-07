import { prisma } from "@/lib/db/prisma";
import { classifyBahiaTerritory } from "@/lib/territory";

interface RaceRow {
  municipalityId: string;
  municipalityName: string;
  candidateId: string;
  candidateName: string;
  party: string | null;
  status: string | null;
  votes: number;
  year: number;
}

export interface MayoralRaceSummary {
  municipalityId: string;
  municipalityName: string;
  year: number;
  winnerId: string;
  winnerName: string;
  winnerParty: string | null;
  winnerStatus: string | null;
  winnerVotes: number;
  runnerUpId: string | null;
  runnerUpName: string | null;
  runnerUpParty: string | null;
  runnerUpVotes: number;
  totalVotes: number;
  candidateCount: number;
  marginVotes: number;
  marginPercentage: number;
}

export interface MunicipalityComparison {
  current: MayoralRaceSummary | null;
  previous: MayoralRaceSummary | null;
  changedWinner: boolean;
  changedParty: boolean;
}

export interface MunicipalComparisonRow {
  municipalityId: string;
  municipalityName: string;
  territorySlug: string;
  territoryLabel: string;
  previousWinnerName: string | null;
  previousWinnerParty: string | null;
  currentWinnerName: string | null;
  currentWinnerParty: string | null;
  previousMarginPercentage: number | null;
  currentMarginPercentage: number | null;
  changedWinner: boolean;
  changedParty: boolean;
}

export interface MunicipalComparisonOverview {
  totalMunicipalitiesCompared: number;
  changedWinnerCount: number;
  changedPartyCount: number;
  retainedWinnerCount: number;
  retainedPartyCount: number;
  averageCurrentMargin: number;
  averagePreviousMargin: number;
}

export interface TerritoryComparisonSummary {
  territorySlug: string;
  territoryLabel: string;
  municipalityCount: number;
  changedWinnerCount: number;
  changedPartyCount: number;
  averageCurrentMargin: number;
}

function summarizeRace(rows: RaceRow[]): MayoralRaceSummary | null {
  if (rows.length === 0) {
    return null;
  }

  const candidateMap = new Map<
    string,
    {
      candidateId: string;
      candidateName: string;
      party: string | null;
      status: string | null;
      votes: number;
    }
  >();

  for (const row of rows) {
    const existing = candidateMap.get(row.candidateId);
    if (existing) {
      existing.votes += row.votes;
      continue;
    }

    candidateMap.set(row.candidateId, {
      candidateId: row.candidateId,
      candidateName: row.candidateName,
      party: row.party,
      status: row.status,
      votes: row.votes,
    });
  }

  const rankedCandidates = [...candidateMap.values()].sort(
    (a, b) => b.votes - a.votes
  );
  const winner = rankedCandidates[0];
  const runnerUp = rankedCandidates[1] ?? null;
  const totalVotes = rankedCandidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  const marginVotes = winner.votes - (runnerUp?.votes ?? 0);
  const marginPercentage = totalVotes > 0 ? (marginVotes / totalVotes) * 100 : 0;
  const reference = rows[0];

  return {
    municipalityId: reference.municipalityId,
    municipalityName: reference.municipalityName,
    year: reference.year,
    winnerId: winner.candidateId,
    winnerName: winner.candidateName,
    winnerParty: winner.party,
    winnerStatus: winner.status,
    winnerVotes: winner.votes,
    runnerUpId: runnerUp?.candidateId ?? null,
    runnerUpName: runnerUp?.candidateName ?? null,
    runnerUpParty: runnerUp?.party ?? null,
    runnerUpVotes: runnerUp?.votes ?? 0,
    totalVotes,
    candidateCount: rankedCandidates.length,
    marginVotes,
    marginPercentage,
  };
}

async function getMayoralRaceRows(years: number[], municipalityId?: string) {
  return prisma.voteResult.findMany({
    where: {
      ...(municipalityId ? { municipalityId } : {}),
      election: {
        is: {
          year: { in: years },
          round: 1,
          type: "municipal",
        },
      },
      candidate: {
        is: {
          office: "prefeito",
        },
      },
    },
    select: {
      municipalityId: true,
      votes: true,
      election: {
        select: {
          year: true,
        },
      },
      municipality: {
        select: {
          name: true,
          latitude: true,
          longitude: true,
        },
      },
      candidate: {
        select: {
          id: true,
          ballotName: true,
          party: true,
          status: true,
        },
      },
    },
  });
}

export async function getMunicipalityMayoralComparison(
  municipalityId: string
): Promise<MunicipalityComparison> {
  const rows = await getMayoralRaceRows([2020, 2024], municipalityId);

  const normalizedRows: RaceRow[] = rows.map((row) => ({
    municipalityId: row.municipalityId,
    municipalityName: row.municipality.name,
    candidateId: row.candidate.id,
    candidateName: row.candidate.ballotName,
    party: row.candidate.party,
    status: row.candidate.status,
    votes: row.votes,
    year: row.election.year,
  }));

  const current = summarizeRace(normalizedRows.filter((row) => row.year === 2024));
  const previous = summarizeRace(normalizedRows.filter((row) => row.year === 2020));

  return {
    current,
    previous,
    changedWinner:
      Boolean(current && previous) && current!.winnerName !== previous!.winnerName,
    changedParty:
      Boolean(current && previous) && current!.winnerParty !== previous!.winnerParty,
  };
}

export async function getClosestMayoralDisputes(limit: number = 10) {
  const rows = await getMayoralRaceRows([2024]);

  const grouped = new Map<string, RaceRow[]>();
  for (const row of rows) {
    const normalized: RaceRow = {
      municipalityId: row.municipalityId,
      municipalityName: row.municipality.name,
      candidateId: row.candidate.id,
      candidateName: row.candidate.ballotName,
      party: row.candidate.party,
      status: row.candidate.status,
      votes: row.votes,
      year: row.election.year,
    };
    const bucket = grouped.get(normalized.municipalityId);
    if (bucket) {
      bucket.push(normalized);
    } else {
      grouped.set(normalized.municipalityId, [normalized]);
    }
  }

  return [...grouped.values()]
    .map((municipalityRows) => summarizeRace(municipalityRows))
    .filter((race): race is MayoralRaceSummary => race !== null && race.candidateCount >= 2)
    .sort((a, b) => {
      if (a.marginPercentage !== b.marginPercentage) {
        return a.marginPercentage - b.marginPercentage;
      }
      return a.marginVotes - b.marginVotes;
    })
    .slice(0, limit);
}

export async function getMunicipalComparisons(): Promise<{
  overview: MunicipalComparisonOverview;
  rows: MunicipalComparisonRow[];
  territories: TerritoryComparisonSummary[];
}> {
  const rows = await getMayoralRaceRows([2020, 2024]);

  const grouped = new Map<string, RaceRow[]>();
  const municipalityMeta = new Map<
    string,
    { name: string; latitude: number | null; longitude: number | null }
  >();
  for (const row of rows) {
    const normalized: RaceRow = {
      municipalityId: row.municipalityId,
      municipalityName: row.municipality.name,
      candidateId: row.candidate.id,
      candidateName: row.candidate.ballotName,
      party: row.candidate.party,
      status: row.candidate.status,
      votes: row.votes,
      year: row.election.year,
    };

    const bucket = grouped.get(normalized.municipalityId);
    if (bucket) {
      bucket.push(normalized);
    } else {
      grouped.set(normalized.municipalityId, [normalized]);
    }

    municipalityMeta.set(normalized.municipalityId, {
      name: row.municipality.name,
      latitude: row.municipality.latitude,
      longitude: row.municipality.longitude,
    });
  }

  const comparisons = [...grouped.values()]
    .map((municipalityRows) => {
      const previous = summarizeRace(
        municipalityRows.filter((row) => row.year === 2020)
      );
      const current = summarizeRace(
        municipalityRows.filter((row) => row.year === 2024)
      );

      if (!previous || !current) {
        return null;
      }

      const meta = municipalityMeta.get(current.municipalityId);
      const territory = classifyBahiaTerritory(
        meta?.latitude,
        meta?.longitude,
        meta?.name ?? current.municipalityName
      );

      return {
        municipalityId: current.municipalityId,
        municipalityName: current.municipalityName,
        territorySlug: territory.slug,
        territoryLabel: territory.label,
        previousWinnerName: previous.winnerName,
        previousWinnerParty: previous.winnerParty,
        currentWinnerName: current.winnerName,
        currentWinnerParty: current.winnerParty,
        previousMarginPercentage: previous.marginPercentage,
        currentMarginPercentage: current.marginPercentage,
        changedWinner: previous.winnerName !== current.winnerName,
        changedParty: previous.winnerParty !== current.winnerParty,
      };
    })
    .filter((comparison) => comparison !== null) as MunicipalComparisonRow[];

  const changedWinnerCount = comparisons.filter((row) => row.changedWinner).length;
  const changedPartyCount = comparisons.filter((row) => row.changedParty).length;
  const totalMunicipalitiesCompared = comparisons.length;
  const averageCurrentMargin =
    totalMunicipalitiesCompared > 0
      ? comparisons.reduce((sum, row) => sum + (row.currentMarginPercentage ?? 0), 0) /
        totalMunicipalitiesCompared
      : 0;
  const averagePreviousMargin =
    totalMunicipalitiesCompared > 0
      ? comparisons.reduce((sum, row) => sum + (row.previousMarginPercentage ?? 0), 0) /
        totalMunicipalitiesCompared
      : 0;

  const territoryMap = new Map<string, TerritoryComparisonSummary>();
  for (const row of comparisons) {
    const existing = territoryMap.get(row.territorySlug);
    if (existing) {
      existing.municipalityCount += 1;
      existing.changedWinnerCount += row.changedWinner ? 1 : 0;
      existing.changedPartyCount += row.changedParty ? 1 : 0;
      existing.averageCurrentMargin += row.currentMarginPercentage ?? 0;
    } else {
      territoryMap.set(row.territorySlug, {
        territorySlug: row.territorySlug,
        territoryLabel: row.territoryLabel,
        municipalityCount: 1,
        changedWinnerCount: row.changedWinner ? 1 : 0,
        changedPartyCount: row.changedParty ? 1 : 0,
        averageCurrentMargin: row.currentMarginPercentage ?? 0,
      });
    }
  }

  const territories = [...territoryMap.values()]
    .map((territory) => ({
      ...territory,
      averageCurrentMargin:
        territory.municipalityCount > 0
          ? territory.averageCurrentMargin / territory.municipalityCount
          : 0,
    }))
    .sort((a, b) => b.changedPartyCount - a.changedPartyCount);

  return {
    overview: {
      totalMunicipalitiesCompared,
      changedWinnerCount,
      changedPartyCount,
      retainedWinnerCount: totalMunicipalitiesCompared - changedWinnerCount,
      retainedPartyCount: totalMunicipalitiesCompared - changedPartyCount,
      averageCurrentMargin,
      averagePreviousMargin,
    },
    rows: comparisons,
    territories,
  };
}
