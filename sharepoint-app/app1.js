/* Uitleendienst Londerzeel, deel 1: vaste gegevens, hulpjes en opslag-adapters. */
"use strict";

const CONFIG = {
  siteUrl: "",            // leeg = zelf de site zoeken vanaf het pad van de pagina
  prefix: "UL_",
  appVersie: "1.0",
};

/* ── Statusmodel (uit de functionele analyse) ─────────────────────────── */
const STATUS_LABELS = {
  INGEDIEND: "Ingediend", IN_BEHANDELING: "In behandeling", WACHT_OP_AANVULLING: "Wacht op aanvulling",
  GOEDGEKEURD: "Goedgekeurd", GEWEIGERD: "Geweigerd", BEVESTIGD: "Bevestigd, wacht op betaling",
  BETAALD: "Betaald, klaar voor uitvoering", KLAARGEZET: "Klaargezet", UITGELEVERD: "Uitgeleverd",
  GERETOURNEERD: "Geretourneerd", IN_CONTROLE: "In controle", SCHADE_VASTGESTELD: "Schade vastgesteld",
  AFGESLOTEN: "Afgesloten", GEANNULEERD: "Geannuleerd",
};
const OVERGANGEN = {
  INGEDIEND: ["IN_BEHANDELING", "GEANNULEERD"],
  IN_BEHANDELING: ["WACHT_OP_AANVULLING", "GOEDGEKEURD", "GEWEIGERD"],
  WACHT_OP_AANVULLING: ["IN_BEHANDELING", "GEANNULEERD"],
  GOEDGEKEURD: ["BEVESTIGD", "GEANNULEERD"],
  GEWEIGERD: [],
  BEVESTIGD: ["BETAALD", "GEANNULEERD"],
  BETAALD: ["KLAARGEZET", "GEANNULEERD"],
  KLAARGEZET: ["UITGELEVERD"],
  UITGELEVERD: ["GERETOURNEERD"],
  GERETOURNEERD: ["IN_CONTROLE"],
  IN_CONTROLE: ["AFGESLOTEN", "SCHADE_VASTGESTELD"],
  SCHADE_VASTGESTELD: ["AFGESLOTEN"],
  AFGESLOTEN: [], GEANNULEERD: [],
};
const STATUS_BADGE = {
  INGEDIEND: "b-blauw", IN_BEHANDELING: "b-geel", WACHT_OP_AANVULLING: "b-warn", GOEDGEKEURD: "b-groen",
  GEWEIGERD: "b-rood", BEVESTIGD: "b-paars", BETAALD: "b-teal", KLAARGEZET: "b-teal", UITGELEVERD: "b-blauw",
  GERETOURNEERD: "b-geel", IN_CONTROLE: "b-warn", SCHADE_VASTGESTELD: "b-rood",
  AFGESLOTEN: "b-grijs", GEANNULEERD: "b-grijs",
};
// Statussen waarvan de reservatie de voorraad bezet houdt.
const BEZET_STATUS = ["GOEDGEKEURD", "BEVESTIGD", "BETAALD", "KLAARGEZET", "UITGELEVERD", "GERETOURNEERD", "IN_CONTROLE"];
const TE_BEHANDELEN = ["INGEDIEND", "IN_BEHANDELING", "WACHT_OP_AANVULLING", "GOEDGEKEURD", "BEVESTIGD"];

const ROL_LABELS = {
  ADMIN: "Administratief medewerker", PLOEGBAAS: "Ploegbaas", TECHNISCH: "Technisch medewerker",
  MAGAZIJNIER: "Magazijnier", BEHEERDER: "Beheerder", BELEID: "Beleid (lezer)",
};
const CATEGORIEEN = ["Podium", "Organisatorisch", "Sport & spel", "Audiovisueel", "Geluid", "Tentoonstelling"];
const TYPES_AANVRAGER = ["Erkende vereniging", "Onderwijsinstelling", "Organisator vergund evenement"];

