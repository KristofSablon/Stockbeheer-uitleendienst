import { chromium } from "playwright-core";
import { maakMock, PAGINA } from "./mock.mjs";

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
let geslaagd = 0, gefaald = 0;
const ok = (naam, cond, extra) => { console.log((cond ? "✔" : "✗") + " " + naam + (cond ? "" : "  " + (extra || ""))); cond ? geslaagd++ : gefaald++; };
const wachtTot = async (fn, ms = 8000) => { const tot = Date.now() + ms; while (Date.now() < tot) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--no-proxy-server"] });

async function nieuwePagina(mock, extra = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, extra));
  const page = await ctx.newPage();
  await page.route("**/*", mock.afhandelaar);
  return { ctx, page };
}

/* ── A. Lege site, beheerder: installatie en volledige workflow ───────── */
console.log("\n— A. Lege site met beheerrechten —");
const mockA = maakMock();
const { ctx: ctxA, page: pA } = await nieuwePagina(mockA);
await pA.goto(PAGINA, { waitUntil: "networkidle" });
await wachtTot(async () => Object.keys(mockA.lijsten).length === 4);
ok("4 lijsten aangemaakt", Object.keys(mockA.lijsten).length === 4, JSON.stringify(Object.keys(mockA.lijsten)));
ok("42 kolommen aangemaakt", mockA.tellers.veldAanmaak === 42, "was " + mockA.tellers.veldAanmaak);
const veldenSnapshot = {};
for (const [naam, l] of Object.entries(mockA.lijsten)) veldenSnapshot[naam] = [...l.velden];
ok("kop toont gebruiker", (await pA.textContent("#wie")).includes("Els Peeters"));

// Catalogus vullen met de startcatalogus
await pA.click('nav button[data-tab="catalogus"]');
await pA.click('[data-actie="mat-seed"]');
await wachtTot(async () => mockA.lijsten.UL_Materialen.items.length === 22, 15000);
ok("startcatalogus geplaatst (22 materialen)", mockA.lijsten.UL_Materialen.items.length === 22,
  "was " + mockA.lijsten.UL_Materialen.items.length);

// Nieuwe aanvraag indienen
await pA.click('nav button[data-tab="nieuw"]');
await pA.fill("#nv_aanvrager", "Chiro Sint-Jozef");
await pA.fill("#nv_contact", "Jonas Willems");
await pA.fill("#nv_email", "jonas@voorbeeld.be");
await pA.fill("#nv_evenement", "Chirofuif");
const biertafel = mockA.lijsten.UL_Materialen.items.find((m) => m.Title === "Biertafel");
await pA.fill(`input[data-mat="${biertafel.Id}"]`, "20");
await pA.click('[data-actie="aanvraag-indienen"]');
await wachtTot(async () => mockA.lijsten.UL_Dossiers.items.length === 1 && mockA.lijsten.UL_Regels.items.length === 1);
const dosA = mockA.lijsten.UL_Dossiers.items[0];
ok("dossier aangemaakt met referentie en status", /^UL-\d{4}-0001$/.test(dosA.Title) && dosA.UL_Status === "INGEDIEND",
  JSON.stringify({ Title: dosA.Title, status: dosA.UL_Status }));
const regelA = mockA.lijsten.UL_Regels.items[0];
ok("regel klopt (Biertafel, 20 gevraagd)", regelA.Title === "Biertafel" && regelA.UL_Gevraagd === 20);

// Behandelen tot en met betaling
await pA.click('[data-actie="status"][data-naar="IN_BEHANDELING"]');
await pA.waitForSelector('[data-actie="goedkeuren"]');
ok("voorraadcontrole zichtbaar met 'voldoende'", (await pA.textContent("#app")).includes("voldoende"));
await pA.click('[data-actie="goedkeuren"]');
await wachtTot(async () => dosA.UL_Status === "GOEDGEKEURD" && mockA.lijsten.UL_Regels.items[0].UL_Toegekend === 20);
ok("goedgekeurd, toegekend 20, deelbedrag 40", dosA.UL_Status === "GOEDGEKEURD" && regelA.UL_Deelbedrag === 40,
  JSON.stringify({ st: dosA.UL_Status, toe: regelA.UL_Toegekend, deel: regelA.UL_Deelbedrag }));
await pA.click('[data-actie="bevestigen"]');
await wachtTot(async () => dosA.UL_Status === "BEVESTIGD");
ok("bevestigd met huur 40 + transport 50 = 90", dosA.UL_Huur === 40 && dosA.UL_Transport === 50 && dosA.UL_Totaal === 90,
  JSON.stringify({ huur: dosA.UL_Huur, tr: dosA.UL_Transport, tot: dosA.UL_Totaal }));
await pA.click('[data-actie="betaald"]');
await wachtTot(async () => dosA.UL_Status === "BETAALD" && dosA.UL_Betaalstatus === "Betaald");
ok("betaling geregistreerd", dosA.UL_Status === "BETAALD" && dosA.UL_Betaalstatus === "Betaald");

