import { NextResponse } from "next/server";
import { expandConfig } from "@libsql/core/config";
import { encodeBaseUrl } from "@libsql/core/uri";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || "not set";
  const authToken = process.env.TURSO_AUTH_TOKEN || "not set";

  let expandResult = "not tested";
  let encodeResult = "not tested";
  try {
    const config = expandConfig({ url, authToken }, true);
    expandResult = JSON.stringify({
      scheme: config.scheme,
      authority: config.authority,
      path: config.path,
    });
    const baseUrl = encodeBaseUrl(config.scheme, config.authority, config.path);
    encodeResult = baseUrl.toString();
  } catch (e) {
    if (expandResult === "not tested") {
      expandResult = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    } else {
      encodeResult = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({
    tursoUrlPrefix: url.substring(0, 60),
    expandResult,
    encodeResult,
  });
}
