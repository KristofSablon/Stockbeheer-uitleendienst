import { prisma } from "./prisma";

// Genereert een uniek referentienummer in de vorm UL-JJJJ-NNNN.
export async function nieuwReferentienummer(): Promise<string> {
  const jaar = new Date().getFullYear();
  const prefix = `UL-${jaar}-`;

  const laatste = await prisma.dossier.findFirst({
    where: { referentienummer: { startsWith: prefix } },
    orderBy: { referentienummer: "desc" },
    select: { referentienummer: true },
  });

  let volgnummer = 1;
  if (laatste) {
    const deel = laatste.referentienummer.slice(prefix.length);
    const n = parseInt(deel, 10);
    if (!Number.isNaN(n)) volgnummer = n + 1;
  }

  return `${prefix}${String(volgnummer).padStart(4, "0")}`;
}
