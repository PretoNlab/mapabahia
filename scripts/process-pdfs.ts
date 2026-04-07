/**
 * Batch process all PDFs from a local directory.
 * Usage: npx tsx scripts/process-pdfs.ts [path-to-pdf-directory]
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  extractMunicipalityFromFilename,
  normalizeMunicipalityName,
} from "../src/lib/normalizers/municipality";
import {
  parseElectionPdf,
} from "../src/lib/parsers/election-pdf";
import { chunkText } from "../src/lib/rag/index";

const adapter = new PrismaLibSql({ url: `file:${path.resolve(__dirname, "../prisma/dev.db")}` });
const prisma = new PrismaClient({ adapter });

function extractText(filePath: string): { text: string; numpages: number } {
  const pyScript = path.resolve(__dirname, "extract-pdf.py");
  const result = execSync(`python3 "${pyScript}" "${filePath}"`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: "utf-8",
  });
  const parsed = JSON.parse(result);
  return { text: parsed.text, numpages: parsed.pageCount };
}

async function main() {
  const pdfDir =
    process.argv[2] ||
    path.resolve(
      __dirname,
      "../../mapabahia/Relatorio_Resultado_Totalizacao_2024_BA"
    );

  console.log(`Processing PDFs from: ${pdfDir}`);

  if (!fs.existsSync(pdfDir)) {
    console.error(`Directory not found: ${pdfDir}`);
    process.exit(1);
  }

  const pdfFiles = fs
    .readdirSync(pdfDir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  console.log(`Found ${pdfFiles.length} PDF files`);

  // Create ingestion job
  const job = await prisma.ingestionJob.create({
    data: {
      status: "running",
      totalFiles: pdfFiles.length,
      sourcePath: pdfDir,
      startedAt: new Date(),
    },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const file of pdfFiles) {
    const filePath = path.join(pdfDir, file);
    processed++;

    try {
      console.log(`[${processed}/${pdfFiles.length}] Processing: ${file}`);

      // Parse filename
      const fileMeta = extractMunicipalityFromFilename(file);
      if (!fileMeta) {
        throw new Error(`Could not parse filename: ${file}`);
      }

      // Extract text
      const pdfData = extractText(filePath);
      const result = parseElectionPdf(pdfData.text, pdfData.numpages);

      // Find or determine municipality name
      const munName =
        result.summary.municipalityName || fileMeta.municipality;
      const munNormalized = normalizeMunicipalityName(munName);

      // Find municipality in DB
      let municipality = await prisma.municipality.findFirst({
        where: { nameNormalized: munNormalized, uf: "BA" },
      });

      // Create municipality if not found (from GeoJSON import)
      if (!municipality) {
        municipality = await prisma.municipality.create({
          data: {
            name: munName,
            nameNormalized: munNormalized,
            tseCode: result.summary.tseCode,
            uf: "BA",
          },
        });
      } else if (result.summary.tseCode && !municipality.tseCode) {
        await prisma.municipality.update({
          where: { id: municipality.id },
          data: { tseCode: result.summary.tseCode },
        });
      }

      // Upsert election document
      const doc = await prisma.electionDocument.upsert({
        where: { fileName: file },
        create: {
          fileName: file,
          filePath: filePath,
          rawText: result.rawText,
          municipalityId: municipality.id,
          year: fileMeta.year,
          round: fileMeta.round,
          uf: "BA",
          pageCount: result.pageCount,
          status: "completed",
          processedAt: new Date(),
          ingestionJobId: job.id,
        },
        update: {
          rawText: result.rawText,
          municipalityId: municipality.id,
          status: "completed",
          pageCount: result.pageCount,
          processedAt: new Date(),
          errorMessage: null,
          ingestionJobId: job.id,
        },
      });

      // Upsert election result summary
      const s = result.summary;
      await prisma.electionResultSummary.upsert({
        where: { documentId: doc.id },
        create: {
          documentId: doc.id,
          municipalityId: municipality.id,
          year: fileMeta.year,
          round: fileMeta.round,
          totalSections: s.totalSections,
          eligibleVoters: s.eligibleVoters,
          turnout: s.turnout,
          turnoutPercentage: s.turnoutPercentage,
          abstention: s.abstention,
          abstentionPercentage: s.abstentionPercentage,
          totalVotesMayor: s.totalVotesMayor,
          validVotesMayor: s.validVotesMayor,
          validVotesMayorPercentage: s.validVotesMayorPercentage,
          nullVotesMayor: s.nullVotesMayor,
          nullVotesMayorPercentage: s.nullVotesMayorPercentage,
          blankVotesMayor: s.blankVotesMayor,
          blankVotesMayorPercentage: s.blankVotesMayorPercentage,
          totalVotesCouncil: s.totalVotesCouncil,
          validVotesCouncil: s.validVotesCouncil,
          validVotesCouncilPercentage: s.validVotesCouncilPercentage,
          nominalVotesCouncil: s.nominalVotesCouncil,
          legendVotesCouncil: s.legendVotesCouncil,
          nullVotesCouncil: s.nullVotesCouncil,
          nullVotesCouncilPercentage: s.nullVotesCouncilPercentage,
          blankVotesCouncil: s.blankVotesCouncil,
          blankVotesCouncilPercentage: s.blankVotesCouncilPercentage,
        },
        update: {
          totalSections: s.totalSections,
          eligibleVoters: s.eligibleVoters,
          turnout: s.turnout,
          turnoutPercentage: s.turnoutPercentage,
          abstention: s.abstention,
          abstentionPercentage: s.abstentionPercentage,
          totalVotesMayor: s.totalVotesMayor,
          validVotesMayor: s.validVotesMayor,
          validVotesMayorPercentage: s.validVotesMayorPercentage,
          nullVotesMayor: s.nullVotesMayor,
          nullVotesMayorPercentage: s.nullVotesMayorPercentage,
          blankVotesMayor: s.blankVotesMayor,
          blankVotesMayorPercentage: s.blankVotesMayorPercentage,
          totalVotesCouncil: s.totalVotesCouncil,
          validVotesCouncil: s.validVotesCouncil,
          validVotesCouncilPercentage: s.validVotesCouncilPercentage,
          nominalVotesCouncil: s.nominalVotesCouncil,
          legendVotesCouncil: s.legendVotesCouncil,
          nullVotesCouncil: s.nullVotesCouncil,
          nullVotesCouncilPercentage: s.nullVotesCouncilPercentage,
          blankVotesCouncil: s.blankVotesCouncil,
          blankVotesCouncilPercentage: s.blankVotesCouncilPercentage,
        },
      });

      // Delete old candidates and re-insert
      await prisma.candidateResultLegacy.deleteMany({
        where: { documentId: doc.id },
      });

      if (result.candidates.length > 0) {
        await prisma.candidateResultLegacy.createMany({
          data: result.candidates.map((c) => ({
            documentId: doc.id,
            municipalityId: municipality!.id,
            year: fileMeta.year,
            round: fileMeta.round,
            candidateNumber: c.number,
            candidateName: c.name,
            role: c.role,
            party: c.party,
            coalition: c.coalition,
            votes: c.votes,
            votePercentage: c.votePercentage,
            status: c.status,
            voteDestination: c.voteDestination,
          })),
        });
      }

      // Create source chunks for RAG
      await prisma.sourceChunk.deleteMany({
        where: { documentId: doc.id },
      });

      const chunks = chunkText(result.rawText);
      if (chunks.length > 0) {
        await prisma.sourceChunk.createMany({
          data: chunks.map((content, i) => ({
            documentId: doc.id,
            content,
            chunkIndex: i,
          })),
        });
      }

      succeeded++;
    } catch (error) {
      failed++;
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${file}: ${errMsg}`);
      console.error(`  ERROR: ${errMsg}`);

      // Record error in document
      await prisma.electionDocument
        .upsert({
          where: { fileName: file },
          create: {
            fileName: file,
            filePath: filePath,
            year: 2024,
            round: 1,
            status: "error",
            errorMessage: errMsg,
            ingestionJobId: job.id,
          },
          update: {
            status: "error",
            errorMessage: errMsg,
            ingestionJobId: job.id,
          },
        })
        .catch(() => {});
    }
  }

  // Update job status
  await prisma.ingestionJob.update({
    where: { id: job.id },
    data: {
      status: failed === pdfFiles.length ? "failed" : "completed",
      processed,
      succeeded,
      failed,
      errorLog: errors.length > 0 ? errors.join("\n") : null,
      completedAt: new Date(),
    },
  });

  console.log(`\nDone!`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