/* Standaardinstellingen (tarieven en termijnen, aanpasbaar via Beheer). */
const STANDAARD_INSTELLINGEN = [
  ["AANVRAAG_MIN_WEKEN", "4", "Minimale aanvraagtermijn vooraf (weken)"],
  ["AANVRAAG_MAX_MAANDEN", "12", "Maximale aanvraagtermijn vooraf (maanden)"],
  ["UITLEENTERMIJN_DAGEN", "7", "Maximale uitleentermijn (kalenderdagen)"],
  ["BETALING_DAGEN_VOOR", "7", "Betaling uiterlijk X dagen voor levering"],
  ["TRANSPORTFORFAIT", "50", "Transportforfait heen en terug (euro)"],
  ["BOETE_PER_DAG", "25", "Boete per dag te laat (euro)"],
  ["EIGEN_HERSTEL_PER_UUR", "50", "Eigen herstel per begonnen uur (euro)"],
  ["DIENST_ADRES", "Malderendorp 14, 1840 Londerzeel", "Adres van de dienst"],
  ["DIENST_EMAIL", "uitleendienst@londerzeel.be", "E-mailadres van de dienst"],
];

/* Startcatalogus, gebruikt in de demo en aangeboden als vulling bij een lege lijst. */
const SEED_MATERIALEN = [
  ["Podiumelement 1x2 m", "Podium", 40, 5, 0, 1, null, "stuk"],
  ["Podiumwagen", "Podium", 1, 50, 0, 1, null, "stuk"],
  ["Podiumtrap", "Podium", 4, 5, 0, 1, null, "stuk"],
  ["Nadar (dranghek)", "Organisatorisch", 200, 0, 0, 1, 60, "meter"],
  ["Biertafel", "Organisatorisch", 60, 2, 0, 1, null, "stuk"],
  ["Statafel", "Organisatorisch", 30, 2, 0, 1, null, "stuk"],
  ["Plooistoel", "Organisatorisch", 300, 0.5, 0, 1, null, "stuk"],
  ["Kassatent", "Organisatorisch", 4, 10, 0, 1, null, "stuk"],
  ["Vlaggenmast", "Organisatorisch", 12, 2, 0, 1, null, "stuk"],
  ["Chalet", "Organisatorisch", 6, 25, 75, 1, null, "stuk"],
  ["Stroomgroep / aggregaat", "Organisatorisch", 2, 150, 0, 1, null, "stuk"],
  ["Fuifpakket", "Organisatorisch", 3, 25, 0, 1, null, "pakket"],
  ["Geluidsmeter", "Organisatorisch", 3, 10, 0, 0, null, "stuk"],
  ["Tribune-element", "Organisatorisch", 4, 40, 0, 1, null, "stuk"],
  ["Speer", "Sport & spel", 6, 2, 0, 0, null, "stuk"],
  ["Hoogspringset", "Sport & spel", 1, 15, 0, 1, null, "set"],
  ["Sjoelbak", "Sport & spel", 4, 5, 0, 0, null, "stuk"],
  ["Projectiescherm", "Audiovisueel", 2, 15, 0, 1, null, "stuk"],
  ["Projector (beamer)", "Audiovisueel", 2, 20, 0, 0, null, "stuk"],
  ["Microfoon", "Geluid", 8, 5, 0, 0, null, "stuk"],
  ["Monitor (geluid)", "Geluid", 4, 10, 0, 1, null, "stuk"],
  ["Tentoonstellingspaneel", "Tentoonstelling", 30, 3, 0, 1, null, "stuk"],
];
function seedMateriaalBody(m) {
  return { Title: m[0], UL_Categorie: m[1], UL_Totaal: m[2], UL_Huurtarief: m[3], UL_Transporttarief: m[4],
    UL_TransportVereist: m[5], UL_Capaciteitslimiet: m[6], UL_Eenheid: m[7], UL_Actief: 1 };
}

