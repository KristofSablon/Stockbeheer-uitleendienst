/* Deel 2: toestand, schrijfwachtrij, rollen, berekeningen, navigatie en overzicht. */

const demoModus = /[?&]demo\b/.test(location.search) ||
  (!CONFIG.siteUrl && !/sharepoint\.com$/i.test(location.hostname) && !/\.aspx$/i.test(location.pathname));

const S = {
  api: demoModus ? DEMO : SP,
  info: null,               // resultaat van init(): modus, site, lijsten, waarschuwingen, fataal
  ik: { naam: "", email: "", rollen: [] },
  rollenIngesteld: false,   // staan er ROL:-regels in de instellingen?
  data: { UL_Materialen: [], UL_Dossiers: [], UL_Regels: [], UL_Instellingen: [] },
  tab: "overzicht", dossierId: null, filter: "te_behandelen", zoek: "",
  tempTeller: -1, laatsteBreedte: window.innerWidth,
};

/* ── Schrijfwachtrij ──────────────────────────────────────────────────── */
const WACHTRIJ_SLEUTEL = "uld_wachtrij_" + (demoModus ? "demo" : "sp");
const Q = {
  jobs: [], idMap: {}, omgekeerd: {}, bezig: false,
  laad() {
    try { const j = JSON.parse(localStorage.getItem(WACHTRIJ_SLEUTEL) || "null");
      if (j) { this.jobs = j.jobs || []; this.idMap = j.idMap || {}; } } catch (e) {}
  },
  bewaar() { try { localStorage.setItem(WACHTRIJ_SLEUTEL, JSON.stringify({ jobs: this.jobs, idMap: this.idMap })); } catch (e) {} },
  echtId(id) { return id < 0 ? (this.idMap[id] || id) : id; },
  domAlias(id) { return this.omgekeerd[id]; },
  duw(job) { this.jobs.push(job); this.bewaar(); toonSync(); this.verwerk(); },
  async verwerk() {
    if (this.bezig) return; this.bezig = true; toonSync();
    while (this.jobs.length) {
      const job = this.jobs[0];
      try {
        if (job.soort === "nieuw") {
          const body = Object.assign({}, job.body);
          for (const k of Object.keys(body)) if (typeof body[k] === "number" && body[k] < 0 && k.endsWith("Id")) body[k] = this.echtId(body[k]);
          const item = await S.api.nieuwe(job.lijst, body);
          this.idMap[job.tempId] = item.Id; this.omgekeerd[item.Id] = job.tempId;
          const lokaal = S.data[job.lijst].find((r) => r.Id === job.tempId);
          if (lokaal) lokaal.Id = item.Id;
          if (S.dossierId === job.tempId) S.dossierId = item.Id;
          for (const lijst of Object.keys(S.data)) for (const r of S.data[lijst])
            if (r.UL_DossierId === job.tempId) r.UL_DossierId = item.Id;
        } else if (job.soort === "wijzig") {
          await S.api.wijzig(job.lijst, this.echtId(job.id), job.body);
        } else if (job.soort === "weg") {
          await S.api.weg(job.lijst, this.echtId(job.id));
        }
        this.jobs.shift(); this.bewaar();
      } catch (e) {
        console.warn("Wachtrij wacht even:", e);
        break; // verbinding of rechten; later opnieuw proberen
      }
    }
    this.bezig = false; toonSync();
  },
};
setInterval(() => { if (Q.jobs.length) Q.verwerk(); }, 10e3);
window.addEventListener("online", () => Q.verwerk());

function toonSync() {
  const stip = document.getElementById("syncstip"), tekst = document.getElementById("synctekst");
  if (!stip) return;
  stip.className = "";
  if (!navigator.onLine && Q.jobs.length) { stip.className = "offline"; tekst.textContent = `offline, ${Q.jobs.length} te verzenden`; }
  else if (Q.jobs.length) { stip.className = "bezig"; tekst.textContent = `bezig met opslaan (${Q.jobs.length})`; }
  else tekst.textContent = "opgeslagen";
}

