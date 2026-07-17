"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessie } from "@/lib/auth";
import { STATUS, magOvergang } from "@/lib/domein";
import { berekenKosten } from "@/lib/berekening";
import { getConfigGetal } from "@/lib/config";

async function vereisSessie() {
  const sessie = await getSessie();
  if (!sessie) throw new Error("Niet aangemeld");
  return sessie;
}

async function logStatus(dossierId: string, van: string | null, naar: string, door: string, opmerking?: string) {
  await prisma.statusHistoriek.create({
    data: { dossierId, vanStatus: van, naarStatus: naar, doorGebruiker: door, opmerking: opmerking || null },
  });
}

function ververs(dossierId: string) {
  revalidatePath(`/backoffice/dossiers/${dossierId}`);
  revalidatePath("/backoffice/dossiers");
  revalidatePath("/backoffice");
}

// --- Generieke statusovergang (voor eenvoudige stappen) ---------------------

export async function zetStatus(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));
  const naar = String(formData.get("naarStatus"));
  const opmerking = String(formData.get("opmerking") ?? "");

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
  if (!dossier) throw new Error("Dossier niet gevonden");
  if (!magOvergang(dossier.status, naar)) throw new Error(`Ongeldige statusovergang: ${dossier.status} → ${naar}`);

  await prisma.dossier.update({ where: { id: dossierId }, data: { status: naar } });
  await logStatus(dossierId, dossier.status, naar, sessie.naam, opmerking);
  ververs(dossierId);
}

// --- Behandeling: goedkeuren -----------------------------------------------

export async function goedkeuren(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));

  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    include: { regels: { include: { materiaal: true } }, contactpersoon: true },
  });
  if (!dossier) throw new Error("Dossier niet gevonden");
  if (!magOvergang(dossier.status, STATUS.GOEDGEKEURD)) {
    throw new Error("Dossier kan in deze status niet worden goedgekeurd.");
  }

  // Toegekende aantallen per regel inlezen (veld toegekend_<regelId>), deelbedrag berekenen.
  for (const regel of dossier.regels) {
    const raw = formData.get(`toegekend_${regel.id}`);
    const toegekend = raw != null ? parseInt(String(raw), 10) : regel.gevraagdAantal;
    const aantal = Number.isNaN(toegekend) ? regel.gevraagdAantal : Math.max(0, toegekend);
    const deelbedrag = Math.round(regel.materiaal.huurtarief * aantal * 100) / 100;
    await prisma.aanvraagregel.update({
      where: { id: regel.id },
      data: { toegekendAantal: aantal, deelbedrag },
    });

    // Reservatie aanmaken voor de uitleenperiode.
    if (aantal > 0) {
      await prisma.reservatie.create({
        data: {
          materiaalId: regel.materiaalId,
          dossierId,
          van: dossier.uitleenVan,
          tot: dossier.uitleenTot,
          aantal,
          status: "GERESERVEERD",
        },
      });
    }
  }

  await prisma.dossier.update({ where: { id: dossierId }, data: { status: STATUS.GOEDGEKEURD } });
  await logStatus(dossierId, dossier.status, STATUS.GOEDGEKEURD, sessie.naam, "Aanvraag goedgekeurd na stock- en capaciteitscheck");

  // Werkopdracht aanmaken voor de uitvoerende dienst (levering of afhaling).
  await prisma.werkopdracht.create({
    data: {
      dossierId,
      type: dossier.leveringswijze === "LEVERING" ? "LEVERING" : "AFHALING",
      datum: dossier.uitleenVan,
      status: "GEPLAND",
    },
  });

  // Notificatie.
  await prisma.notificatie.create({
    data: {
      dossierId,
      type: "GOEDKEURING",
      ontvanger: dossier.contactpersoon?.email ?? null,
      kanaal: "EMAIL",
      onderwerp: `Aanvraag ${dossier.referentienummer} goedgekeurd`,
      inhoud: "Uw aanvraag werd goedgekeurd. U ontvangt binnenkort een bevestiging met kostenoverzicht.",
    },
  });

  ververs(dossierId);
}

// --- Behandeling: weigeren --------------------------------------------------

