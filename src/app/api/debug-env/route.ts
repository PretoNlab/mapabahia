import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || "not set";
  const authToken = process.env.TURSO_AUTH_TOKEN || "not set";

  let dbTest = "not tested";
  try {
    const client = createClient({ url, authToken });
    const result = await client.execute("SELECT COUNT(*) as cnt FROM Municipality");
    dbTest = `OK: ${JSON.stringify(result.rows[0])}`;
  } catch (e) {
    dbTest = `ERROR: ${e instanceof Error ? `${e.message}\n${e.stack}` : String(e)}`;
  }

  return NextResponse.json({
    tursoUrlPrefix: url.substring(0, 40),
    hasTursoToken: authToken !== "not set",
    nodeEnv: process.env.NODE_ENV,
    dbTest,
  });
}