/* ── Lijstdefinities voor de zelfinstallatie ──────────────────────────── */
const LIJSTEN = {
  UL_Materialen: {
    omschrijving: "Materiaalcatalogus van de uitleendienst (beheerd via de app).",
    velden: [
      ["UL_Categorie", "Text", { indexed: false }],
      ["UL_Totaal", "Number", {}], ["UL_Huurtarief", "Number", {}], ["UL_Transporttarief", "Number", {}],
      ["UL_TransportVereist", "Number", {}], ["UL_Capaciteitslimiet", "Number", {}],
      ["UL_Eenheid", "Text", {}], ["UL_Omschrijving", "Note", {}], ["UL_Actief", "Number", { indexed: true }],
    ],
  },
  UL_Dossiers: {
    omschrijving: "Aanvraagdossiers van de uitleendienst (beheerd via de app).",
    velden: [
      ["UL_Status", "Text", { indexed: true }],
      ["UL_Aanvrager", "Text", {}], ["UL_TypeAanvrager", "Text", {}],
      ["UL_Contact", "Text", {}], ["UL_Email", "Text", {}], ["UL_Telefoon", "Text", {}],
      ["UL_Evenement", "Text", {}], ["UL_Locatie", "Text", {}], ["UL_Leveringswijze", "Text", {}],
      ["UL_Van", "DateOnly", { indexed: true }], ["UL_Tot", "DateOnly", {}],
      ["UL_Opmerkingen", "Note", {}], ["UL_WeigerReden", "Note", {}],
      ["UL_Huur", "Number", {}], ["UL_Transport", "Number", {}], ["UL_Schade", "Number", {}],
      ["UL_Boete", "Number", {}], ["UL_Totaal", "Number", {}],
      ["UL_Betaalstatus", "Text", {}], ["UL_Vervaldag", "DateOnly", {}],
      ["UL_Log", "Note", {}], ["UL_ClientId", "Text", { indexed: true }],
    ],
  },
  UL_Regels: {
    omschrijving: "Materiaalregels per dossier (beheerd via de app).",
    velden: [
      ["UL_DossierId", "Number", { indexed: true }], ["UL_MateriaalId", "Number", {}],
      ["UL_Gevraagd", "Number", {}], ["UL_Toegekend", "Number", {}], ["UL_Deelbedrag", "Number", {}],
      ["UL_Retour", "Text", {}], ["UL_RetourOpm", "Note", {}], ["UL_SchadeKost", "Number", {}],
      ["UL_ClientId", "Text", { indexed: true }],
    ],
  },
  UL_Instellingen: {
    omschrijving: "Instellingen, tarieven en rollen van de uitleendienst-app.",
    velden: [["UL_Waarde", "Text", {}], ["UL_Omschrijving", "Text", {}]],
  },
};

/* ── Hulpjes ──────────────────────────────────────────────────────────── */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euro = (n) => new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(+n || 0);
const rond2 = (n) => Math.round((+n || 0) * 100) / 100;
const iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
const dDatum = (s) => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? "" :
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const dagenTussen = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const overlapt = (van1, tot1, van2, tot2) => new Date(van1) <= new Date(tot2) && new Date(tot1) >= new Date(van2);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const vandaagPlus = (dagen) => { const d = new Date(); d.setDate(d.getDate() + dagen); return iso(d); };
function statusBadge(st) { return `<span class="badge ${STATUS_BADGE[st] || "b-grijs"}">${esc(STATUS_LABELS[st] || st)}</span>`; }