export async function weigeren(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));
  const reden = String(formData.get("reden") ?? "").trim();
  if (!reden) throw new Error("Geef een reden voor de weigering op.");

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId }, include: { contactpersoon: true } });
  if (!dossier) throw new Error("Dossier niet gevonden");
  if (!magOvergang(dossier.status, STATUS.GEWEIGERD)) throw new Error("Dossier kan niet geweigerd worden.");

  await prisma.dossier.update({ where: { id: dossierId }, data: { status: STATUS.GEWEIGERD, weigeringReden: reden } });
  await logStatus(dossierId, dossier.status, STATUS.GEWEIGERD, sessie.naam, reden);
  await prisma.notificatie.create({
    data: {
      dossierId,
      type: "WEIGERING",
      ontvanger: dossier.contactpersoon?.email ?? null,
      kanaal: "EMAIL",
      onderwerp: `Aanvraag ${dossier.referentienummer} geweigerd`,
      inhoud: `Uw aanvraag werd geweigerd. Reden: ${reden}`,
    },
  });
  ververs(dossierId);
}

// --- Behandeling: wacht op aanvulling ---------------------------------------

export async function wachtOpAanvulling(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));
  const opmerking = String(formData.get("opmerking") ?? "").trim();

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId }, include: { contactpersoon: true } });
  if (!dossier) throw new Error("Dossier niet gevonden");
  if (!magOvergang(dossier.status, STATUS.WACHT_OP_AANVULLING)) throw new Error("Ongeldige overgang.");

  await prisma.dossier.update({ where: { id: dossierId }, data: { status: STATUS.WACHT_OP_AANVULLING } });
  await logStatus(dossierId, dossier.status, STATUS.WACHT_OP_AANVULLING, sessie.naam, opmerking);
  await prisma.notificatie.create({
    data: {
      dossierId,
      type: "ONVOLLEDIG",
      ontvanger: dossier.contactpersoon?.email ?? null,
      kanaal: "EMAIL",
      onderwerp: `Aanvraag ${dossier.referentienummer} — bijkomende informatie gevraagd`,
      inhoud: opmerking || "Gelieve uw aanvraag aan te vullen.",
    },
  });
  ververs(dossierId);
}

// --- Bevestiging & facturatie ----------------------------------------------

export async function bevestigen(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));

  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    include: { regels: { include: { materiaal: true } }, contactpersoon: true },
  });
  if (!dossier) throw new Error("Dossier niet gevonden");
  if (!magOvergang(dossier.status, STATUS.BEVESTIGD)) throw new Error("Dossier kan niet bevestigd worden.");

  const kost = await berekenKosten({
    leveringswijze: dossier.leveringswijze,
    regels: dossier.regels.map((r) => ({
      materiaalNaam: r.materiaal.naam,
      aantal: r.toegekendAantal || r.gevraagdAantal,
      huurtarief: r.materiaal.huurtarief,
      transporttarief: r.materiaal.transporttarief,
      transportVereist: r.materiaal.transportVereist,
    })),
  });

  const dagenVoor = await getConfigGetal("BETALING_DAGEN_VOOR_LEVERING");
  const vervaldag = new Date(dossier.uitleenVan);
  vervaldag.setDate(vervaldag.getDate() - dagenVoor);

  await prisma.factuur.upsert({
    where: { dossierId },
    update: {
      bedragHuur: kost.huur,
      bedragTransport: kost.transport,
      totaal: kost.totaal,
      vervaldag,
      betaalstatus: "OPEN",
    },
    create: {
      dossierId,
      bedragHuur: kost.huur,
      bedragTransport: kost.transport,
      bedragSchade: 0,
      boete: 0,
      totaal: kost.totaal,
      vervaldag,
      betaalstatus: "OPEN",
    },
  });

  await prisma.dossier.update({ where: { id: dossierId }, data: { status: STATUS.BEVESTIGD } });
  await logStatus(dossierId, dossier.status, STATUS.BEVESTIGD, sessie.naam, `Bevestigd; totaal ${kost.totaal} €`);
  await prisma.notificatie.create({
    data: {
      dossierId,
      type: "BEVESTIGING",
      ontvanger: dossier.contactpersoon?.email ?? null,
      kanaal: "EMAIL",
      onderwerp: `Bevestiging aanvraag ${dossier.referentienummer}`,
      inhoud: `Uw aanvraag is bevestigd. Totaal te betalen: ${kost.totaal} € (huur ${kost.huur} € + transport ${kost.transport} €). Betaal uiterlijk ${dagenVoor} dagen voor de levering.`,
    },
  });
  ververs(dossierId);
}