/* Gegevens lokaal toevoegen en in de wachtrij zetten. */
function bewaarNieuw(lijst, body) {
  const tempId = --S.tempTeller;
  const item = Object.assign({ Id: tempId }, body);
  S.data[lijst].push(item);
  Q.duw({ soort: "nieuw", lijst, tempId, body });
  return item;
}
function bewaarWijzig(lijst, id, body) {
  const rid = Q.echtId(id);
  const item = S.data[lijst].find((r) => r.Id === rid || r.Id === id);
  if (item) Object.assign(item, body);
  Q.duw({ soort: "wijzig", lijst, id: rid, body });
}
function bewaarWeg(lijst, id) {
  const rid = Q.echtId(id);
  S.data[lijst] = S.data[lijst].filter((r) => r.Id !== rid && r.Id !== id);
  Q.duw({ soort: "weg", lijst, id: rid });
}
// Zoekt een invoerveld op basis van het huidige Id of het tijdelijke Id waarmee het scherm gebouwd is.
function zoekVeld(attr, id) {
  const alias = Q.domAlias(id);
  return document.querySelector(`[data-${attr}="${id}"]`) || (alias ? document.querySelector(`[data-${attr}="${alias}"]`) : null);
}

/* ── Gegevens laden en verversen ──────────────────────────────────────── */
const SELECTS = {
  UL_Materialen: "Id,Title,UL_Categorie,UL_Totaal,UL_Huurtarief,UL_Transporttarief,UL_TransportVereist,UL_Capaciteitslimiet,UL_Eenheid,UL_Omschrijving,UL_Actief",
  UL_Dossiers: "Id,Title,UL_Status,UL_Aanvrager,UL_TypeAanvrager,UL_Contact,UL_Email,UL_Telefoon,UL_Evenement,UL_Locatie,UL_Leveringswijze,UL_Van,UL_Tot,UL_Opmerkingen,UL_WeigerReden,UL_Huur,UL_Transport,UL_Schade,UL_Boete,UL_Totaal,UL_Betaalstatus,UL_Vervaldag,UL_Log,UL_ClientId",
  UL_Regels: "Id,Title,UL_DossierId,UL_MateriaalId,UL_Gevraagd,UL_Toegekend,UL_Deelbedrag,UL_Retour,UL_RetourOpm,UL_SchadeKost,UL_ClientId",
  UL_Instellingen: "Id,Title,UL_Waarde,UL_Omschrijving",
};
async function laadAlles() {
  for (const lijst of Object.keys(SELECTS)) S.data[lijst] = await S.api.lees(lijst, SELECTS[lijst]);
}
setInterval(async () => {
  if (document.hidden || Q.jobs.length || !S.info || S.info.fataal) return;
  try { await laadAlles(); render(); } catch (e) { /* stil; volgende keer opnieuw */ }
}, 60e3);

