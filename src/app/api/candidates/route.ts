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

  let candidates = await prisma.candidate.findMany({
    where,
    include: {
      election: { select: { year: true, type: true, round: true } },
      voteResults: {
        select: { votes: true, municipalityId: true },
      },
    },
    orderBy: { ballotName: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  if (sort === "votes") {
    const rankedCandidateIds = await prisma.voteResult.groupBy({
      by: ["candidateId"],
      where: voteResultWhere,
      _sum: { votes: true },
      orderBy: { _sum: { votes: "desc" } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const candidateIds = rankedCandidateIds.map((item) => item.candidateId);
    const rankedCandidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      include: {
        election: { select: { year: true, type: true, round: true } },
        voteResults: {
          select: { votes: true, municipalityId: true },
        },
      },
    });

    const candidateMap = new Map(rankedCandidates.map((candidate) => [candidate.id, candidate]));
    candidates = candidateIds
      .map((candidateId) => candidateMap.get(candidateId))
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  }

  const data = candidates.map((c) => {
    const cityVoteMap = new Map<string, number>();
    for (const voteResult of c.voteResults) {
      cityVoteMap.set(
        voteResult.municipalityId,
        (cityVoteMap.get(voteResult.municipalityId) ?? 0) + voteResult.votes
      );
    }
    const votesByCity = [...cityVoteMap.values()].sort((a, b) => b - a);
    const totalVotes = votesByCity.reduce((sum, votes) => sum + votes, 0);
    const top10Votes = votesByCity.slice(0, 10).reduce((sum, votes) => sum + votes, 0);
    const concentrationTop10 = totalVotes > 0 ? (top10Votes / totalVotes) * 100 : 0;

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
      municipalities: cityVoteMap.size,
      concentrationTop10,
    };
  });

  return NextResponse.json({ data, total, page, limit, sort });
}
