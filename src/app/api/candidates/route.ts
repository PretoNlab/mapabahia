import { prisma } from "@/lib/db/prisma";
import { normalizeSearch } from "@/lib/search";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getCachedCandidates = unstable_cache(
  async (q: string, office: string, year: string, party: string, sort: string, page: number, limit: number) => {
    const where: Record<string, unknown> = {};

    if (q.length >= 2) {
      const normalized = normalizeSearch(q);
      where.OR = [
        { ballotNameNormalized: { contains: normalized } },
        { nameNormalized: { contains: normalized } },
      ];
    }
    if (office) {
      where.office = office;
    }
    if (party) {
      where.party = { contains: party.toUpperCase() };
    }
    if (year) {
      where.election = { year: parseInt(year, 10) };
    }

    const orderBy =
      sort === "name"
        ? { ballotName: "asc" as const }
        : { totalVotes: "desc" as const };

    const [total, candidates] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
        where,
        select: {
          id: true,
          name: true,
          ballotName: true,
          ballotNumber: true,
          party: true,
          office: true,
          status: true,
          totalVotes: true,
          municipalityCount: true,
          election: { select: { year: true, type: true, round: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      ballotName: c.ballotName,
      ballotNumber: c.ballotNumber,
      party: c.party,
      office: c.office,
      status: c.status,
      year: c.election.year,
      electionType: c.election.type,
      round: c.election.round,
      totalVotes: c.totalVotes,
      municipalities: c.municipalityCount,
      concentrationTop10: 0,
    }));

    return { data, total, page, limit, sort };
  },
  ['candidates', 'search'],
  { tags: ['candidates'], revalidate: 86400 }
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const office = searchParams.get("office") || "";
  const year = searchParams.get("year") || "";
  const party = searchParams.get("party") || "";
  const sort = searchParams.get("sort") || "votes";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const result = await getCachedCandidates(q, office, year, party, sort, page, limit);

  return NextResponse.json(result);
}
