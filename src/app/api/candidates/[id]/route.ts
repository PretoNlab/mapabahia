import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      election: true,
      voteResults: {
        include: {
          municipality: {
            select: {
              id: true,
              name: true,
              tseCode: true,
              ibgeCode: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy: { votes: "desc" },
      },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Aggregate votes by municipality (sum across zones)
  const votesByCity = new Map<
    string,
    { municipalityId: string; name: string; tseCode: string | null; votes: number }
  >();
  for (const vr of candidate.voteResults) {
    const key = vr.municipalityId;
    const existing = votesByCity.get(key);
    if (existing) {
      existing.votes += vr.votes;
    } else {
      votesByCity.set(key, {
        municipalityId: vr.municipalityId,
        name: vr.municipality.name,
        tseCode: vr.municipality.tseCode,
        votes: vr.votes,
      });
    }
  }

  const cities = [...votesByCity.values()].sort((a, b) => b.votes - a.votes);
  const totalVotes = cities.reduce((s, c) => s + c.votes, 0);

  return NextResponse.json({
    candidate: {
      id: candidate.id,
      name: candidate.name,
      ballotName: candidate.ballotName,
      ballotNumber: candidate.ballotNumber,
      party: candidate.party,
      partyName: candidate.partyName,
      coalition: candidate.coalition,
      office: candidate.office,
      status: candidate.status,
      year: candidate.election.year,
      electionType: candidate.election.type,
      round: candidate.election.round,
    },
    totalVotes,
    totalCities: cities.length,
    votesByCity: cities.map((c) => ({
      ...c,
      percentage: totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0,
    })),
  });
}
