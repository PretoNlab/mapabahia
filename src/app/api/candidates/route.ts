import { prisma } from "@/lib/db/prisma";
import { normalizeSearch } from "@/lib/search";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const office = searchParams.get("office") || "";
  const year = searchParams.get("year") || "";
  const party = searchParams.get("party") || "";
  const sort = searchParams.get("sort") || "votes";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const where: Record<string, unknown> = {};
  const voteResultWhere: Record<string, unknown> = {};
  if (q.length >= 2) {
    const normalized = normalizeSearch(q);
    const nameFilter = [
      { ballotNameNormalized: { contains: normalized } },
      { nameNormalized: { contains: normalized } },
    ];
    where.OR = nameFilter;
    voteResultWhere.candidate = { is: { OR: nameFilter } };
  }
  if (office) {
    where.office = office;
    voteResultWhere.candidate = {
      is: {
        ...(typeof voteResultWhere.candidate === "object" &&
        voteResultWhere.candidate !== null &&
        "is" in voteResultWhere.candidate
          ? (voteResultWhere.candidate as { is: Record<string, unknown> }).is
          : {}),
        office,
      },
    };
  }
  if (party) {
    where.party = { contains: party.toUpperCase() };
    voteResultWhere.candidate = {
      is: {
        ...(typeof voteResultWhere.candidate === "object" &&
        voteResultWhere.candidate !== null &&
        "is" in voteResultWhere.candidate
          ? (voteResultWhere.candidate as { is: Record<string, unknown> }).is
          : {}),
        party: { contains: party.toUpperCase() },
      },
    };
  }
  if (year) {
    const parsedYear = parseInt(year, 10);
    where.election = { year: parsedYear };
    voteResultWhere.election = { is: { year: parsedYear } };
  }

  const total = await prisma.candidate.count({ where });

  // 1. Fetch basic candidate info (WITHOUT full vote results)
  let candidates = await prisma.candidate.findMany({
    where,
    include: {
      election: { select: { year: true, type: true, round: true } },
      _count: {
        select: { voteResults: true }, // This gives us 'municipalities' count efficiently
      },
    },
    orderBy: sort === "name" ? { ballotName: "asc" } : undefined,
    skip: (page - 1) * limit,
    take: limit,
  });

  // 2. Fetch total votes using aggregation for the candidates in the current page
  if (sort === "votes") {
    // If sorting by votes, we need to know the IDs first based on vote totals
    const rankedCandidateIds = await prisma.voteResult.groupBy({
      by: ["candidateId"],
      where: voteResultWhere,
      _sum: { votes: true },
      orderBy: { _sum: { votes: "desc" } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const candidateIds = rankedCandidateIds.map((item) => item.candidateId);
    
    // Fetch full data for these IDs
    const rankedCandidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      include: {
        election: { select: { year: true, type: true, round: true } },
        _count: {
          select: { voteResults: true },
        },
      },
    });

    const candidateMap = new Map(rankedCandidates.map((c) => [c.id, c]));
    candidates = candidateIds
      .map((id) => candidateMap.get(id))
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }

  // 3. To get 'totalVotes' and 'concentrationTop10', we still need some vote context
  // but we can fetch them only for the 50 candidates on this page.
  const pageCandidateIds = candidates.map((c) => c.id);
  
  const voteAggregations = await prisma.voteResult.groupBy({
    by: ["candidateId"],
    where: { candidateId: { in: pageCandidateIds } },
    _sum: { votes: true },
  });

  // For concentrationTop10, we'll fetch only the top 10 rows per candidate
  // Since Prisma doesn't support 'limit per group' easily, we'll do quick individual queries
  // or just skip it if it's too heavy. For now, let's fetch total per candidate via groupBy.
  
  const voteMap = new Map(voteAggregations.map(a => [a.candidateId, a._sum.votes ?? 0]));

  const data = candidates.map((c) => {
    const totalVotes = voteMap.get(c.id) ?? 0;
    
    return {
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
      totalVotes,
      municipalities: (c as any)._count?.voteResults ?? 0,
      concentrationTop10: 0, // Temporarily disabled for performance, will see if needed
    };
  });

  return NextResponse.json({ data, total, page, limit, sort });
}
