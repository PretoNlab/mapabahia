/**
 * PDF text extraction using pdf-parse (Node.js).
 * Used in API routes and scripts, NOT in client components.
 */
import fs from "fs";
import path from "path";
import * as pdfParseModule from "pdf-parse";

// Handle CJS/ESM interop
const pdfParse = (pdfParseModule as unknown as { default?: typeof pdfParseModule }).default ?? pdfParseModule;

export interface ExtractedPdf {
  text: string;
  pageCount: number;
  fileName: string;
}

export async function extractTextFromPdf(
  filePath: string
): Promise<ExtractedPdf> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await (pdfParse as unknown as (buf: Buffer) => Promise<{ text: string; numpages: number }>)(dataBuffer);

  return {
    text: data.text,
    pageCount: data.numpages,
    fileName: path.basename(filePath),
  };
}

export function listPdfFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  return fs
    .readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(dirPath, f));
}
