import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashWachtwoord(wachtwoord: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(wachtwoord, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const STANDAARD_CONFIG: Record<string, { waarde: string; type: string; categorie: string; omschrijving: string }> = {
  AANVRAAG_MIN_WEKEN: { waarde: "4", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Minimale aanvraagtermijn vooraf (weken)" },
  AANVRAAG_MAX_MAANDEN: { waarde: "12", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Maximale aanvraagtermijn vooraf (maanden)" },
  BEHANDELTERMIJN_WERKDAGEN: { waarde: "7", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Behandeltermijn (werkdagen)" },
  UITLEENTERMIJN_DAGEN: { waarde: "7", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Maximale uitleentermijn (kalenderdagen)" },
  BETALING_DAGEN_VOOR_LEVERING: { waarde: "7", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Betaling uiterlijk X dagen voor levering" },
  TRANSPORTFORFAIT: { waarde: "50", type: "TARIEF", categorie: "TARIEVEN", omschrijving: "Transportforfait heen en terug (€)" },
  BOETE_PER_DAG: { waarde: "25", type: "TARIEF", categorie: "TARIEVEN", omschrijving: "Boete per overschreden dag (€)" },
  EIGEN_HERSTEL_PER_UUR: { waarde: "50", type: "TARIEF", categorie: "TARIEVEN", omschrijving: "Eigen herstel per begonnen uur (€)" },
  NADAR_MAX_METER: { waarde: "60", type: "GETAL", categorie: "TARIEVEN", omschrijving: "Maximum nadar per aanvrager (meter)" },
  DIENST_NAAM: { waarde: "Uitleendienst — Dienst Openbaar Domein", type: "TEKST", categorie: "ALGEMEEN", omschrijving: "Naam van de dienst" },
  DIENST_ADRES: { waarde: "Malderendorp 14, 1840 Londerzeel", type: "TEKST", categorie: "ALGEMEEN", omschrijving: "Contactadres" },
  DIENST_EMAIL: { waarde: "uitleendienst@londerzeel.be", type: "TEKST", categorie: "ALGEMEEN", omschrijving: "Contact-e-mailadres" },
};

// Materiaalcatalogus afgeleid uit de inventaris (sectie 5) en het retributiereglement (sectie 9).
type MatSeed = {
  naam: string;
  categorie: string;
  totaalAantal: number;
  huurtarief?: number;
  transporttarief?: number;
  transportVereist?: boolean;
  capaciteitslimiet?: number;
  eenheid?: string;
  omschrijving?: string;
};

const CATALOGUS: MatSeed[] = [
  // Podium
  { naam: "Podiumelement 1x2 m", categorie: "PODIUM", totaalAantal: 40, huurtarief: 5, transportVereist: true, eenheid: "stuk" },
  { naam: "Podiumwagen", categorie: "PODIUM", totaalAantal: 1, huurtarief: 50, transportVereist: true, omschrijving: "€ 50 per uitleenbeurt + € 50 per extra dag" },
  { naam: "Podiumtrap", categorie: "PODIUM", totaalAantal: 4, huurtarief: 5, transportVereist: true, eenheid: "stuk" },
  // Organisatorisch
  { naam: "Nadar (dranghek)", categorie: "ORGANISATORISCH", totaalAantal: 200, huurtarief: 0, transportVereist: true, capaciteitslimiet: 60, eenheid: "meter", omschrijving: "Max. 60 m per aanvrager; politietoelating op openbare weg" },
  { naam: "Biertafel", categorie: "ORGANISATORISCH", totaalAantal: 60, huurtarief: 2, transportVereist: true, eenheid: "stuk" },
  { naam: "Statafel", categorie: "ORGANISATORISCH", totaalAantal: 30, huurtarief: 2, transportVereist: true, eenheid: "stuk" },
  { naam: "Plooistoel", categorie: "ORGANISATORISCH", totaalAantal: 300, huurtarief: 0.5, transportVereist: true, eenheid: "stuk" },
  { naam: "Kassatent", categorie: "ORGANISATORISCH", totaalAantal: 4, huurtarief: 10, transportVereist: true, eenheid: "stuk" },
  { naam: "Vlaggenmast", categorie: "ORGANISATORISCH", totaalAantal: 12, huurtarief: 2, transportVereist: true, eenheid: "stuk" },
  { naam: "Chalet", categorie: "ORGANISATORISCH", totaalAantal: 6, huurtarief: 25, transporttarief: 75, transportVereist: true, eenheid: "stuk", omschrijving: "Huur € 25 + transport € 75" },
  { naam: "Stroomgroep / aggregaat", categorie: "ORGANISATORISCH", totaalAantal: 2, huurtarief: 150, transportVereist: true, eenheid: "stuk", omschrijving: "Huur € 150; kan bij overmacht worden teruggeroepen" },
  { naam: "Fuifpakket", categorie: "ORGANISATORISCH", totaalAantal: 3, huurtarief: 25, transportVereist: true, eenheid: "pakket" },
  { naam: "Geluidsmeter", categorie: "ORGANISATORISCH", totaalAantal: 3, huurtarief: 10, transportVereist: false, eenheid: "stuk" },
  { naam: "Tribune-element", categorie: "ORGANISATORISCH", totaalAantal: 4, huurtarief: 40, transportVereist: true, eenheid: "stuk" },
  // Sport & spel
  { naam: "Speer", categorie: "SPORT_SPEL", totaalAantal: 6, huurtarief: 2, transportVereist: false, eenheid: "stuk" },
  { naam: "Hoogspringset", categorie: "SPORT_SPEL", totaalAantal: 1, huurtarief: 15, transportVereist: true, eenheid: "set" },
  { naam: "Sjoelbak", categorie: "SPORT_SPEL", totaalAantal: 4, huurtarief: 5, transportVereist: false, eenheid: "stuk" },
  // Audiovisueel
  { naam: "Projectiescherm", categorie: "AUDIOVISUEEL", totaalAantal: 2, huurtarief: 15, transportVereist: true, eenheid: "stuk" },
  { naam: "Projector (beamer)", categorie: "AUDIOVISUEEL", totaalAantal: 2, huurtarief: 20, transportVereist: false, eenheid: "stuk" },
  // Geluid
  { naam: "Microfoon", categorie: "GELUID", totaalAantal: 8, huurtarief: 5, transportVereist: false, eenheid: "stuk" },
  { naam: "Monitor (geluid)", categorie: "GELUID", totaalAantal: 4, huurtarief: 10, transportVereist: true, eenheid: "stuk" },
  // Tentoonstelling
  { naam: "Tentoonstellingspaneel", categorie: "TENTOONSTELLING", totaalAantal: 30, huurtarief: 3, transportVereist: true, eenheid: "stuk" },
];

// Gebruikers per rol. Standaardwachtwoord: "londerzeel" (demo).
const GEBRUIKERS: { naam: string; email: string; rollen: string }[] = [
  { naam: "Els Peeters (Admin OD)", email: "admin@londerzeel.be", rollen: "ADMIN,BEHEERDER" },
  { naam: "Tom Verhaeghe (Ploegbaas)", email: "ploegbaas@londerzeel.be", rollen: "PLOEGBAAS" },
  { naam: "Karim Janssens (Technisch)", email: "technisch@londerzeel.be", rollen: "TECHNISCH" },
  { naam: "Nadia De Smet (Magazijnier)", email: "magazijn@londerzeel.be", rollen: "MAGAZIJNIER" },
  { naam: "Beheerder Uitleendienst", email: "beheerder@londerzeel.be", rollen: "BEHEERDER" },
  { naam: "Beleidsmedewerker", email: "beleid@londerzeel.be", rollen: "BELEID" },
];

async function main() {
  console.log("→ Configuratie seeden…");
  for (const [sleutel, cfg] of Object.entries(STANDAARD_CONFIG)) {
    await prisma.configuratie.upsert({
      where: { sleutel },
      update: {},
      create: { sleutel, ...cfg },
    });
  }

  console.log("→ Gebruikers seeden…");
  const wachtwoordHash = hashWachtwoord("londerzeel");
  for (const g of GEBRUIKERS) {
    await prisma.gebruiker.upsert({
      where: { email: g.email },
      update: { naam: g.naam, rollen: g.rollen },
      create: { naam: g.naam, email: g.email, rollen: g.rollen, wachtwoordHash },
    });
  }

  console.log("→ Materiaalcatalogus seeden…");
  for (const m of CATALOGUS) {
    const bestaat = await prisma.materiaal.findFirst({ where: { naam: m.naam } });
    if (bestaat) continue;
    await prisma.materiaal.create({
      data: {
        naam: m.naam,
        categorie: m.categorie,
        totaalAantal: m.totaalAantal,
        huurtarief: m.huurtarief ?? 0,
        transporttarief: m.transporttarief ?? 0,
        transportVereist: m.transportVereist ?? false,
        capaciteitslimiet: m.capaciteitslimiet ?? null,
        eenheid: m.eenheid ?? "stuk",
        omschrijving: m.omschrijving ?? null,
      },
    });
  }

  // Voorbeelddossier ter demonstratie (enkel als er nog geen dossiers zijn).
  const aantalDossiers = await prisma.dossier.count();
  if (aantalDossiers === 0) {
    console.log("→ Voorbeelddossier aanmaken…");
    const aanvrager = await prisma.aanvrager.create({
      data: {
        naam: "Chiro Sint-Jozef Londerzeel",
        type: "VERENIGING",
        erkenningsstatus: "ERKEND",
        adres: "Kerkstraat 5, 1840 Londerzeel",
        telefoon: "052 30 00 00",
        email: "chiro@voorbeeld.be",
        contactpersonen: {
          create: { naam: "Jonas Willems", telefoon: "0470 12 34 56", email: "jonas@voorbeeld.be", functie: "Groepsleiding" },
        },
      },
      include: { contactpersonen: true },
    });

    const biertafel = await prisma.materiaal.findFirst({ where: { naam: "Biertafel" } });
    const plooistoel = await prisma.materiaal.findFirst({ where: { naam: "Plooistoel" } });
    const nadar = await prisma.materiaal.findFirst({ where: { naam: "Nadar (dranghek)" } });

    const van = new Date();
    van.setDate(van.getDate() + 40);
    const tot = new Date(van);
    tot.setDate(tot.getDate() + 2);

    const dossier = await prisma.dossier.create({
      data: {
        referentienummer: `UL-${new Date().getFullYear()}-0001`,
        status: "INGEDIEND",
        leveringswijze: "LEVERING",
        uitleenVan: van,
        uitleenTot: tot,
        aanvragerId: aanvrager.id,
        contactpersoonId: aanvrager.contactpersonen[0]?.id,
        opmerkingen: "Jaarlijkse fuif in de parochiezaal.",
        evenement: {
          create: { naam: "Chirofuif", locatie: "Parochiezaal Londerzeel", datum: van, aardActiviteit: "Fuif" },
        },
        regels: {
          create: [
            biertafel ? { materiaalId: biertafel.id, gevraagdAantal: 20 } : undefined,
            plooistoel ? { materiaalId: plooistoel.id, gevraagdAantal: 100 } : undefined,
            nadar ? { materiaalId: nadar.id, gevraagdAantal: 40 } : undefined,
          ].filter(Boolean) as { materiaalId: string; gevraagdAantal: number }[],
        },
        statusHistoriek: {
          create: { naarStatus: "INGEDIEND", opmerking: "Aanvraag via e-formulier" },
        },
      },
    });
    console.log(`   Voorbeelddossier ${dossier.referentienummer} aangemaakt.`);
  }

  console.log("✔ Seed voltooid.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
