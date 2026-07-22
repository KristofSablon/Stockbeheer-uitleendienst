// Vercel-buildorkestrator.
// Verschillende Postgres-integraties op Vercel zetten de verbindings-URL onder
// verschillende variabelenamen (Vercel Postgres: POSTGRES_PRISMA_URL /
// POSTGRES_URL_NON_POOLING; nieuwere Neon-integratie: DATABASE_URL /
// DATABASE_URL_UNPOOLED; enz.). Dit script detecteert de aanwezige URL's,
// normaliseert ze naar de namen die het Prisma-schema verwacht, en voert dan
// de databank- en buildstappen uit met die omgeving.
import { execSync } from "node:child_process";

const env = { ...process.env };

// Kandidaten voor de gepoolde (app) en directe (migraties) verbinding, op volgorde.
const POOLED_KANDIDATEN = [
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_POOLED",
];
const DIRECT_KANDIDATEN = [
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "DIRECT_URL",
  "POSTGRES_URL",
  "DATABASE_URL",
];

const isPostgres = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);

function eerste(kandidaten) {
  for (const naam of kandidaten) {
    if (isPostgres(env[naam])) return { naam, waarde: env[naam] };
  }
  return null;
}

const pooled = eerste(POOLED_KANDIDATEN);
const direct = eerste(DIRECT_KANDIDATEN) ?? pooled;

if (!pooled) {
  console.error(
    "\n✗ Geen PostgreSQL-verbinding gevonden in de omgevingsvariabelen.\n" +
      "  Koppel eerst een Postgres-databank aan dit Vercel-project:\n" +
      "  Storage → Create Database → Postgres → Connect Project, en deploy dan opnieuw.\n" +
      "  (Gecontroleerde namen: " + [...new Set([...POOLED_KANDIDATEN, ...DIRECT_KANDIDATEN])].join(", ") + ")\n"
  );
  process.exit(1);
}

// Normaliseer naar de namen die prisma/schema.prod.prisma verwacht.
env.POSTGRES_PRISMA_URL = pooled.waarde;
env.POSTGRES_URL_NON_POOLING = direct.waarde;

console.log(`→ Databankverbinding gevonden (gepoold via ${pooled.naam}, direct via ${direct.naam}).`);

const stappen = [
  "node scripts/gen-prod-schema.mjs",
  "npx prisma generate --schema=prisma/schema.prod.prisma",
  "npx prisma db push --schema=prisma/schema.prod.prisma --accept-data-loss",
  "npx tsx prisma/seed.ts",
  "npx next build",
];

for (const stap of stappen) {
  console.log(`\n$ ${stap}`);
  execSync(stap, { stdio: "inherit", env });
}