export async function markeerBetaald(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
  if (!dossier) throw new Error("Dossier niet gevonden");
  if (!magOvergang(dossier.status, STATUS.BETAALD)) throw new Error("Ongeldige overgang.");

  await prisma.factuur.updateMany({ where: { dossierId }, data: { betaalstatus: "BETAALD" } });
  await prisma.dossier.update({ where: { id: dossierId }, data: { status: STATUS.BETAALD } });
  await logStatus(dossierId, dossier.status, STATUS.BETAALD, sessie.naam, "Betaling geregistreerd");
  ververs(dossierId);
}

// --- Uitvoering: ontvangstbewijs (fase 2) -----------------------------------

export async function slaOntvangstbewijsOp(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));

  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    include: { regels: { include: { materiaal: true } } },
  });
  if (!dossier) throw new Error("Dossier niet gevonden");

  const handtekeningAanvrager = String(formData.get("handtekeningAanvrager") ?? "").trim();
  const handtekeningMedewerker = String(formData.get("handtekeningMedewerker") ?? sessie.naam).trim();
  const opmerkingen = String(formData.get("opmerkingen") ?? "");

  await prisma.ontvangstbewijs.upsert({
    where: { dossierId },
    update: { handtekeningAanvrager, handtekeningMedewerker, opmerkingen, geplandeRetour: dossier.uitleenTot },
    create: {
      dossierId,
      geplandeRetour: dossier.uitleenTot,
      handtekeningAanvrager,
      handtekeningMedewerker,
      opmerkingen,
      regels: {
        create: dossier.regels
          .filter((r) => (r.toegekendAantal || r.gevraagdAantal) > 0)
          .map((r) => ({
            materiaalNaam: r.materiaal.naam,
            aantal: r.toegekendAantal || r.gevraagdAantal,
            staatBijLevering: "GOED",
          })),
      },
    },
  });

  // Status door naar UITGELEVERD indien toegelaten.
  if (magOvergang(dossier.status, STATUS.UITGELEVERD)) {
    await prisma.dossier.update({ where: { id: dossierId }, data: { status: STATUS.UITGELEVERD } });
    await logStatus(dossierId, dossier.status, STATUS.UITGELEVERD, sessie.naam, "Ontvangstbewijs ondertekend");
  }
  ververs(dossierId);
}

// --- Nazorg: retourformulier + schade (fase 2) ------------------------------

