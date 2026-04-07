import {
  getDistribution,
  TURNOUT_BANDS,
  ABSTENTION_BANDS,
  ELECTORATE_BANDS,
} from "@/lib/analytics/distributions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") || "turnout";

  let result;
  switch (type) {
    case "turnout":
      result = await getDistribution("turnoutPercentage", TURNOUT_BANDS);
      break;
    case "abstention":
      result = await getDistribution("abstentionPercentage", ABSTENTION_BANDS);
      break;
    case "electorate":
      result = await getDistribution("eligibleVoters", ELECTORATE_BANDS);
      break;
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json(result);
}
