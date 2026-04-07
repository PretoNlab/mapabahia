import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const jobs = await prisma.ingestionJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const errorDocuments = await prisma.electionDocument.findMany({
    where: { status: "error" },
    select: {
      id: true,
      fileName: true,
      errorMessage: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const matchedCount = await prisma.municipality.count({
    where: { geoJson: { not: null }, documents: { some: {} } },
  });

  const totalGeo = await prisma.municipality.count({
    where: { geoJson: { not: null } },
  });

  return NextResponse.json({
    jobs,
    errorDocuments,
    geoMatchStats: { matched: matchedCount, total: totalGeo },
  });
}
