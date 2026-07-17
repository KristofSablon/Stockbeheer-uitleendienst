import { prisma } from "./prisma";

// Bepaalt hoeveel exemplaren van een materiaal reeds gereserveerd zijn in een
// bepaalde periode (overlappende actieve reservaties), en dus wat vrij is.
// Reservaties met status GERESERVEERD of BEVESTIGD tellen mee.

const ACTIEVE_RESERVATIE_STATUS = ["GERESERVEERD", "BEVESTIGD"];

export type BeschikbaarheidResultaat = {
  materiaalId: string;
  totaal: number;
  gereserveerd: number;
  inOnderhoud: number;
  beschikbaar: number;
};

// Reservaties overlappen als (van <= periodeTot) EN (tot >= periodeVan).
export async function gereserveerdInPeriode(
  materiaalId: string,
  van: Date,
  tot: Date,
  negeerDossierId?: string
): Promise<number> {
  const reservaties = await prisma.reservatie.findMany({
    where: {
      materiaalId,
      status: { in: ACTIEVE_RESERVATIE_STATUS },
      van: { lte: tot },
      tot: { gte: van },
      ...(negeerDossierId ? { dossierId: { not: negeerDossierId } } : {}),
    },
    select: { aantal: true },
  });
  return reservaties.reduce((som, r) => som + r.aantal, 0);
}

// Aantal exemplaren dat in de periode in onderhoud/keuring staat (niet-beschikbaar).
export async function inOnderhoudInPeriode(materiaalId: string, van: Date, tot: Date): Promise<number> {
  const onderhoud = await prisma.onderhoud.findMany({
    where: {
      materiaalId,
      status: { in: ["GEPLAND", "BEZIG"] },
      datum: { lte: tot },
      OR: [{ vervaldatum: null }, { vervaldatum: { gte: van } }],
    },
  });
  // Voor de prototype-logica beschouwen we onderhoud als 1 exemplaar uit circulatie per record.
  return onderhoud.length;
}

export async function beschikbaarheid(
  materiaalId: string,
  van: Date,
  tot: Date,
  negeerDossierId?: string
): Promise<BeschikbaarheidResultaat> {
  const materiaal = await prisma.materiaal.findUnique({ where: { id: materiaalId } });
  const totaal = materiaal?.totaalAantal ?? 0;
  const gereserveerd = await gereserveerdInPeriode(materiaalId, van, tot, negeerDossierId);
  const inOnderhoud = await inOnderhoudInPeriode(materiaalId, van, tot);
  const beschikbaar = Math.max(0, totaal - gereserveerd - inOnderhoud);
  return { materiaalId, totaal, gereserveerd, inOnderhoud, beschikbaar };
}

// Controleert een volledige aanvraag (regels) tegen de beschikbaarheid en
// capaciteitslimieten. Retourneert per regel de bevindingen.
export type StockcheckRegel = {
  materiaalId: string;
  materiaalNaam: string;
  gevraagd: number;
  beschikbaar: number;
  capaciteitslimiet: number | null;
  overschrijdtCapaciteit: boolean;
  voldoende: boolean;
};

export async function stockcheck(
  regels: { materiaalId: string; gevraagdAantal: number }[],
  van: Date,
  tot: Date,
  negeerDossierId?: string
): Promise<{ ok: boolean; regels: StockcheckRegel[] }> {
  const resultaat: StockcheckRegel[] = [];
  for (const regel of regels) {
    const materiaal = await prisma.materiaal.findUnique({ where: { id: regel.materiaalId } });
    if (!materiaal) continue;
    const b = await beschikbaarheid(regel.materiaalId, van, tot, negeerDossierId);
    const overschrijdtCapaciteit =
      materiaal.capaciteitslimiet != null && regel.gevraagdAantal > materiaal.capaciteitslimiet;
    resultaat.push({
      materiaalId: regel.materiaalId,
      materiaalNaam: materiaal.naam,
      gevraagd: regel.gevraagdAantal,
      beschikbaar: b.beschikbaar,
      capaciteitslimiet: materiaal.capaciteitslimiet ?? null,
      overschrijdtCapaciteit,
      voldoende: regel.gevraagdAantal <= b.beschikbaar && !overschrijdtCapaciteit,
    });
  }
  return { ok: resultaat.every((r) => r.voldoende), regels: resultaat };
}
