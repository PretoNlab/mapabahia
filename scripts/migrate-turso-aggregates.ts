/**
 * One-off migration: add totalVotes and municipalityCount columns to Candidate
 * on the Turso production database, then backfill them.
 *
 * Safe to re-run: ALTER TABLE is idempotent-guarded, backfill is deterministic.
 *
 * Usage: npx tsx scripts/migrate-turso-aggregates.ts
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually (simple parser, no dep)
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) {
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set");
  process.exit(1);
}

console.log(`Connecting to: ${url.replace(/\/\/.*@/, "//***@")}`);
const client = createClient(authToken ? { url, authToken } : { url });

async function columnExists(
  table: string,
  column: string
): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info("${table}");`);
  return res.rows.some((r: any) => r.name === column);
}

async function main() {
  const t0 = Date.now();

  // Sanity: verify we're hitting the right DB
  const candCount = await client.execute("SELECT COUNT(*) AS n FROM Candidate;");
  const vrCount = await client.execute("SELECT COUNT(*) AS n FROM VoteResult;");
  console.log(
    `Current state: ${candCount.rows[0].n} candidates, ${vrCount.rows[0].n} vote results`
  );

  // 1. Add totalVotes column if missing
  if (await columnExists("Candidate", "totalVotes")) {
    console.log("✓ Candidate.totalVotes already exists, skipping ALTER");
  } else {
    console.log("→ Adding Candidate.totalVotes...");
    await client.execute(
      'ALTER TABLE "Candidate" ADD COLUMN "totalVotes" INTEGER NOT NULL DEFAULT 0;'
    );
  }

  // 2. Add municipalityCount column if missing
  if (await columnExists("Candidate", "municipalityCount")) {
    console.log("✓ Candidate.municipalityCount already exists, skipping ALTER");
  } else {
    console.log("→ Adding Candidate.municipalityCount...");
    await client.execute(
      'ALTER TABLE "Candidate" ADD COLUMN "municipalityCount" INTEGER NOT NULL DEFAULT 0;'
    );
  }

  // 3. Create index if missing
  console.log("→ Creating Candidate_totalVotes_idx (if not exists)...");
  await client.execute(
    'CREATE INDEX IF NOT EXISTS "Candidate_totalVotes_idx" ON "Candidate"("totalVotes");'
  );

  // 4. Backfill
  console.log("→ Backfilling aggregates (this may take a while)...");
  const backfillStart = Date.now();
  await client.execute(`
    UPDATE Candidate SET
      totalVotes = COALESCE((SELECT SUM(votes) FROM VoteResult WHERE candidateId = Candidate.id), 0),
      municipalityCount = (SELECT COUNT(DISTINCT municipalityId) FROM VoteResult WHERE candidateId = Candidate.id);
  `);
  console.log(`  Backfill done in ${((Date.now() - backfillStart) / 1000).toFixed(1)}s`);

  // 5. Sanity check: top 5 by totalVotes
  const top = await client.execute(
    "SELECT ballotName, totalVotes, municipalityCount FROM Candidate ORDER BY totalVotes DESC LIMIT 5;"
  );
  console.log("\nTop 5 by totalVotes:");
  for (const row of top.rows) {
    console.log(
      `  ${row.ballotName} — ${row.totalVotes} votos em ${row.municipalityCount} municípios`
    );
  }

  console.log(`\n✅ Migration complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  client.close();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  client.close();
  process.exit(1);
});
