import { getStateOverview } from "@/lib/analytics/rankings";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const overview = await getStateOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Overview API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
