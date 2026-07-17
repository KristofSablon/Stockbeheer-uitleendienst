// Genereert prisma/schema.prod.prisma uit prisma/schema.prisma door enkel het
// datasource-blok te vervangen (SQLite → PostgreSQL). Zo blijft het datamodel op
// één plek staan (schema.prisma, voor lokale SQLite-ontwikkeling) en gebruikt de
// Vercel-productiebuild dezelfde modellen op PostgreSQL.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bron = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");

const postgresDatasource = `datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}`;

// Vervang het volledige datasource db { ... }-blok.
const uitvoer = bron.replace(/datasource\s+db\s+\{[^}]*\}/m, postgresDatasource);

if (!uitvoer.includes("postgresql")) {
  console.error("FOUT: datasource-blok niet gevonden/vervangen.");
  process.exit(1);
}

writeFileSync(join(root, "prisma", "schema.prod.prisma"), uitvoer);
console.log("✔ prisma/schema.prod.prisma gegenereerd (PostgreSQL).");
