import { NextResponse } from "next/server";

export async function POST() {
  // In production, this would trigger the batch process.
  // For now, instruct to use the CLI script.
  return NextResponse.json({
    message:
      "Use the CLI to process PDFs: npx tsx scripts/process-pdfs.ts [path]",
    hint: "A background worker integration is planned for future versions.",
  });
}
