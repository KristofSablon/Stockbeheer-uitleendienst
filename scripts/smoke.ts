// Smoke-test van de kernlogica (los van de UI): beschikbaarheid, stockcheck en kostberekening.
import { prisma } from "../src/lib/prisma";
import { beschikbaarheid, stockcheck } from "../src/lib/beschikbaarheid";
import { berekenKosten } from "../src/lib/berekening";

async function main() {
  const biertafel = await prisma.materiaal.findFirst({ where: { naam: "Biertafel" } });
  const chalet = await prisma.materiaal.findFirst({ where: { naam: "Chalet" } });
  if (!biertafel || !chalet) throw new Error("Catalogus niet geseed?");

  const van = new Date(); van.setDate(van.getDate() + 40);
  const tot = new Date(van); tot.setDate(tot.getDate() + 2);

  const voor = await beschikbaarheid(biertafel.id, van, tot);
  console.log(`Biertafel beschikbaar (totaal ${voor.totaal}): ${voor.beschikbaar}, gereserveerd ${voor.gereserveerd}`);

  // Maak een tijdelijke reservatie en controleer dat beschikbaarheid daalt.
  const dossier = await prisma.dossier.findFirst();
  const res = await prisma.reservatie.create({
    data: { materiaalId: biertafel.id, dossierId: dossier!.id, van, tot, aantal: 10, status: "GERESERVEERD" },
  });
  const na = await beschikbaarheid(biertafel.id, van, tot);
  console.log(`Na reservatie van 10: beschikbaar ${na.beschikbaar} (verwacht ${voor.beschikbaar - 10})`);
  const okBeschikbaarheid = na.beschikbaar === voor.beschikbaar - 10;

  // Stockcheck: vraag meer dan beschikbaar → onvoldoende.
  const check = await stockcheck([{ materiaalId: biertafel.id, gevraagdAantal: na.beschikbaar + 5 }], van, tot);
  console.log(`Stockcheck te veel gevraagd → ok=${check.ok} (verwacht false)`);

  // Nadar-capaciteitslimiet.
  const nadar = await prisma.materiaal.findFirst({ where: { naam: "Nadar (dranghek)" } });
  const capCheck = await stockcheck([{ materiaalId: nadar!.id, gevraagdAantal: 80 }], van, tot);
  console.log(`Nadar 80m (limiet ${nadar!.capaciteitslimiet}) → ok=${capCheck.ok} (verwacht false), overschrijdt=${capCheck.regels[0]?.overschrijdtCapaciteit}`);

  // Kostberekening met levering + chalet (transportforfait + specifiek transport).
  const kost = await berekenKosten({
    leveringswijze: "LEVERING",
    regels: [
      { materiaalNaam: biertafel.naam, aantal: 20, huurtarief: biertafel.huurtarief, transporttarief: biertafel.transporttarief, transportVereist: true },
      { materiaalNaam: chalet.naam, aantal: 2, huurtarief: chalet.huurtarief, transporttarief: chalet.transporttarief, transportVereist: true },
    ],
    dagenTeLaat: 2,
  });
  console.log(`Kost: huur=${kost.huur} transport=${kost.transport} boete=${kost.boete} totaal=${kost.totaal}`);
  // Verwacht: huur = 20*2 + 2*25 = 90; transport = 50 (forfait) + 75 (chalet) = 125; boete = 2*25 = 50; totaal = 265
  const okKost = kost.huur === 90 && kost.transport === 125 && kost.boete === 50 && kost.totaal === 265;

  // Opruimen.
  await prisma.reservatie.delete({ where: { id: res.id } });

  console.log("\nResultaat:",
    okBeschikbaarheid && !check.ok && !capCheck.ok && okKost ? "✔ ALLE CHECKS GESLAAGD" : "✗ FOUT in checks");
  process.exit(okBeschikbaarheid && !check.ok && !capCheck.ok && okKost ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