// Rollen: toevoegen en weer verwijderen (test van schrijven en verwijderen)
await pA.click('nav button[data-tab="beheer"]');
await pA.click('[data-actie="rol-nieuw"]');
await pA.fill("#rf_email", "els.peeters@londerzeel.be");
await pA.check('[data-rfrol="ADMIN"]'); await pA.check('[data-rfrol="BEHEERDER"]');
await pA.click('[data-actie="rol-bewaar"]');
await wachtTot(async () => mockA.lijsten.UL_Instellingen.items.some((r) => r.Title === "ROL:els.peeters@londerzeel.be"));
await pA.click('[data-actie="rol-nieuw"]');
await pA.fill("#rf_email", "test@londerzeel.be");
await pA.check('[data-rfrol="BELEID"]');
await pA.click('[data-actie="rol-bewaar"]');
await wachtTot(async () => mockA.lijsten.UL_Instellingen.items.some((r) => r.Title === "ROL:test@londerzeel.be"));
const knopWeg = pA.locator('tr:has-text("test@londerzeel.be") [data-actie="rol-weg"]');
await knopWeg.click();
const wegGelukt = await wachtTot(async () => !mockA.lijsten.UL_Instellingen.items.some((r) => r.Title === "ROL:test@londerzeel.be"));
ok("rol toegevoegd en verwijderd (DELETE werkt)", wegGelukt && mockA.tellers.del >= 1);

/* ── B. Tweede keer laden: niets dubbel aanmaken ──────────────────────── */
console.log("\n— B. Tweede keer laden —");
const lijstenVoor = mockA.tellers.lijstAanmaak, veldenVoor = mockA.tellers.veldAanmaak;
const pB = await ctxA.newPage();
await pB.route("**/*", mockA.afhandelaar);
await pB.goto(PAGINA, { waitUntil: "networkidle" });
await pB.waitForSelector("nav button");
await new Promise((r) => setTimeout(r, 1200));
await pB.click('.teller[data-filter="alle"]');
ok("geen nieuwe lijsten of kolommen bij herladen",
  mockA.tellers.lijstAanmaak === lijstenVoor && mockA.tellers.veldAanmaak === veldenVoor,
  JSON.stringify({ lijsten: mockA.tellers.lijstAanmaak - lijstenVoor, velden: mockA.tellers.veldAanmaak - veldenVoor }));
ok("dossier zichtbaar in overzicht na herladen", (await pB.textContent("#app")).includes("Chiro Sint-Jozef"));
await ctxA.close();

/* ── C. Gewoon lid: lijsten bestaan, een kolom ontbreekt ──────────────── */
console.log("\n— C. Zonder beheerrechten, kolom UL_Boete ontbreekt —");
const mockC = maakMock({ magAanmaken: false, gebruiker: { Title: "Nadia De Smet", Email: "nadia@londerzeel.be" } });
for (const [naam, velden] of Object.entries(veldenSnapshot))
  mockC.maakLijst(naam, velden.filter((v) => v !== "UL_Boete" && v !== "Id" && v !== "Title"));
const matC = mockC.lijsten.UL_Materialen;
matC.items.push({ Id: ++matC.teller, Title: "Biertafel", UL_Categorie: "Organisatorisch", UL_Totaal: 60,
  UL_Huurtarief: 2, UL_Transporttarief: 0, UL_TransportVereist: 1, UL_Eenheid: "stuk", UL_Actief: 1 });
const { ctx: ctxC, page: pC } = await nieuwePagina(mockC);
await pC.goto(PAGINA, { waitUntil: "networkidle" });
await pC.waitForSelector('nav button[data-tab="nieuw"]');
await pC.click('nav button[data-tab="nieuw"]');
await pC.fill("#nv_aanvrager", "KFC Londerzeel");
await pC.fill("#nv_contact", "An Peeters");
await pC.fill("#nv_evenement", "Tornooi");
await pC.selectOption("#nv_wijze", "Afhaling");
// zonder aantallen indienen hoort te blokkeren
await pC.click('[data-actie="aanvraag-indienen"]');
ok("indienen zonder materiaal wordt tegengehouden", (await pC.textContent("#nv_melding")).includes("materiaal"));
const idC = matC.items[0].Id;
await pC.fill(`input[data-mat="${idC}"]`, "5");
await pC.click('[data-actie="aanvraag-indienen"]');
const dossierGeplaatst = await wachtTot(async () => mockC.lijsten.UL_Dossiers.items.length === 1);
ok("dossier geplaatst ondanks ontbrekende kolom (payload gezeefd)", dossierGeplaatst,
  "items: " + mockC.lijsten.UL_Dossiers.items.length);
ok("app meldt de ontbrekende kolom als waarschuwing, niet als fout",
  mockC.waarschuwingenGetoond !== false && (await (async () => {
    await pC.click('nav button[data-tab="opslag"]');
    return (await pC.textContent("#app")).includes("UL_Boete");
  })()));
await ctxC.close();

