import { getStateOverview } from "@/lib/analytics/rankings";
import { NextResponse } from "next/server";

export async function GET() {
  const overview = await getStateOverview();
  return NextResponse.json(overview);
}
