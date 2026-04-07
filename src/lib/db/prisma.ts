import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  let url =
    process.env.TURSO_DATABASE_URL || `file:${process.cwd()}/prisma/dev.db`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // Turso libsql:// URLs need to be converted to https:// for the web/serverless client
  if (url.startsWith("libsql://")) {
    url = url.replace("libsql://", "https://");
  }

  const adapter = new PrismaLibSql(
    authToken ? { url, authToken } : { url }
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
