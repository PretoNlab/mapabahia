/**
 * Ingestion script for TSE election CSV data.
 *
 * Downloads ZIP files from cdn.tse.jus.br, extracts the BA CSV,
 * and upserts Election → Candidate → VoteResult records.
 *
 * Usage:
 *   npx tsx scripts/ingest-tse-csv.ts              # all years
 *   npx tsx scripts/ingest-tse-csv.ts --year 2024   # specific year
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: `file:${path.resolve(__dirname, "../prisma/dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

// ─── Config ─────────────────────────────────────────────
const BASE_URL =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona";

interface ElectionConfig {
  year: number;
  type: "municipal" | "federal";
  description: string;
  rounds: number[];
  offices: Record<string, string>; // CD_CARGO → office name
}

const ELECTIONS: ElectionConfig[] = [
  {
    year: 2024,
    type: "municipal",
    description: "Eleições Municipais 2024",
    rounds: [1, 2],
    offices: { "11": "prefeito", "13": "vereador" },
  },
  {
    year: 2022,
    type: "federal",
    description: "Eleições Gerais 2022",
    rounds: [1, 2],
    offices: {
      "1": "presidente",
      "3": "governador",
      "5": "senador",
      "6": "dep_federal",
      "7": "dep_estadual",
    },
  },
  {
    year: 2020,
    type: "municipal",
    description: "Eleições Municipais 2020",
    rounds: [1, 2],
    offices: { "11": "prefeito", "13": "vereador" },
  },
  {
    year: 2018,
    type: "federal",
    description: "Eleições Gerais 2018",
    rounds: [1, 2],
    offices: {
      "1": "presidente",
      "3": "governador",
      "5": "senador",
      "6": "dep_federal",
      "7": "dep_estadual",
    },
  },
];

// ─── CSV Column indices (TSE standard format) ──────────
// These are determined by reading the header row at runtime.
interface CsvColumns {
  ANO_ELEICAO: number;
  NR_TURNO: number;
  SG_UF: number;
  CD_MUNICIPIO: number;
  NM_MUNICIPIO: number;
  NR_ZONA: number;
  CD_CARGO: number;
  DS_CARGO: number;
  SQ_CANDIDATO: number;
  NR_CANDIDATO: number;
  NM_CANDIDATO: number;
  NM_URNA_CANDIDATO: number;
  SG_PARTIDO: number;
  NM_PARTIDO: number;
  DS_COMPOSICAO_COLIGACAO: number;
  QT_VOTOS_NOMINAIS: number;
  DS_SIT_TOT_TURNO: number;
}

function parseColumns(header: string): CsvColumns {
  const cols = header.split(";").map((c) => c.replace(/"/g, "").trim());
  const idx = (name: string) => {
    const i = cols.indexOf(name);
    if (i === -1) throw new Error(`Column ${name} not found. Available: ${cols.join(", ")}`);
    return i;
  };
  return {
    ANO_ELEICAO: idx("ANO_ELEICAO"),
    NR_TURNO: idx("NR_TURNO"),
    SG_UF: idx("SG_UF"),
    CD_MUNICIPIO: idx("CD_MUNICIPIO"),
    NM_MUNICIPIO: idx("NM_MUNICIPIO"),
    NR_ZONA: idx("NR_ZONA"),
    CD_CARGO: idx("CD_CARGO"),
    DS_CARGO: idx("DS_CARGO"),
    SQ_CANDIDATO: idx("SQ_CANDIDATO"),
    NR_CANDIDATO: idx("NR_CANDIDATO"),
    NM_CANDIDATO: idx("NM_CANDIDATO"),
    NM_URNA_CANDIDATO: idx("NM_URNA_CANDIDATO"),
    SG_PARTIDO: idx("SG_PARTIDO"),
    NM_PARTIDO: idx("NM_PARTIDO"),
    DS_COMPOSICAO_COLIGACAO: idx("DS_COMPOSICAO_COLIGACAO"),
    QT_VOTOS_NOMINAIS: idx("QT_VOTOS_NOMINAIS"),
    DS_SIT_TOT_TURNO: idx("DS_SIT_TOT_TURNO"),
  };
}

function val(fields: string[], idx: number): string {
  return (fields[idx] || "").replace(/"/g, "").trim();
}

// ─── Download & extract ─────────────────────────────────
const TMP_DIR = path.resolve(__dirname, "../tmp/tse");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function downloadAndExtract(year: number): string {
  ensureDir(TMP_DIR);
  const zipUrl = `${BASE_URL}/votacao_candidato_munzona_${year}.zip`;
  const zipPath = path.join(TMP_DIR, `vcm_${year}.zip`);
  const extractDir = path.join(TMP_DIR, `vcm_${year}`);

  if (!fs.existsSync(zipPath)) {
    console.log(`  Baixando ${zipUrl}...`);
    execSync(`curl -L -o "${zipPath}" "${zipUrl}"`, {
      stdio: "inherit",
      timeout: 300000,
    });
  } else {
    console.log(`  ZIP já existe: ${zipPath}`);
  }

  if (!fs.existsSync(extractDir)) {
    console.log(`  Extraindo...`);
    fs.mkdirSync(extractDir, { recursive: true });
    execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, {
      stdio: "inherit",
    });
  }

  // Find the BA CSV file
  const files = fs.readdirSync(extractDir);
  const baCsv = files.find(
    (f) =>
      f.toLowerCase().includes("_ba") && f.toLowerCase().endsWith(".csv")
  );

  if (!baCsv) {
    // Some years have all states in one file
    const anyCsv = files.find((f) => f.toLowerCase().endsWith(".csv"));
    if (!anyCsv) throw new Error(`No CSV found in ${extractDir}`);
    console.log(`  Usando CSV completo: ${anyCsv} (filtrar por BA)`);
    return path.join(extractDir, anyCsv);
  }

  console.log(`  CSV encontrado: ${baCsv}`);
  return path.join(extractDir, baCsv);
}

// ─── Municipality matching ──────────────────────────────
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .trim();
}

let municipalityCache: Map<string, string> | null = null;

async function getMunicipalityMap(): Promise<Map<string, string>> {
  if (municipalityCache) return municipalityCache;
  const all = await prisma.municipality.findMany({
    select: { id: true, tseCode: true, nameNormalized: true },
  });
  const map = new Map<string, string>();
  for (const m of all) {
    if (m.tseCode) map.set(m.tseCode, m.id);
    map.set(m.nameNormalized, m.id);
  }
  municipalityCache = map;
  return map;
}

async function findMunicipalityId(
  tseCode: string,
  name: string
): Promise<string | null> {
  const map = await getMunicipalityMap();
  return map.get(tseCode) ?? map.get(normalizeName(name)) ?? null;
}

// ─── Main ingestion ─────────────────────────────────────
async function ingestYear(config: ElectionConfig) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${config.description} (${config.year})`);
  console.log(`${"═".repeat(60)}`);

  const csvPath = downloadAndExtract(config.year);

  // Create election records for each round
  const electionMap = new Map<number, string>();
  for (const round of config.rounds) {
    const election = await prisma.election.upsert({
      where: {
        year_round_type: {
          year: config.year,
          round,
          type: config.type,
        },
      },
      update: { description: config.description },
      create: {
        year: config.year,
        round,
        type: config.type,
        description: config.description,
      },
    });
    electionMap.set(round, election.id);
  }

  // Process CSV line by line (memory efficient for large files)
  // TSE CSVs are Latin-1 encoded — convert to UTF-8 via iconv
  const utf8Path = csvPath + ".utf8";
  if (!fs.existsSync(utf8Path)) {
    console.log("  Convertendo encoding para UTF-8...");
    try {
      execSync(`iconv -f LATIN1 -t UTF-8 "${csvPath}" > "${utf8Path}"`);
    } catch {
      // iconv might not be available, try python
      execSync(
        `python3 -c "
import codecs
with codecs.open('${csvPath}', 'r', 'latin-1') as f:
    with codecs.open('${utf8Path}', 'w', 'utf-8') as out:
        for line in f:
            out.write(line)
"`
      );
    }
  }

  const fileStream = fs.createReadStream(utf8Path);
  const rl = readline.createInterface({ input: fileStream });

  let columns: CsvColumns | null = null;
  let lineNum = 0;
  let processed = 0;
  let skipped = 0;
  const unmatchedMunicipalities = new Set<string>();

  // Batch processing
  const BATCH_SIZE = 500;
  interface CandidateBatch {
    sequentialCode: string;
    ballotNumber: string;
    name: string;
    ballotName: string;
    party: string;
    partyName: string;
    coalition: string;
    office: string;
    electionId: string;
    status: string;
  }
  interface VoteBatch {
    candidateKey: string; // sequentialCode|electionId
    municipalityId: string;
    electionId: string;
    zone: string;
    votes: number;
  }

  const candidateMap = new Map<string, CandidateBatch>();
  const voteBatches: VoteBatch[] = [];

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) {
      columns = parseColumns(line);
      continue;
    }

    const fields = line.split(";");
    if (!columns) continue;

    const uf = val(fields, columns.SG_UF);
    if (uf !== "BA") {
      skipped++;
      continue;
    }

    const cdCargo = val(fields, columns.CD_CARGO);
    const office = config.offices[cdCargo];
    if (!office) {
      skipped++;
      continue;
    }

    const round = parseInt(val(fields, columns.NR_TURNO), 10);
    const electionId = electionMap.get(round);
    if (!electionId) {
      skipped++;
      continue;
    }

    const tseCode = val(fields, columns.CD_MUNICIPIO);
    const munName = val(fields, columns.NM_MUNICIPIO);
    const municipalityId = await findMunicipalityId(tseCode, munName);
    if (!municipalityId) {
      unmatchedMunicipalities.add(`${tseCode}:${munName}`);
      skipped++;
      continue;
    }

    const seqCode = val(fields, columns.SQ_CANDIDATO);
    const candidateKey = `${seqCode}|${electionId}`;

    if (!candidateMap.has(candidateKey)) {
      candidateMap.set(candidateKey, {
        sequentialCode: seqCode,
        ballotNumber: val(fields, columns.NR_CANDIDATO),
        name: val(fields, columns.NM_CANDIDATO),
        ballotName: val(fields, columns.NM_URNA_CANDIDATO),
        party: val(fields, columns.SG_PARTIDO),
        partyName: val(fields, columns.NM_PARTIDO),
        coalition: val(fields, columns.DS_COMPOSICAO_COLIGACAO),
        office,
        electionId,
        status: val(fields, columns.DS_SIT_TOT_TURNO),
      });
    }

    const votes = parseInt(val(fields, columns.QT_VOTOS_NOMINAIS), 10) || 0;
    const zone = val(fields, columns.NR_ZONA);

    voteBatches.push({
      candidateKey,
      municipalityId,
      electionId,
      zone,
      votes,
    });

    processed++;

    if (voteBatches.length >= BATCH_SIZE * 10) {
      await flushBatches(candidateMap, voteBatches);
      voteBatches.length = 0;
    }

    if (processed % 10000 === 0) {
      console.log(`  ... ${processed.toLocaleString()} registros processados`);
    }
  }

  // Flush remaining
  if (voteBatches.length > 0) {
    await flushBatches(candidateMap, voteBatches);
  }

  if (unmatchedMunicipalities.size > 0) {
    console.log(
      `  ⚠ ${unmatchedMunicipalities.size} municípios não encontrados:`,
      [...unmatchedMunicipalities].slice(0, 10).join(", ")
    );
  }

  console.log(
    `  ✓ ${processed.toLocaleString()} registros de voto importados`
  );
  console.log(`  ✓ ${candidateMap.size.toLocaleString()} candidatos`);
  console.log(`  ✗ ${skipped.toLocaleString()} linhas ignoradas`);
}

// Candidate ID cache (sequentialCode|electionId → db id)
const candidateIdCache = new Map<string, string>();

async function flushBatches(
  candidateMap: Map<string, CandidateBatch>,
  votes: VoteBatch[]
) {
  // 1. Upsert candidates
  const needed = new Set(votes.map((v) => v.candidateKey));
  for (const key of needed) {
    if (candidateIdCache.has(key)) continue;
    const data = candidateMap.get(key);
    if (!data) continue;

    const candidate = await prisma.candidate.upsert({
      where: {
        sequentialCode_electionId: {
          sequentialCode: data.sequentialCode,
          electionId: data.electionId,
        },
      },
      update: {
        status: data.status,
      },
      create: {
        sequentialCode: data.sequentialCode,
        ballotNumber: data.ballotNumber,
        name: data.name,
        nameNormalized: normalizeName(data.name),
        ballotName: data.ballotName,
        ballotNameNormalized: normalizeName(data.ballotName),
        party: data.party,
        partyName: data.partyName,
        coalition: data.coalition,
        office: data.office,
        electionId: data.electionId,
        status: data.status,
      },
    });
    candidateIdCache.set(key, candidate.id);
  }

  // 2. Upsert vote results in batches
  for (let i = 0; i < votes.length; i += BATCH_UPSERT_SIZE) {
    const batch = votes.slice(i, i + BATCH_UPSERT_SIZE);
    await Promise.all(
      batch.map((v) => {
        const candidateId = candidateIdCache.get(v.candidateKey);
        if (!candidateId) return Promise.resolve();
        return prisma.voteResult.upsert({
          where: {
            candidateId_municipalityId_electionId_zone: {
              candidateId,
              municipalityId: v.municipalityId,
              electionId: v.electionId,
              zone: v.zone || "",
            },
          },
          update: { votes: v.votes },
          create: {
            candidateId,
            municipalityId: v.municipalityId,
            electionId: v.electionId,
            zone: v.zone || "",
            votes: v.votes,
          },
        });
      })
    );
  }
}

const BATCH_UPSERT_SIZE = 50;

// ─── CLI ────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const yearIdx = args.indexOf("--year");
  const targetYear = yearIdx !== -1 ? parseInt(args[yearIdx + 1], 10) : null;

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Ingestão de Dados TSE - Pulso Bahia   ║");
  console.log("╚══════════════════════════════════════════╝");

  const configs = targetYear
    ? ELECTIONS.filter((e) => e.year === targetYear)
    : ELECTIONS;

  if (configs.length === 0) {
    console.error(`Ano ${targetYear} não configurado.`);
    process.exit(1);
  }

  for (const config of configs) {
    await ingestYear(config);
  }

  console.log("\n✅ Ingestão concluída!");
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
