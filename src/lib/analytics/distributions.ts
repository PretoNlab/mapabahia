import { prisma } from "@/lib/db/prisma";
import { CURRENT_SUMMARY_SCOPE } from "@/lib/election-scope";

export interface DistributionBand {
  label: string;
  min: number;
  max: number;
  count: number;
  municipalities: string[];
}

export async function getDistribution(
  field: "turnoutPercentage" | "abstentionPercentage" | "eligibleVoters",
  bands: Array<{ label: string; min: number; max: number }>
): Promise<DistributionBand[]> {
  const summaries = await prisma.electionResultSummary.findMany({
    where: CURRENT_SUMMARY_SCOPE,
    select: {
      turnoutPercentage: true,
      abstentionPercentage: true,
      eligibleVoters: true,
      municipality: { select: { name: true } },
    },
  });

  return bands.map((band) => {
    const matching = summaries.filter((s) => {
      const val = s[field];
      return val != null && val >= band.min && val < band.max;
    });

    return {
      ...band,
      count: matching.length,
      municipalities: matching.map((m) => m.municipality.name),
    };
  });
}

export const TURNOUT_BANDS = [
  { label: "< 60%", min: 0, max: 60 },
  { label: "60-70%", min: 60, max: 70 },
  { label: "70-80%", min: 70, max: 80 },
  { label: "80-85%", min: 80, max: 85 },
  { label: "85-90%", min: 85, max: 90 },
  { label: "> 90%", min: 90, max: 101 },
];

export const ABSTENTION_BANDS = [
  { label: "< 10%", min: 0, max: 10 },
  { label: "10-15%", min: 10, max: 15 },
  { label: "15-20%", min: 15, max: 20 },
  { label: "20-25%", min: 20, max: 25 },
  { label: "25-30%", min: 25, max: 30 },
  { label: "> 30%", min: 30, max: 101 },
];

export const ELECTORATE_BANDS = [
  { label: "< 5 mil", min: 0, max: 5000 },
  { label: "5-10 mil", min: 5000, max: 10000 },
  { label: "10-20 mil", min: 10000, max: 20000 },
  { label: "20-50 mil", min: 20000, max: 50000 },
  { label: "50-100 mil", min: 50000, max: 100000 },
  { label: "100-500 mil", min: 100000, max: 500000 },
  { label: "> 500 mil", min: 500000, max: 100000000 },
];
