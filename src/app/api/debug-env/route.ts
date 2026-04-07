import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  let dbTest = "not tested";
  try {
    const count = await prisma.municipality.count();
    dbTest = `OK: ${count} municipalities`;
  } catch (e) {
    dbTest = `ERROR: ${String(e)}`;
  }

  return NextResponse.json({
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 40) || "not set",
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    tokenPrefix: process.env.TURSO_AUTH_TOKEN?.substring(0, 20) || "not set",
    nodeEnv: process.env.NODE_ENV,
    dbTest,
  });
}
