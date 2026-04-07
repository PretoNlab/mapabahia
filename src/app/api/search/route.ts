import { prisma } from "@/lib/db/prisma";
import { normalizeSearch } from "@/lib/search";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all";
    const query = q.trim();

    if (query.length < 2) {
      return NextResponse.json({ municipalities: [], candidates: [] });
    }

    const results: {
      municipalities: Array<{ id: string; name: string; ibgeCode: string | null }>;
      candidates: Array<{
        id: string;
        candidateName: string;
        party: string | null;
        office: string;
        year: number;
        totalVotes: number;
        status: string | null;
      }>;
    } = { municipalities: [], candidates: [] };

    const normalized = normalizeSearch(query);

    if (type === "all" || type === "municipality") {
      results.municipalities = await prisma.municipality.findMany({
        where: { nameNormalized: { contains: normalized } },
        select: { id: true, name: true, ibgeCode: true },
        take: 10,
      });
    }

    if (type === "all" || type === "candidate") {
      const candidates = await prisma.candidate.findMany({
        where: {
          OR: [
            { ballotNameNormalized: { contains: normalized } },
            { nameNormalized: { contains: normalized } },
            { party: { contains: normalized } },
            { partyName: { contains: query } },
          ],
        },
        include: {
          election: { select: { year: true } },
          voteResults: { select: { votes: true } },
        },
        take: 20,
      });

      results.candidates = candidates.map((c) => ({
        id: c.id,
        candidateName: c.ballotName,
        party: c.party,
        office: c.office,
        year: c.election.year,
        totalVotes: c.voteResults.reduce((s, v) => s + v.votes, 0),
        status: c.status,
      }));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
