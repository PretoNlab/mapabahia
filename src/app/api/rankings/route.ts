import { getRanking } from "@/lib/analytics/rankings";
import { NextRequest, NextResponse } from "next/server";

const VALID_FIELDS = [
  "eligibleVoters",
  "turnout",
  "abstention",
  "turnoutPercentage",
  "abstentionPercentage",
  "validVotesMayor",
  "validVotesCouncil",
] as const;

type RankingField = (typeof VALID_FIELDS)[number];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const field = (searchParams.get("field") || "eligibleVoters") as RankingField;
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!VALID_FIELDS.includes(field)) {
    return NextResponse.json(
      { error: `Invalid field. Valid: ${VALID_FIELDS.join(", ")}` },
      { status: 400 }
    );
  }

  const ranking = await getRanking(field, order, limit);
  return NextResponse.json(ranking);
}
