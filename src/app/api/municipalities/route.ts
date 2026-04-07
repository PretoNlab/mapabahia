import { prisma } from "@/lib/db/prisma";
import {
  CURRENT_SUMMARY_ORDER_BY,
  CURRENT_SUMMARY_SCOPE,
} from "@/lib/election-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const where = search
    ? { name: { contains: search } }
    : {};

  const [municipalities, total] = await Promise.all([
    prisma.municipality.findMany({
      where,
      include: {
        resultSummaries: {
          where: CURRENT_SUMMARY_SCOPE,
          orderBy: CURRENT_SUMMARY_ORDER_BY,
          select: {
            eligibleVoters: true,
            turnout: true,
            turnoutPercentage: true,
            abstention: true,
            abstentionPercentage: true,
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.municipality.count({ where }),
  ]);

  return NextResponse.json({
    data: municipalities,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
