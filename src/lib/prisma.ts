import { PrismaClient } from "@prisma/client";

// Normaliseer de PostgreSQL-verbindingsvariabelen bij het draaien in productie.
// Verschillende Vercel/Neon-integraties gebruiken andere namen; het prod-schema
// verwacht POSTGRES_PRISMA_URL (gepoold) en POSTGRES_URL_NON_POOLING (direct).
// We vullen die aan vanuit veelvoorkomende alternatieven wanneer ze een
// PostgreSQL-URL bevatten. Lokaal (SQLite via DATABASE_URL="file:...") gebeurt er
// niets, want die waarde is geen postgres-URL.
function normaliseerDbEnv() {
  const isPg = (v?: string) => !!v && /^postgres(ql)?:\/\//.test(v);
  if (!process.env.POSTGRES_PRISMA_URL) {
    const pooled = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.DATABASE_URL_POOLED].find(isPg);
    if (pooled) process.env.POSTGRES_PRISMA_URL = pooled;
  }
  if (!process.env.POSTGRES_URL_NON_POOLING) {
    const direct = [
      process.env.DATABASE_URL_UNPOOLED,
      process.env.DIRECT_URL,
      process.env.POSTGRES_URL,
      process.env.DATABASE_URL,
    ].find(isPg);
    if (direct) process.env.POSTGRES_URL_NON_POOLING = direct;
  }
}
normaliseerDbEnv();

// Eén PrismaClient-instantie hergebruiken (voorkomt te veel verbindingen bij hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