/* ── SharePoint-adapter ───────────────────────────────────────────────── */
const SP = {
  modus: "sharepoint", site: "", digest: "", digestTot: 0, velden: {}, entType: {}, waarschuwingen: [],

  async zoekSite() {
    if (CONFIG.siteUrl) { this.site = CONFIG.siteUrl.replace(/\/$/, ""); return this.vernieuwDigest(); }
    const stukken = location.pathname.split("/").filter(Boolean);
    for (let i = stukken.length; i >= 0; i--) {
      const pad = "/" + stukken.slice(0, i).join("/");
      try {
        const r = await fetch((pad === "/" ? "" : pad) + "/_api/contextinfo", {
          method: "POST", credentials: "same-origin", headers: { Accept: "application/json;odata=nometadata" } });
        if (r.ok) {
          const j = await r.json();
          this.site = (j.WebFullUrl || location.origin + (pad === "/" ? "" : pad)).replace(/\/$/, "");
          this.digest = j.FormDigestValue; this.digestTot = Date.now() + 20 * 60e3;
          return;
        }
      } catch (e) { /* volgende stap proberen */ }
    }
    throw new Error("Kon de SharePoint-site niet vinden vanaf dit adres.");
  },

  async vernieuwDigest() {
    const r = await fetch(this.site + "/_api/contextinfo", { method: "POST", credentials: "same-origin",
      headers: { Accept: "application/json;odata=nometadata" } });
    if (!r.ok) throw new Error("Kon geen schrijfsleutel (digest) ophalen: " + r.status);
    const j = await r.json();
    this.digest = j.FormDigestValue; this.digestTot = Date.now() + 20 * 60e3;
  },

  async vraag(pad, opties = {}, alOpnieuw = false) {
    const schrijft = opties.method && opties.method !== "GET";
    if (schrijft && Date.now() > this.digestTot - 30e3) await this.vernieuwDigest();
    const hoofden = Object.assign({ Accept: "application/json;odata=nometadata" }, opties.headers || {});
    if (schrijft) hoofden["X-RequestDigest"] = this.digest;
    if (opties.body && !hoofden["Content-Type"]) hoofden["Content-Type"] = "application/json;odata=verbose";
    const r = await fetch(this.site + pad, {
      method: opties.method || "GET", credentials: "same-origin", headers: hoofden,
      body: opties.body ? (typeof opties.body === "string" ? opties.body : JSON.stringify(opties.body)) : undefined,
    });
    if (r.status === 403 && schrijft && !alOpnieuw) { await this.vernieuwDigest(); return this.vraag(pad, opties, true); }
    if (!r.ok) { const t = await r.text().catch(() => ""); const e = new Error(`SharePoint gaf ${r.status} op ${pad}: ${t.slice(0, 300)}`); e.status = r.status; throw e; }
    if (r.status === 204) return null;
    const tekst = await r.text();
    return tekst ? JSON.parse(tekst) : null;
  },

  lijstPad(naam) { return `/_api/web/lists/getbytitle('${encodeURIComponent(naam)}')`; },

  async init() {
    await this.zoekSite();
    const status = {};
    // Eerst lezen wat bestaat, dan pas proberen aan te maken.
    for (const naam of Object.keys(LIJSTEN)) {
      try {
        const velden = await this.vraag(this.lijstPad(naam) + "/fields?$select=InternalName&$top=500");
        this.velden[naam] = new Set((velden.value || []).map((f) => f.InternalName));
        status[naam] = { ok: true, link: `${this.site}/Lists/${naam}` };
      } catch (e) { status[naam] = { ok: false }; }
    }
    const ontbrekend = Object.keys(LIJSTEN).filter((n) => !status[n].ok);
    for (const naam of ontbrekend) {
      try {
        await this.vraag("/_api/web/lists", { method: "POST", body: {
          __metadata: { type: "SP.List" }, BaseTemplate: 100, Title: naam,
          Description: LIJSTEN[naam].omschrijving } });
        this.velden[naam] = new Set();
        status[naam] = { ok: true, link: `${this.site}/Lists/${naam}`, nieuw: true };
      } catch (e) {
        this.waarschuwingen.push(`Lijst ${naam} kon niet aangemaakt worden (${e.status || "fout"}).`);
      }
    }
    if (Object.keys(LIJSTEN).some((n) => !status[n] || !status[n].ok)) {
      return { modus: this.modus, site: this.site, lijsten: status, waarschuwingen: this.waarschuwingen,
        fataal: "lijsten-ontbreken" };
    }
    // Ontbrekende kolommen aanvullen, elk in een eigen try.
    for (const [naam, def] of Object.entries(LIJSTEN)) {
      for (const [veld, type, extra] of def.velden) {
        if (this.velden[naam].has(veld)) continue;
        try {
          const xmlType = type === "DateOnly" ? "DateTime" : type;
          const extraXml = (type === "Note" ? ' NumLines="6" RichText="FALSE" UnlimitedLengthInDocumentLibrary="TRUE"' : "")
            + (type === "DateOnly" ? ' Format="DateOnly"' : "");
          await this.vraag(this.lijstPad(naam) + "/fields/createfieldasxml", { method: "POST", body: {
            parameters: { __metadata: { type: "SP.XmlSchemaFieldCreationInformation" },
              SchemaXml: `<Field Type="${xmlType}" DisplayName="${veld}" Name="${veld}" StaticName="${veld}"${extraXml}/>`,
              Options: 8 } } });
          if (extra.indexed) {
            await this.vraag(this.lijstPad(naam) + `/fields/getbyinternalnameortitle('${veld}')`, {
              method: "POST", headers: { "X-HTTP-Method": "MERGE", "IF-MATCH": "*" },
              body: { __metadata: { type: "SP.Field" }, Indexed: true } }).catch(() => {});
          }
          await this.vraag(this.lijstPad(naam) + `/defaultview/viewfields/addviewfield('${veld}')`, {
            method: "POST" }).catch(() => {});
          this.velden[naam].add(veld);
        } catch (e) {
          this.waarschuwingen.push(`Kolom ${veld} in ${naam} kon niet aangemaakt worden; de app werkt verder zonder deze kolom.`);
        }
      }
    }
    return { modus: this.modus, site: this.site, lijsten: status, waarschuwingen: this.waarschuwingen };
  },

  schoon(lijst, body) {
    const ok = this.velden[lijst]; if (!ok) return body;
    const uit = {};
    for (const [k, v] of Object.entries(body)) if (!k.startsWith(CONFIG.prefix) || ok.has(k)) uit[k] = v;
    return uit;
  },
  sel(lijst, csv) {
    const ok = this.velden[lijst]; if (!ok) return csv;
    return csv.split(",").filter((c) => !c.startsWith(CONFIG.prefix) || ok.has(c)).join(",");
  },

  async entiteit(lijst) {
    if (!this.entType[lijst]) {
      const j = await this.vraag(this.lijstPad(lijst) + "?$select=ListItemEntityTypeFullName");
      this.entType[lijst] = j.ListItemEntityTypeFullName;
    }
    return this.entType[lijst];
  },

  async lees(lijst, selectCsv, filter) {
    const sel = this.sel(lijst, selectCsv);
    let pad = this.lijstPad(lijst) + `/items?$select=${sel}&$top=5000` + (filter ? `&$filter=${filter}` : "");
    const alles = [];
    while (pad) {
      const j = await this.vraag(pad.startsWith("http") ? pad.replace(this.site, "") : pad);
      alles.push(...(j.value || []));
      pad = j["odata.nextLink"] || j["@odata.nextLink"] || null;
    }
    return alles;
  },

  async nieuwe(lijst, body) {
    const type = await this.entiteit(lijst);
    const j = await this.vraag(this.lijstPad(lijst) + "/items", { method: "POST",
      body: Object.assign({ __metadata: { type } }, this.schoon(lijst, body)) });
    return j;
  },
  async wijzig(lijst, id, body) {
    const type = await this.entiteit(lijst);
    await this.vraag(this.lijstPad(lijst) + `/items(${id})`, { method: "POST",
      headers: { "X-HTTP-Method": "MERGE", "IF-MATCH": "*" },
      body: Object.assign({ __metadata: { type } }, this.schoon(lijst, body)) });
  },
  async weg(lijst, id) {
    await this.vraag(this.lijstPad(lijst) + `/items(${id})`, { method: "POST",
      headers: { "X-HTTP-Method": "DELETE", "IF-MATCH": "*" } });
  },
  async wie() {
    const j = await this.vraag("/_api/web/currentuser?$select=Title,Email");
    return { naam: j.Title || "", email: (j.Email || "").toLowerCase() };
  },
};

