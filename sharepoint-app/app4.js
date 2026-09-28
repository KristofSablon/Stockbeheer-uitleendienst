/* Deel 4: beschikbaarheid, documenten, Excel, installatie, gebeurtenissen en start. */

/* ── Scherm: beschikbaarheid ──────────────────────────────────────────── */
function schermBeschikbaar() {
  const van = S.bkVan || iso(new Date()), tot = S.bkTot || vandaagPlus(13);
  const rijen = S.data.UL_Materialen.filter((m) => m.UL_Actief).sort((a, b) =>
    (a.UL_Categorie + a.Title).localeCompare(b.UL_Categorie + b.Title));
  return `
  <div class="kaart"><h2>Beschikbaarheid per periode</h2>
    <div class="rij">
      <div class="veld"><label>Van</label><input type="date" id="bk_van" value="${van}"></div>
      <div class="veld"><label>Tot</label><input type="date" id="bk_tot" value="${tot}"></div>
      <button class="knop" data-actie="bk-toon">Toon</button>
    </div>
  </div>
  <div class="tabelwrap"><table>
    <thead><tr><th>Materiaal</th><th class="num">Totaal</th><th class="num">Bezet</th><th class="num">Vrij</th><th style="width:130px">Bezetting</th></tr></thead>
    <tbody>${rijen.map((m) => {
      const bezet = bezetInPeriode(m.Id, van, tot, null);
      const vrij = Math.max(0, (m.UL_Totaal || 0) - bezet);
      const pct = m.UL_Totaal ? Math.min(100, Math.round(bezet / m.UL_Totaal * 100)) : 0;
      const kleur = pct >= 100 ? "var(--rood)" : pct > 70 ? "var(--warn)" : "var(--ok)";
      return `<tr><td>${esc(m.Title)}</td><td class="num">${m.UL_Totaal}</td><td class="num">${bezet}</td>
        <td class="num" style="font-weight:700;color:${vrij ? "inherit" : "var(--rood)"}">${vrij}</td>
        <td><div style="background:var(--grijs);border-radius:99px;height:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${kleur}"></div></div>
        <span class="stil-tekst">${pct}%</span></td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

/* ── Afdrukbare documenten ────────────────────────────────────────────── */
function drukDocument(d, soort) {
  const regels = regelsVan(d.Id);
  const kop = `<div class="dkop"><div><b style="font-size:16pt">Uitleendienst Londerzeel</b><br>
    ${esc(instelling("DIENST_ADRES"))}<br>${esc(instelling("DIENST_EMAIL"))}</div>
    <div style="text-align:right"><b style="font-size:14pt">${soort === "ontvangst" ? "Ontvangstbewijs" : "Retourformulier"}</b><br>
    Referentie: <b>${esc(d.Title)}</b><br>Datum: ${dDatum(new Date())}</div></div>`;
  const partij = `<p><b>${esc(d.UL_Aanvrager)}</b> (${esc(d.UL_TypeAanvrager)})<br>
    Contactpersoon: ${esc(d.UL_Contact)}${d.UL_Telefoon ? ", " + esc(d.UL_Telefoon) : ""}<br>
    Evenement: ${esc(d.UL_Evenement)}${d.UL_Locatie ? ", " + esc(d.UL_Locatie) : ""}<br>
    Uitleenperiode: ${dDatum(d.UL_Van)} tot en met ${dDatum(d.UL_Tot)} (${esc(d.UL_Leveringswijze)})</p>`;
  let inhoud;
  if (soort === "ontvangst") {
    inhoud = `<table><tr><th>Materiaal</th><th>Aantal</th><th>Staat bij levering</th></tr>
      ${regels.map((r) => `<tr><td>${esc(r.Title)}</td><td>${r.UL_Toegekend || r.UL_Gevraagd}</td><td>goed</td></tr>`).join("")}</table>
      <p>Het materiaal wordt terugverwacht op <b>${dDatum(d.UL_Tot)}</b>. De aanvrager is aanwezig bij levering of afhaling
      en meldt schade uiterlijk de eerstvolgende werkdag. Bij laattijdige retour wordt ${euro(instGetal("BOETE_PER_DAG"))} per dag aangerekend.</p>`;
  } else {
    inhoud = `<table><tr><th>Materiaal</th><th>Aantal</th><th>Beoordeling</th><th>Opmerking</th><th>Kost</th></tr>
      ${regels.map((r) => `<tr><td>${esc(r.Title)}</td><td>${r.UL_Toegekend || r.UL_Gevraagd}</td>
        <td>${r.UL_Retour === "SCHADE" ? "schade" : "goed"}</td><td>${esc(r.UL_RetourOpm || "")}</td>
        <td>${r.UL_SchadeKost ? euro(r.UL_SchadeKost) : ""}</td></tr>`).join("")}</table>
      <p>Schade: <b>${euro(d.UL_Schade)}</b>${d.UL_Boete ? `, boete laattijdige retour: <b>${euro(d.UL_Boete)}</b>` : ""}.
      Totaal dossier: <b>${euro(d.UL_Totaal)}</b>.</p>`;
  }
  const handtekening = `<div class="handteken"><div>Voor de aanvrager<br>${esc(d.UL_Contact)}</div>
    <div>Voor de uitleendienst<br>${esc(S.ik.naam)}</div></div>`;
  document.getElementById("drukvlak").innerHTML = kop + partij + inhoud + handtekening;
  window.print();
}

/* ── Excel-exports ────────────────────────────────────────────────────── */
function exportStock() {
  const rijen = S.data.UL_Materialen.map((m) => ({
    Materiaal: m.Title, Categorie: m.UL_Categorie, Totaal: m.UL_Totaal, Eenheid: m.UL_Eenheid || "stuk",
    "Huurtarief (euro)": m.UL_Huurtarief || 0, "Transporttarief (euro)": m.UL_Transporttarief || 0,
    "Transport vereist": m.UL_TransportVereist ? "ja" : "nee",
    "Limiet per aanvrager": m.UL_Capaciteitslimiet || "", Actief: m.UL_Actief ? "ja" : "nee",
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rijen), "Stocklijst");
  XLSX.writeFile(wb, `Stocklijst uitleendienst ${iso(new Date())}.xlsx`);
}
function exportFacturatie() {
  const relevant = S.data.UL_Dossiers.filter((d) => (d.UL_Totaal || 0) > 0);
  const rijen = relevant.map((d) => ({
    Referentie: d.Title, Aanvrager: d.UL_Aanvrager, Type: d.UL_TypeAanvrager, Evenement: d.UL_Evenement,
    Van: d.UL_Van ? dDatum(d.UL_Van) : "", Tot: d.UL_Tot ? dDatum(d.UL_Tot) : "", Status: STATUS_LABELS[d.UL_Status] || d.UL_Status,
    "Huur (euro)": d.UL_Huur || 0, "Transport (euro)": d.UL_Transport || 0, "Schade (euro)": d.UL_Schade || 0,
    "Boete (euro)": d.UL_Boete || 0, "Totaal (euro)": d.UL_Totaal || 0,
    Betaalstatus: d.UL_Betaalstatus || "", Vervaldag: d.UL_Vervaldag ? dDatum(d.UL_Vervaldag) : "",
    "E-mail aanvrager": d.UL_Email || "",
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rijen), "Facturatie");
  XLSX.writeFile(wb, `Facturatiegegevens uitleendienst ${iso(new Date())}.xlsx`);
}

/* ── Scherm: opslag en installatie ────────────────────────────────────── */
function schermOpslag() {
  const info = S.info || { lijsten: {}, waarschuwingen: [] };
  return `
  <div class="kaart"><h2>Opslag en installatie</h2>
    <dl class="info">
      <dt>Modus</dt><dd>${info.modus === "demo" ? "Demo, alles blijft op dit toestel" : "SharePoint"}</dd>
      <dt>Site</dt><dd>${esc(info.site || "")}</dd>
      <dt>Aangemeld</dt><dd>${esc(S.ik.naam)}${S.ik.email ? " (" + esc(S.ik.email) + ")" : ""}</dd>
      <dt>Rollen</dt><dd>${S.ik.rollen.map((r) => esc(ROL_LABELS[r] || r)).join(", ")}
        ${S.rollenIngesteld ? "" : ' <span class="badge b-warn">nog geen rollen ingesteld, iedereen kan alles</span>'}</dd>
      <dt>Versie</dt><dd>${CONFIG.appVersie}</dd>
    </dl>
    <h3>Lijsten</h3>
    <div class="tabelwrap"><table><thead><tr><th>Lijst</th><th>Stand</th></tr></thead><tbody>
      ${Object.keys(LIJSTEN).map((naam) => {
        const st = info.lijsten[naam] || { ok: false };
        return `<tr><td>${st.link ? `<a href="${esc(st.link)}" target="_blank" rel="noopener">${naam}</a>` : naam}</td>
          <td>${st.ok ? '<span class="badge b-groen">in orde</span>' : '<span class="badge b-rood">ontbreekt</span>'}</td></tr>`;
      }).join("")}</tbody></table></div>
    ${info.waarschuwingen && info.waarschuwingen.length ? `<h3>Waarschuwingen</h3>
      ${info.waarschuwingen.map((w) => `<div class="melding let">${esc(w)}</div>`).join("")}` : ""}
    <h3>Installatie in vijf stappen</h3>
    <ol>
      <li>Upload dit bestand naar een documentbibliotheek van de site, bijvoorbeeld Siteactiva.</li>
      <li>Laat een sitebeheerder de pagina een eerste keer openen. Alleen een beheerder mag de lijsten aanmaken.</li>
      <li>Geef de medewerkers bewerkrechten op de site en stel hun rollen in via het tabblad Beheer.</li>
      <li>Deel de link. Op een tablet zet je die het best als snelkoppeling op het beginscherm.</li>
      <li>Nieuwe versie? Overschrijf gewoon het bestand, de gegevens blijven staan. Laat een beheerder als eerste openen.</li>
    </ol>
    <div class="acties">
      <button class="knop stil" data-actie="herlaad">Opnieuw proberen</button>
      ${info.modus === "demo" ? `<button class="knop stil" data-actie="demo-wis">Demogegevens wissen en opnieuw beginnen</button>` : ""}
    </div>
  </div>`;
}

function schermInstallatieNodig() {
  const bericht = `Dag, kun jij als sitebeheerder deze pagina een keer openen? ` +
    `De uitleendienst-app maakt dan zelf haar lijsten aan. Daarna kan iedereen ze gebruiken. Alvast bedankt! ${location.href}`;
  return `
  <div class="kaart"><h2>De app is nog niet geinstalleerd op deze site</h2>
    <p>De lijsten waarin de gegevens komen bestaan nog niet, en jouw account mag ze niet aanmaken.
      Jij hoeft hier niets voor te doen: vraag een sitebeheerder om deze pagina een keer te openen, daarna werkt alles vanzelf.</p>
    <div class="acties">
      <button class="knop" data-actie="kopieer-bericht" data-bericht="${esc(bericht)}">Kopieer een kant-en-klaar bericht voor de beheerder</button>
      <button class="knop stil" data-actie="herlaad">Opnieuw proberen</button>
    </div>
    <div id="kopieer-melding"></div>
  </div>`;
}

/* ── Gebeurtenissen ───────────────────────────────────────────────────── */
function naRender() {
  const zoek = document.getElementById("zoekveld");
  if (zoek) zoek.addEventListener("input", () => {
    S.zoek = zoek.value;
    const pos = zoek.selectionStart; render();
    const nieuw = document.getElementById("zoekveld");
    if (nieuw) { nieuw.focus(); nieuw.setSelectionRange(pos, pos); }
  });
}

document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-actie],[data-tab],[data-filter],tr[data-dossier]");
  if (!el) return;
  if (el.dataset.tab) return ga(el.dataset.tab);
  if (el.dataset.filter) { S.filter = el.dataset.filter; return render(); }
  if (el.dataset.dossier && !el.dataset.actie) { ev.preventDefault(); return ga("dossier", Q.echtId(+el.dataset.dossier)); }

  const d = S.data.UL_Dossiers.find((x) => x.Id === S.dossierId);
  switch (el.dataset.actie) {
    case "terug": ev.preventDefault(); return ga("overzicht");
    case "aanvraag-indienen": return aanvraagIndienen();
    case "status": if (d && zetStatus(d, el.dataset.naar)) render(); return;
    case "goedkeuren": return d && actieGoedkeuren(d);
    case "bevestigen": return d && actieBevestigen(d);
    case "betaald":
      if (d && zetStatus(d, "BETAALD", "Betaling ontvangen")) {
        d.UL_Betaalstatus = "Betaald"; bewaarWijzig("UL_Dossiers", d.Id, { UL_Betaalstatus: "Betaald" }); render();
      } return;
    case "aanvulling":
      return d && vraagReden("Info opvragen bij de aanvrager", "Welke aanvulling is nodig?", (reden) => {
        if (zetStatus(d, "WACHT_OP_AANVULLING", "Info opgevraagd: " + reden)) {
          d.UL_WeigerReden = reden; bewaarWijzig("UL_Dossiers", d.Id, { UL_WeigerReden: reden });
        } sluitModal(); render();
      });
    case "weigeren":
      return d && vraagReden("Aanvraag weigeren", "Reden van de weigering (verplicht)", (reden) => {
        if (!reden.trim()) return;
        if (zetStatus(d, "GEWEIGERD", "Geweigerd: " + reden)) {
          d.UL_WeigerReden = reden; bewaarWijzig("UL_Dossiers", d.Id, { UL_WeigerReden: reden });
        } sluitModal(); render();
      });
    case "annuleren":
      return d && vraagReden("Dossier annuleren", "Waarom wordt dit dossier geannuleerd?", (reden) => {
        zetStatus(d, "GEANNULEERD", "Geannuleerd: " + (reden || "geen reden opgegeven"));
        sluitModal(); render();
      });
    case "retour-afronden": return d && retourAfronden(d);
    case "print-ontvangst": return d && drukDocument(d, "ontvangst");
    case "print-retour": return d && drukDocument(d, "retour");
    case "modal-ok": {
      const reden = (document.getElementById("md_reden") || {}).value || "";
      return S.modalKlaar && S.modalKlaar(reden);
    }
    case "modal-weg": return sluitModal();
    case "mat-nieuw": return matFormulier(null);
    case "mat-bewerk": return matFormulier(S.data.UL_Materialen.find((m) => m.Id === Q.echtId(+el.dataset.id)));
    case "mat-bewaar": return matBewaar();
    case "mat-wissel": {
      const m = S.data.UL_Materialen.find((x) => x.Id === Q.echtId(+el.dataset.id));
      if (m) { m.UL_Actief = m.UL_Actief ? 0 : 1; bewaarWijzig("UL_Materialen", m.Id, { UL_Actief: m.UL_Actief }); render(); }
      return;
    }
    case "mat-seed":
      for (const m of SEED_MATERIALEN) bewaarNieuw("UL_Materialen", seedMateriaalBody(m));
      return render();
    case "rol-nieuw": return rolFormulier(null);
    case "rol-bewerk": return rolFormulier(S.data.UL_Instellingen.find((r) => r.Id === Q.echtId(+el.dataset.id)));
    case "rol-bewaar": return rolBewaar();
    case "rol-weg": bewaarWeg("UL_Instellingen", Q.echtId(+el.dataset.id)); bepaalRollen(); return render();
    case "inst-bewaar": return instBewaar();
    case "excel-stock": return exportStock();
    case "excel-facturatie": return exportFacturatie();
    case "bk-toon":
      S.bkVan = (document.getElementById("bk_van") || {}).value;
      S.bkTot = (document.getElementById("bk_tot") || {}).value;
      return render();
    case "herlaad": return location.reload();
    case "demo-wis": localStorage.removeItem(DEMO.sleutel); localStorage.removeItem(WACHTRIJ_SLEUTEL); return location.reload();
    case "kopieer-bericht": {
      try { await navigator.clipboard.writeText(el.dataset.bericht); } catch (e) {}
      const m = document.getElementById("kopieer-melding");
      if (m) m.innerHTML = `<div class="melding goed">Het bericht staat op het klembord. Plak het in een mail of chat naar de beheerder.</div>`;
      return;
    }
  }
});