/* ── Rollen ───────────────────────────────────────────────────────────── */
function bepaalRollen() {
  const regels = S.data.UL_Instellingen.filter((r) => (r.Title || "").startsWith("ROL:"));
  S.rollenIngesteld = regels.length > 0;
  if (!S.rollenIngesteld) { S.ik.rollen = Object.keys(ROL_LABELS); return; }
  const mijn = regels.find((r) => r.Title.slice(4).toLowerCase().trim() === S.ik.email);
  S.ik.rollen = mijn ? String(mijn.UL_Waarde || "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => ROL_LABELS[s]) : ["BELEID"];
}
const magIk = (...rollen) => rollen.some((r) => S.ik.rollen.includes(r));
const magBehandelen = () => magIk("ADMIN", "BEHEERDER");

/* ── Instellingen en berekeningen ─────────────────────────────────────── */
function instelling(sleutel) {
  const r = S.data.UL_Instellingen.find((x) => x.Title === sleutel);
  if (r) return r.UL_Waarde;
  const std = STANDAARD_INSTELLINGEN.find((x) => x[0] === sleutel);
  return std ? std[1] : "";
}
const instGetal = (s) => Number(instelling(s)) || 0;

function materiaal(id) { return S.data.UL_Materialen.find((m) => m.Id === id); }
function regelsVan(dossierId) { return S.data.UL_Regels.filter((r) => r.UL_DossierId === dossierId); }

function bezetInPeriode(materiaalId, van, tot, negeerDossierId) {
  let som = 0;
  for (const d of S.data.UL_Dossiers) {
    if (d.Id === negeerDossierId || !BEZET_STATUS.includes(d.UL_Status)) continue;
    if (!d.UL_Van || !d.UL_Tot || !overlapt(d.UL_Van, d.UL_Tot, van, tot)) continue;
    for (const r of regelsVan(d.Id)) if (r.UL_MateriaalId === materiaalId) som += r.UL_Toegekend || r.UL_Gevraagd || 0;
  }
  return som;
}
function beschikbaar(mat, van, tot, negeerDossierId) {
  return Math.max(0, (mat.UL_Totaal || 0) - bezetInPeriode(mat.Id, van, tot, negeerDossierId));
}
function stockcheck(dossier) {
  return regelsVan(dossier.Id).map((r) => {
    const mat = materiaal(r.UL_MateriaalId) || { Title: r.Title, UL_Totaal: 0 };
    const vrij = beschikbaar(mat, dossier.UL_Van, dossier.UL_Tot, dossier.Id);
    const limiet = mat.UL_Capaciteitslimiet || null;
    const bovenLimiet = limiet != null && r.UL_Gevraagd > limiet;
    return { regel: r, mat, vrij, limiet, bovenLimiet, voldoende: r.UL_Gevraagd <= vrij && !bovenLimiet };
  });
}
function berekenKosten(dossier) {
  const regels = regelsVan(dossier.Id);
  let huur = 0, transport = 0, transportNodig = false;
  for (const r of regels) {
    const mat = materiaal(r.UL_MateriaalId); if (!mat) continue;
    const aantal = r.UL_Toegekend || r.UL_Gevraagd || 0;
    huur += aantal * (mat.UL_Huurtarief || 0);
    if (mat.UL_TransportVereist || (mat.UL_Transporttarief || 0) > 0) transportNodig = true;
  }
  if (dossier.UL_Leveringswijze === "Levering") {
    if (transportNodig) transport += instGetal("TRANSPORTFORFAIT");
    for (const r of regels) {
      const mat = materiaal(r.UL_MateriaalId);
      if (mat && (mat.UL_Transporttarief || 0) > 0) transport += mat.UL_Transporttarief;
    }
  }
  return { huur: rond2(huur), transport: rond2(transport),
    totaal: rond2(huur + transport + (dossier.UL_Schade || 0) + (dossier.UL_Boete || 0)) };
}
function refNieuw() {
  const jaar = new Date().getFullYear(); const pre = `UL-${jaar}-`;
  let hoogste = 0;
  for (const d of S.data.UL_Dossiers) if ((d.Title || "").startsWith(pre)) hoogste = Math.max(hoogste, parseInt(d.Title.slice(pre.length), 10) || 0);
  return pre + String(hoogste + 1).padStart(4, "0");
}
function logRegel(dossier, tekst) {
  const nu = new Date();
  const stempel = `${dDatum(nu)} ${String(nu.getHours()).padStart(2, "0")}:${String(nu.getMinutes()).padStart(2, "0")}`;
  dossier.UL_Log = (dossier.UL_Log ? dossier.UL_Log + "\n" : "") + `${stempel} ${tekst} (${S.ik.naam || "app"})`;
}
function zetStatus(dossier, naar, logTekst) {
  if (!(OVERGANGEN[dossier.UL_Status] || []).includes(naar)) return false;
  dossier.UL_Status = naar;
  logRegel(dossier, logTekst || `Status naar ${STATUS_LABELS[naar]}`);
  bewaarWijzig("UL_Dossiers", dossier.Id, { UL_Status: naar, UL_Log: dossier.UL_Log });
  return true;
}

/* ── Navigatie en weergave ────────────────────────────────────────────── */
const TABS = [
  ["overzicht", "Aanvragen", () => true],
  ["nieuw", "Nieuwe aanvraag", () => magBehandelen()],
  ["beschikbaar", "Beschikbaarheid", () => true],
  ["catalogus", "Catalogus", () => magIk("ADMIN", "BEHEERDER", "MAGAZIJNIER")],
  ["beheer", "Beheer", () => magIk("BEHEERDER")],
  ["opslag", "Opslag en installatie", () => true],
];
function ga(tab, dossierId) {
  S.tab = tab; if (dossierId !== undefined) S.dossierId = dossierId;
  render();
  window.scrollTo(0, 0);
}
function tekenTabs() {
  const teBehandelen = S.data.UL_Dossiers.filter((d) => TE_BEHANDELEN.includes(d.UL_Status)).length;
  document.getElementById("tabs").innerHTML = TABS.filter(([, , zicht]) => zicht()).map(([id, naam]) =>
    `<button data-tab="${id}" class="${S.tab === id || (id === "overzicht" && S.tab === "dossier") ? "actief" : ""}">
      ${naam}${id === "overzicht" && teBehandelen ? `<span class="tel">${teBehandelen}</span>` : ""}</button>`).join("");
}
function render() {
  tekenTabs();
  const app = document.getElementById("app");
  if (S.info && S.info.fataal) { app.innerHTML = schermInstallatieNodig(); return; }
  const schermen = { overzicht: schermOverzicht, dossier: schermDossier, nieuw: schermNieuw,
    beschikbaar: schermBeschikbaar, catalogus: schermCatalogus, beheer: schermBeheer, opslag: schermOpslag };
  app.innerHTML = (schermen[S.tab] || schermOverzicht)();
  naRender();
}

/* ── Scherm: overzicht ────────────────────────────────────────────────── */
const FILTERS = {
  te_behandelen: ["Te behandelen", TE_BEHANDELEN],
  nieuw: ["Nieuw ingediend", ["INGEDIEND"]],
  uitvoering: ["In uitvoering", ["BETAALD", "KLAARGEZET", "UITGELEVERD"]],
  retour: ["Retour en controle", ["UITGELEVERD", "GERETOURNEERD", "IN_CONTROLE", "SCHADE_VASTGESTELD"]],
  alle: ["Alle", null],
};
function schermOverzicht() {
  const tel = (statussen) => S.data.UL_Dossiers.filter((d) => !statussen || statussen.includes(d.UL_Status)).length;
  let dossiers = S.data.UL_Dossiers.filter((d) => {
    const f = FILTERS[S.filter][1];
    if (f && !f.includes(d.UL_Status)) return false;
    if (S.zoek) {
      const z = S.zoek.toLowerCase();
      return [d.Title, d.UL_Aanvrager, d.UL_Evenement].some((v) => (v || "").toLowerCase().includes(z));
    }
    return true;
  }).sort((a, b) => (b.Id || 0) - (a.Id || 0));

  return `
  <div class="tellers">${Object.entries(FILTERS).map(([id, [naam, st]]) =>
    `<div class="teller" data-filter="${id}"><b>${tel(st)}</b><span>${naam}</span></div>`).join("")}
  </div>
  <div class="kaart">
    <div class="rij">
      <div class="veld" style="flex:1"><label>Zoeken</label>
        <input id="zoekveld" value="${esc(S.zoek)}" placeholder="Referentie, vereniging of evenement"></div>
      <span class="badge b-geel" style="align-self:center">${esc(FILTERS[S.filter][0])}</span>
    </div>
  </div>
  <div class="tabelwrap"><table>
    <thead><tr><th>Referentie</th><th>Aanvrager</th><th>Evenement</th><th>Periode</th><th>Status</th><th></th></tr></thead>
    <tbody>${dossiers.length ? dossiers.map((d) => `
      <tr class="klik" data-dossier="${d.Id}">
        <td style="font-family:ui-monospace,Consolas,monospace;font-weight:600">${esc(d.Title)}</td>
        <td>${esc(d.UL_Aanvrager)}</td><td>${esc(d.UL_Evenement)}</td>
        <td style="white-space:nowrap">${dDatum(d.UL_Van)} tot ${dDatum(d.UL_Tot)}</td>
        <td>${statusBadge(d.UL_Status)}</td>
        <td><button class="knop klein ${TE_BEHANDELEN.includes(d.UL_Status) && magBehandelen() ? "" : "stil"}" data-dossier="${d.Id}">
          ${TE_BEHANDELEN.includes(d.UL_Status) && magBehandelen() ? "Behandelen" : "Openen"}</button></td>
      </tr>`).join("") :
      `<tr><td colspan="6" class="stil-tekst" style="text-align:center;padding:24px">Geen aanvragen in deze selectie.</td></tr>`}
    </tbody>
  </table></div>`;
}
