// Initialiseert/actualiseert de PRODUCTIE-databank (PostgreSQL): genereert het
// prod-schema, maakt/actualiseert de tabellen (db push) en draait de seed.
// Gebruik: DATABASE_URL="postgresql://..." node scripts/db-prod.mjs
// Herkent dezelfde variabelenamen als de Vercel-build (POSTGRES_PRISMA_URL,
// DATABASE_URL, DATABASE_URL_UNPOOLED, ...). De seed is idempotent.
import { execSync } from "node:child_process";

const env = { ...process.env };
const isPostgres = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);
const eerste = (namen) => {
  for (const naam of namen) if (isPostgres(env[naam])) return { naam, waarde: env[naam] };
  return null;
};

const pooled = eerste(["POSTGRES_PRISMA_URL", "DATABASE_URL", "POSTGRES_URL", "DATABASE_URL_POOLED"]);
const direct = eerste(["POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL", "DATABASE_URL"]) ?? pooled;

if (!pooled) {
  console.error("✗ Geen PostgreSQL-verbinding gevonden. Zet DATABASE_URL (of POSTGRES_PRISMA_URL) naar de productie-databank.");
  process.exit(1);
}
env.POSTGRES_PRISMA_URL = pooled.waarde;
env.POSTGRES_URL_NON_POOLING = direct.waarde;
console.log(`→ Databank: gepoold via ${pooled.naam}, direct via ${direct.naam}.`);

for (const stap of [
  "node scripts/gen-prod-schema.mjs",
  "npx prisma generate --schema=prisma/schema.prod.prisma",
  "npx prisma db push --schema=prisma/schema.prod.prisma --accept-data-loss",
  "npx tsx prisma/seed.ts",
]) {
  console.log(`\n$ ${stap}`);
  execSync(stap, { stdio: "inherit", env });
}
console.log("\n✔ Productie-databank klaar.");