/* ── D. Gewoon lid op een lege site: nette uitleg ─────────────────────── */
console.log("\n— D. Zonder beheerrechten op een lege site —");
const mockD = maakMock({ magAanmaken: false, gebruiker: { Title: "Tom Claes", Email: "tom@londerzeel.be" } });
const { ctx: ctxD, page: pD } = await nieuwePagina(mockD);
await pD.goto(PAGINA, { waitUntil: "networkidle" });
await pD.waitForSelector('[data-actie="kopieer-bericht"]');
const tekstD = await pD.textContent("#app");
ok("uitleg voor de beheerder in plaats van een technische fout",
  tekstD.includes("sitebeheerder") && tekstD.includes("hoeft hier niets"));
await pD.click('[data-actie="kopieer-bericht"]');
ok("kopieerknop geeft bevestiging", await wachtTot(async () => (await pD.textContent("#app")).includes("klembord")));
await ctxD.close();

/* ── E. Demo: volledige workflow, Excel en schermformaten ─────────────── */
console.log("\n— E. Demo-modus: workflow, Excel, tablet en telefoon —");
const mockE = maakMock(); // alleen om de pagina te serveren; ?demo negeert SharePoint
const ctxE = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const pE = await ctxE.newPage();
await pE.route("**/*", mockE.afhandelaar);
await pE.goto(PAGINA + "?demo", { waitUntil: "networkidle" });
const tekstE = await pE.textContent("#app");
ok("demo start met voorbeelddossiers", tekstE.includes("Chiro Sint-Jozef") && tekstE.includes("KFC Londerzeel"));
ok("geen SharePoint-aanroepen in demo-modus", mockE.tellers.lijstAanmaak === 0 && mockE.tellers.itemPost === 0);

// Volledige doorloop van het eerste demodossier
await pE.click('tr:has-text("Chirofuif")');
const stap = async (actie, naar) => {
  await pE.click(`[data-actie="${actie}"]${naar ? `[data-naar="${naar}"]` : ""}`);
  await new Promise((r) => setTimeout(r, 250));
};
await stap("status", "IN_BEHANDELING");
await stap("goedkeuren");
await stap("bevestigen");
await stap("betaald");
await stap("status", "KLAARGEZET");
await stap("status", "UITGELEVERD");
await stap("status", "GERETOURNEERD");
await stap("status", "IN_CONTROLE");
await pE.waitForSelector('[data-actie="retour-afronden"]');
const eersteRegel = await pE.getAttribute("[data-rcstaat]", "data-rcstaat");
await pE.selectOption(`[data-rcstaat="${eersteRegel}"]`, "SCHADE");
await pE.fill(`[data-rcopm="${eersteRegel}"]`, "Blad gebarsten");
await pE.fill(`[data-rckost="${eersteRegel}"]`, "40");
await stap("retour-afronden");
let inhoudE = await pE.textContent("#app");
ok("retour met schade leidt tot Schade vastgesteld en 40 euro", inhoudE.includes("Schade vastgesteld") && /40,00/.test(inhoudE));
await stap("status", "AFGESLOTEN");
inhoudE = await pE.textContent("#app");
ok("dossier afgesloten", inhoudE.includes("Afgesloten"));

// Excel-export
await pE.click('nav button[data-tab="catalogus"]');
const download = pE.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await pE.click('[data-actie="excel-stock"]');
const dl = await download;
ok("stocklijst-export geeft een Excel-bestand", !!dl && (await dl.suggestedFilename()).endsWith(".xlsx"),
  dl ? await dl.suggestedFilename() : "geen download");

// Demo blijft bewaard na herladen
await pE.reload({ waitUntil: "networkidle" });
await pE.click('.teller[data-filter="alle"]');
ok("demogegevens blijven staan na herladen", (await pE.textContent("#app")).includes("Afgesloten"));

// Schermafdrukken op drie formaten
await pE.click('nav button[data-tab="overzicht"]');
await pE.screenshot({ path: "schermen/pc-overzicht.png", fullPage: true });
await pE.click("tr[data-dossier] >> nth=1");
await pE.screenshot({ path: "schermen/pc-dossier.png", fullPage: true });
await ctxE.close();

for (const [naam, formaat] of [["tablet", { width: 810, height: 1080 }], ["telefoon", { width: 390, height: 844 }]]) {
  const ctxM = await browser.newContext({ viewport: formaat, hasTouch: true, isMobile: naam === "telefoon" });
  const pM = await ctxM.newPage();
  await pM.route("**/*", mockE.afhandelaar);
  await pM.goto(PAGINA + "?demo", { waitUntil: "networkidle" });
  await pM.screenshot({ path: `schermen/${naam}-overzicht.png`, fullPage: false });
  await pM.tap("tr[data-dossier] >> nth=0");
  await new Promise((r) => setTimeout(r, 300));
  await pM.screenshot({ path: `schermen/${naam}-dossier.png`, fullPage: false });
  await ctxM.close();
}
ok("schermafdrukken gemaakt", true);

await browser.close();
console.log(`\nResultaat: ${geslaagd} geslaagd, ${gefaald} gefaald`);
process.exit(gefaald ? 1 : 0);