export async function slaRetourformulierOp(formData: FormData) {
  const sessie = await vereisSessie();
  const dossierId = String(formData.get("dossierId"));

  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    include: { regels: { include: { materiaal: true } }, factuur: true },
  });
  if (!dossier) throw new Error("Dossier niet gevonden");

  const eigenHerstelPerUur = await getConfigGetal("EIGEN_HERSTEL_PER_UUR");
  const boetePerDag = await getConfigGetal("BOETE_PER_DAG");

  // Retourformulier (opnieuw) aanmaken.
  const bestaand = await prisma.retourformulier.findUnique({ where: { dossierId } });
  if (bestaand) {
    await prisma.retourRegel.deleteMany({ where: { retourformulierId: bestaand.id } });
    await prisma.retourformulier.delete({ where: { dossierId } });
  }
  await prisma.schadegeval.deleteMany({ where: { dossierId } });

  let heeftSchade = false;
  let schadeKost = 0;
  const retourRegels: { materiaalNaam: string; aantal: number; beoordeling: string; opmerking: string | null }[] = [];

  for (const regel of dossier.regels) {
    const beoordeling = String(formData.get(`beoordeling_${regel.id}`) ?? "GOED");
    const opmerking = String(formData.get(`schadeomschrijving_${regel.id}`) ?? "").trim();
    const aantal = regel.toegekendAantal || regel.gevraagdAantal;
    retourRegels.push({ materiaalNaam: regel.materiaal.naam, aantal, beoordeling, opmerking: opmerking || null });

    if (beoordeling === "SCHADE") {
      heeftSchade = true;
      const actie = String(formData.get(`schadeactie_${regel.id}`) ?? "EIGEN_HERSTEL");
      const uren = parseFloat(String(formData.get(`schade_uren_${regel.id}`) ?? "0")) || 0;
      const externeKost = parseFloat(String(formData.get(`schade_kost_${regel.id}`) ?? "0")) || 0;
      const geraamd = actie === "EIGEN_HERSTEL" ? Math.ceil(uren) * eigenHerstelPerUur : externeKost;
      schadeKost += geraamd;
      await prisma.schadegeval.create({
        data: {
          dossierId,
          materiaalId: regel.materiaalId,
          omschrijving: opmerking || "Schade vastgesteld bij retour",
          actie,
          geraamdeKost: geraamd,
        },
      });
    }
  }

  // Laattijdige retour → boete.
  const retourdatumStr = String(formData.get("retourdatum") ?? "");
  const retourdatum = retourdatumStr ? new Date(retourdatumStr) : new Date();
  let dagenTeLaat = 0;
  const verschil = Math.round((retourdatum.getTime() - dossier.uitleenTot.getTime()) / (1000 * 60 * 60 * 24));
  if (verschil > 0) dagenTeLaat = verschil;
  const boete = dagenTeLaat * boetePerDag;

  await prisma.retourformulier.create({
    data: {
      dossierId,
      retourdatum,
      algemeneStatus: heeftSchade ? "SCHADE" : "GEEN_SCHADE",
      handtekeningMedewerker: sessie.naam,
      handtekeningAanvrager: String(formData.get("handtekeningAanvrager") ?? ""),
      opmerkingen: String(formData.get("opmerkingen") ?? ""),
      regels: { create: retourRegels },
    },
  });

  // Reservaties vrijgeven.
  await prisma.reservatie.updateMany({ where: { dossierId }, data: { status: "AFGEROND" } });

  // Factuur bijwerken met schade + boete.
  if (dossier.factuur && (schadeKost > 0 || boete > 0)) {
    const nieuwTotaal = dossier.factuur.bedragHuur + dossier.factuur.bedragTransport + schadeKost + boete;
    await prisma.factuur.update({
      where: { dossierId },
      data: { bedragSchade: schadeKost, boete, totaal: Math.round(nieuwTotaal * 100) / 100, betaalstatus: "OPEN" },
    });
  }

  // Statusovergang: IN_CONTROLE → SCHADE_VASTGESTELD of AFGESLOTEN.
  const naar = heeftSchade ? STATUS.SCHADE_VASTGESTELD : STATUS.AFGESLOTEN;
  if (magOvergang(dossier.status, naar)) {
    await prisma.dossier.update({ where: { id: dossierId }, data: { status: naar } });
    await logStatus(dossierId, dossier.status, naar, sessie.naam, heeftSchade ? `Schade vastgesteld (${schadeKost} €)` : "Retour zonder schade, dossier afgesloten");
    if (heeftSchade) {
      await prisma.notificatie.create({
        data: {
          dossierId,
          type: "SCHADE",
          kanaal: "EMAIL",
          onderwerp: `Schade vastgesteld bij ${dossier.referentienummer}`,
          inhoud: `Bij de controle werd schade vastgesteld. Geraamde kost: ${schadeKost} €${boete > 0 ? ` + boete ${boete} €` : ""}.`,
        },
      });
    }
  }
  ververs(dossierId);
}

// --- Planning: werkopdracht toewijzen (fase 2) ------------------------------

export async function wijsWerkopdrachtToe(formData: FormData) {
  await vereisSessie();
  const werkopdrachtId = String(formData.get("werkopdrachtId"));
  const medewerkerId = String(formData.get("medewerkerId") ?? "");
  const datumStr = String(formData.get("datum") ?? "");
  const tijdsvenster = String(formData.get("tijdsvenster") ?? "");
  const topdeskRef = String(formData.get("topdeskRef") ?? "");

  const wo = await prisma.werkopdracht.findUnique({ where: { id: werkopdrachtId } });
  if (!wo) throw new Error("Werkopdracht niet gevonden");

  await prisma.werkopdracht.update({
    where: { id: werkopdrachtId },
    data: {
      medewerkerId: medewerkerId || null,
      datum: datumStr ? new Date(datumStr) : wo.datum,
      tijdsvenster: tijdsvenster || null,
      topdeskRef: topdeskRef || null,
      status: medewerkerId ? "TOEGEWEZEN" : wo.status,
    },
  });
  revalidatePath("/backoffice/planning");
  if (wo.dossierId) ververs(wo.dossierId);
}
