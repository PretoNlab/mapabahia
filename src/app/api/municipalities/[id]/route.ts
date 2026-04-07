import { prisma } from "@/lib/db/prisma";
import { getMunicipalityInsights } from "@/lib/analytics/rankings";
import {
  CURRENT_SUMMARY_ORDER_BY,
  CURRENT_SUMMARY_SCOPE,
} from "@/lib/election-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true,
          fileName: true,
          year: true,
          round: true,
          status: true,
          processedAt: true,
        },
      },
      resultSummaries: {
        where: CURRENT_SUMMARY_SCOPE,
        orderBy: CURRENT_SUMMARY_ORDER_BY,
      },
      voteResults: {
        include: { candidate: true },
        orderBy: { votes: "desc" },
      },
    },
  });

  if (!municipality) {
    return NextResponse.json(
      { error: "Municipality not found" },
      { status: 404 }
    );
  }

  const insights = await getMunicipalityInsights(id);

  return NextResponse.json({
    municipality,
    insights: insights?.insights ?? [],
    stateAvgTurnout: insights?.stateAvgTurnout ?? null,
    stateAvgAbstention: insights?.stateAvgAbstention ?? null,
  });
}
