import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const elections = await prisma.election.findMany({
    orderBy: [{ year: "desc" }, { round: "asc" }],
    select: {
      id: true,
      year: true,
      round: true,
      type: true,
      description: true,
      _count: {
        select: { candidates: true, voteResults: true },
      },
    },
  });

  return NextResponse.json(elections);
}
