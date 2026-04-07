import { prisma } from "@/lib/db/prisma";
import {
  CURRENT_SUMMARY_ORDER_BY,
  CURRENT_SUMMARY_SCOPE,
} from "@/lib/election-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const indicator = searchParams.get("indicator") || "eligibleVoters";

  const municipalities = await prisma.municipality.findMany({
    where: { geoJson: { not: null } },
    select: {
      id: true,
      name: true,
      ibgeCode: true,
      geoJson: true,
      latitude: true,
      longitude: true,
      resultSummaries: {
        where: CURRENT_SUMMARY_SCOPE,
        orderBy: CURRENT_SUMMARY_ORDER_BY,
        select: {
          eligibleVoters: true,
          turnout: true,
          turnoutPercentage: true,
          abstention: true,
          abstentionPercentage: true,
          validVotesMayor: true,
        },
        take: 1,
      },
    },
  });

  // Build GeoJSON FeatureCollection with indicator values
  const features = municipalities.map((m) => {
    const summary = m.resultSummaries[0];
    const indicatorValue = summary
      ? (summary as Record<string, unknown>)[indicator]
      : null;

    return {
      type: "Feature" as const,
      properties: {
        id: m.id,
        name: m.name,
        ibgeCode: m.ibgeCode,
        value: indicatorValue ?? null,
        eligibleVoters: summary?.eligibleVoters ?? null,
        turnoutPercentage: summary?.turnoutPercentage ?? null,
        abstentionPercentage: summary?.abstentionPercentage ?? null,
      },
      geometry: JSON.parse(m.geoJson!),
    };
  });

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  });
}