/* ── Demo-adapter (localStorage) ──────────────────────────────────────── */
const DEMO = {
  modus: "demo", site: "(demo op dit toestel)", velden: {}, waarschuwingen: [],
  sleutel: "uld_demo_v1",
  db: null,

  laad() {
    if (this.db) return this.db;
    try { this.db = JSON.parse(localStorage.getItem(this.sleutel) || "null"); } catch (e) { this.db = null; }
    if (!this.db) { this.db = this.vers(); this.bewaar(); }
    return this.db;
  },
  bewaar() { try { localStorage.setItem(this.sleutel, JSON.stringify(this.db)); } catch (e) { /* vol of geblokkeerd */ } },

  vers() {
    const db = { teller: 0, UL_Materialen: [], UL_Dossiers: [], UL_Regels: [], UL_Instellingen: [] };
    const idd = () => ++db.teller;
    for (const m of SEED_MATERIALEN) db.UL_Materialen.push(Object.assign({ Id: idd() }, seedMateriaalBody(m)));
    for (const [k, w, o] of STANDAARD_INSTELLINGEN) db.UL_Instellingen.push({ Id: idd(), Title: k, UL_Waarde: w, UL_Omschrijving: o });
    const mat = (naam) => db.UL_Materialen.find((m) => m.Title === naam);
    const maakDossier = (ref, status, dagenVooruit, duur, extra) => {
      const d = Object.assign({ Id: idd(), Title: ref, UL_Status: status,
        UL_Aanvrager: extra.a, UL_TypeAanvrager: "Erkende vereniging", UL_Contact: extra.c,
        UL_Email: extra.e, UL_Telefoon: "052 30 00 00", UL_Evenement: extra.ev, UL_Locatie: extra.l,
        UL_Leveringswijze: extra.w, UL_Van: vandaagPlus(dagenVooruit), UL_Tot: vandaagPlus(dagenVooruit + duur),
        UL_Huur: 0, UL_Transport: 0, UL_Schade: 0, UL_Boete: 0, UL_Totaal: 0, UL_Betaalstatus: "",
        UL_Log: `${dDatum(new Date())} Aanvraag ingevoerd (demo)`, UL_ClientId: uid() }, {});
      db.UL_Dossiers.push(d); return d;
    };
    const regel = (d, m, aantal, toegekend) => db.UL_Regels.push({ Id: idd(), Title: m.Title,
      UL_DossierId: d.Id, UL_MateriaalId: m.Id, UL_Gevraagd: aantal, UL_Toegekend: toegekend || 0,
      UL_Deelbedrag: rond2((toegekend || 0) * m.UL_Huurtarief), UL_Retour: "", UL_SchadeKost: 0, UL_ClientId: uid() });
    const d1 = maakDossier("UL-" + new Date().getFullYear() + "-0001", "INGEDIEND", 40, 2,
      { a: "Chiro Sint-Jozef", c: "Jonas Willems", e: "chiro@voorbeeld.be", ev: "Chirofuif", l: "Parochiezaal", w: "Levering" });
    regel(d1, mat("Biertafel"), 20); regel(d1, mat("Plooistoel"), 100); regel(d1, mat("Nadar (dranghek)"), 40);
    const d2 = maakDossier("UL-" + new Date().getFullYear() + "-0002", "GOEDGEKEURD", 21, 3,
      { a: "KFC Londerzeel", c: "An Peeters", e: "kfc@voorbeeld.be", ev: "Jeugdtornooi", l: "Sportpark", w: "Afhaling" });
    regel(d2, mat("Kassatent"), 2, 2); regel(d2, mat("Biertafel"), 30, 30);
    const d3 = maakDossier("UL-" + new Date().getFullYear() + "-0003", "UITGELEVERD", -3, 5,
      { a: "Basisschool De Wilg", c: "Tom Claes", e: "school@voorbeeld.be", ev: "Schoolfeest", l: "Speelplaats", w: "Levering" });
    regel(d3, mat("Podiumelement 1x2 m"), 12, 12); regel(d3, mat("Microfoon"), 2, 2);
    d3.UL_Huur = 70; d3.UL_Transport = 50; d3.UL_Totaal = 120; d3.UL_Betaalstatus = "Betaald";
    return db;
  },

  async init() {
    this.laad();
    for (const naam of Object.keys(LIJSTEN)) this.velden[naam] = new Set(["Title", ...LIJSTEN[naam].velden.map((v) => v[0])]);
    const status = {};
    for (const naam of Object.keys(LIJSTEN)) status[naam] = { ok: true, link: "" };
    return { modus: this.modus, site: this.site, lijsten: status,
      waarschuwingen: ["Demo-modus: alles wordt alleen op dit toestel bewaard."] };
  },
  async wie() { return { naam: "Demo-gebruiker", email: "demo@londerzeel.be" }; },
  async lees(lijst) { this.laad(); return this.db[lijst].map((r) => Object.assign({}, r)); },
  async nieuwe(lijst, body) {
    this.laad(); const item = Object.assign({ Id: ++this.db.teller }, body);
    this.db[lijst].push(item); this.bewaar(); return Object.assign({}, item);
  },
  async wijzig(lijst, id, body) {
    this.laad(); const item = this.db[lijst].find((r) => r.Id === id);
    if (item) { Object.assign(item, body); this.bewaar(); }
  },
  async weg(lijst, id) {
    this.laad(); this.db[lijst] = this.db[lijst].filter((r) => r.Id !== id); this.bewaar();
  },
};
