/**
 * RAG abstraction layer.
 * Prepared for future integration with OpenAI Responses API,
 * semantic search, and conversational intelligence.
 *
 * Current implementation provides stub interfaces and text-based search.
 */

import { prisma } from "@/lib/db/prisma";

export interface RAGResult {
  answer: string;
  sources: Array<{
    documentId: string;
    municipalityName: string;
    chunk: string;
    relevance: number;
  }>;
}

export interface AIProvider {
  generateAnswer(query: string, context: string[]): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

// Stub provider for MVP - returns formatted context without LLM
class LocalProvider implements AIProvider {
  async generateAnswer(query: string, context: string[]): Promise<string> {
    if (context.length === 0) {
      return "Não foram encontrados dados relevantes para esta consulta.";
    }
    return `Com base nos documentos encontrados:\n\n${context.join("\n\n")}`;
  }

  async generateEmbedding(): Promise<number[]> {
    return [];
  }
}

let provider: AIProvider = new LocalProvider();

export function setAIProvider(p: AIProvider) {
  provider = p;
}

export function getAIProvider(): AIProvider {
  return provider;
}

/**
 * Text-based search across source chunks and municipality data.
 * Will be upgraded to semantic search when embeddings are available.
 */
export async function searchDocuments(
  query: string,
  limit: number = 10
): Promise<RAGResult> {
  // Search in source chunks
  const chunks = await prisma.sourceChunk.findMany({
    where: {
      content: { contains: query },
    },
    include: {
      document: {
        include: { municipality: true },
      },
    },
    take: limit,
  });

  const sources = chunks.map((chunk, i) => ({
    documentId: chunk.documentId,
    municipalityName: chunk.document.municipality?.name ?? "Desconhecido",
    chunk: chunk.content.substring(0, 500),
    relevance: 1 - i * 0.1,
  }));

  const contextTexts = sources.map(
    (s) => `[${s.municipalityName}]: ${s.chunk}`
  );

  const answer = await provider.generateAnswer(query, contextTexts);

  return { answer, sources };
}

/**
 * Chunk text for storage and future embedding.
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}
