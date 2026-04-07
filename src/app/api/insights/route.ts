import { getAutoInsights } from "@/lib/analytics/rankings";
import { NextResponse } from "next/server";

export async function GET() {
  const insights = await getAutoInsights();
  return NextResponse.json({ insights });
}