/* Beschikbaarheid live bijwerken bij een periodewissel in het aanvraagscherm,
   zonder het formulier opnieuw op te bouwen (anders verspringt de invoer). */
document.addEventListener("change", (ev) => {
  if (ev.target.dataset && ev.target.dataset.actie === "periode") {
    const van = (document.getElementById("nv_van") || {}).value, tot = (document.getElementById("nv_tot") || {}).value;
    if (!van || !tot) return;
    for (const cel of document.querySelectorAll("[data-vrij]")) {
      const m = materiaal(+cel.dataset.vrij);
      if (m) cel.textContent = `${beschikbaar(m, van, tot, null)} ${m.UL_Eenheid || ""}`;
    }
  }
});

/* Alleen opnieuw opbouwen bij een breedteverandering (tablet-toetsenbord geeft hoogtewissels). */
window.addEventListener("resize", () => {
  if (window.innerWidth !== S.laatsteBreedte) { S.laatsteBreedte = window.innerWidth; render(); }
});

/* ── Start ────────────────────────────────────────────────────────────── */
async function start() {
  Q.laad(); toonSync();
  const app = document.getElementById("app");
  app.innerHTML = `<div class="kaart">Even geduld, de app start op en controleert de lijsten.</div>`;
  try {
    S.info = await S.api.init();
    S.ik = Object.assign(S.ik, await S.api.wie());
    if (!S.info.fataal) {
      await laadAlles();
      bepaalRollen();
      Q.verwerk();
    }
  } catch (e) {
    console.error(e);
    S.info = { modus: S.api.modus, site: S.api.site || "", lijsten: {}, waarschuwingen: [String(e.message || e)], fataal: "start" };
  }
  const wie = document.getElementById("wie");
  if (wie) wie.innerHTML = `<b>${esc(S.ik.naam)}</b><br>${S.ik.rollen.map((r) => esc(ROL_LABELS[r] || r)).join(", ") || "geen rol"}`;
  render();
}
start();
