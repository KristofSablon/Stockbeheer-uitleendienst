/* Deel 3: invoerschermen. Nieuwe aanvraag, dossier met behandeling en retour, catalogus, beheer. */

function openModal(html) { document.getElementById("modal").innerHTML = html; document.getElementById("sluier").classList.add("open"); }
function sluitModal() { document.getElementById("sluier").classList.remove("open"); }

/* ── Scherm: nieuwe aanvraag ──────────────────────────────────────────── */
function schermNieuw() {
  const van = document.getElementById("nv_van") ? document.getElementById("nv_van").value : vandaagPlus(35);
  const tot = document.getElementById("nv_tot") ? document.getElementById("nv_tot").value : vandaagPlus(37);
  const materialen = S.data.UL_Materialen.filter((m) => m.UL_Actief).sort((a, b) =>
    (a.UL_Categorie + a.Title).localeCompare(b.UL_Categorie + b.Title));
  let vorige = "";
  return `
  <div class="kaart"><h2>Nieuwe aanvraag invoeren</h2>
    <p class="stil-tekst">Voer hier een aanvraag in die per e-mail of aan het loket binnenkwam.
      De aanvraagtermijn is normaal minstens ${instelling("AANVRAAG_MIN_WEKEN")} weken vooraf en de uitleen duurt hoogstens ${instelling("UITLEENTERMIJN_DAGEN")} dagen.</p>
    <div class="twee" style="margin-top:8px">
      <div>
        <h3>Aanvrager</h3>
        <div class="veld"><label>Vereniging of instelling *</label><input id="nv_aanvrager"></div>
        <div class="veld"><label>Type</label><select id="nv_type">${TYPES_AANVRAGER.map((t) => `<option>${t}</option>`).join("")}</select></div>
        <div class="veld"><label>Contactpersoon *</label><input id="nv_contact"></div>
        <div class="rij"><div class="veld" style="flex:1"><label>E-mail</label><input id="nv_email" type="email"></div>
          <div class="veld" style="flex:1"><label>Telefoon</label><input id="nv_tel"></div></div>
      </div>
      <div>
        <h3>Evenement en periode</h3>
        <div class="veld"><label>Evenement *</label><input id="nv_evenement"></div>
        <div class="veld"><label>Locatie</label><input id="nv_locatie"></div>
        <div class="rij">
          <div class="veld" style="flex:1"><label>Van *</label><input id="nv_van" type="date" value="${van}" data-actie="periode"></div>
          <div class="veld" style="flex:1"><label>Tot *</label><input id="nv_tot" type="date" value="${tot}" data-actie="periode"></div>
        </div>
        <div class="veld"><label>Levering of afhaling</label>
          <select id="nv_wijze"><option>Levering</option><option>Afhaling</option></select></div>
        <div class="veld"><label>Opmerkingen</label><textarea id="nv_opm"></textarea></div>
      </div>
    </div>
  </div>
  <div class="kaart"><h2>Materiaal</h2>
    <p class="stil-tekst">Beschikbaar is berekend voor de gekozen periode, rekening houdend met andere dossiers.</p>
    <div class="tabelwrap"><table>
      <thead><tr><th>Materiaal</th><th class="num">Beschikbaar</th><th class="num">Tarief</th><th class="num" style="width:110px">Aantal</th></tr></thead>
      <tbody>${materialen.map((m) => {
        const kop = m.UL_Categorie !== vorige ? `<tr><td colspan="4" style="background:var(--grijs);font-weight:700">${esc(vorige = m.UL_Categorie)}</td></tr>` : "";
        const vrij = beschikbaar(m, van, tot, null);
        return kop + `<tr>
          <td>${esc(m.Title)}${m.UL_Capaciteitslimiet ? `<div class="stil-tekst">max ${m.UL_Capaciteitslimiet} per aanvrager</div>` : ""}</td>
          <td class="num" data-vrij="${m.Id}">${vrij} ${esc(m.UL_Eenheid || "")}</td>
          <td class="num">${m.UL_Huurtarief ? euro(m.UL_Huurtarief) : "gratis"}</td>
          <td class="num"><input type="number" min="0" inputmode="numeric" data-mat="${m.Id}" style="text-align:right"></td></tr>`;
      }).join("")}</tbody>
    </table></div>
    <div id="nv_melding"></div>
    <div class="acties"><button class="knop" data-actie="aanvraag-indienen">Aanvraag indienen</button></div>
  </div>`;
}

function aanvraagIndienen() {
  const w = (id) => (document.getElementById(id) || {}).value || "";
  const meld = document.getElementById("nv_melding");
  const van = w("nv_van"), tot = w("nv_tot");
  const regels = [...document.querySelectorAll("input[data-mat]")]
    .map((i) => ({ matId: +i.dataset.mat, aantal: parseInt(i.value, 10) || 0 })).filter((r) => r.aantal > 0);
  const fouten = [];
  if (!w("nv_aanvrager")) fouten.push("Vul de vereniging of instelling in.");
  if (!w("nv_contact")) fouten.push("Vul de contactpersoon in.");
  if (!w("nv_evenement")) fouten.push("Vul het evenement in.");
  if (!van || !tot) fouten.push("Vul de periode in.");
  else if (new Date(tot) < new Date(van)) fouten.push("De einddatum ligt voor de begindatum. Pas de periode aan.");
  if (!regels.length) fouten.push("Kies minstens een materiaal met een aantal.");
  if (fouten.length) { meld.innerHTML = `<div class="melding fout">${fouten.map(esc).join("<br>")}</div>`; return; }

  const opmerkingen = [];
  const minDatum = vandaagPlus(instGetal("AANVRAAG_MIN_WEKEN") * 7);
  if (van < minDatum) opmerkingen.push(`De aanvraag valt binnen de minimumtermijn van ${instelling("AANVRAAG_MIN_WEKEN")} weken.`);
  if (dagenTussen(van, tot) + 1 > instGetal("UITLEENTERMIJN_DAGEN")) opmerkingen.push(`De periode is langer dan de maximale uitleentermijn van ${instelling("UITLEENTERMIJN_DAGEN")} dagen.`);

  const dossier = bewaarNieuw("UL_Dossiers", {
    Title: refNieuw(), UL_Status: "INGEDIEND", UL_Aanvrager: w("nv_aanvrager"), UL_TypeAanvrager: w("nv_type"),
    UL_Contact: w("nv_contact"), UL_Email: w("nv_email"), UL_Telefoon: w("nv_tel"),
    UL_Evenement: w("nv_evenement"), UL_Locatie: w("nv_locatie"), UL_Leveringswijze: w("nv_wijze"),
    UL_Van: van, UL_Tot: tot, UL_Opmerkingen: w("nv_opm") + (opmerkingen.length ? "\nLet op: " + opmerkingen.join(" ") : ""),
    UL_Huur: 0, UL_Transport: 0, UL_Schade: 0, UL_Boete: 0, UL_Totaal: 0, UL_Betaalstatus: "",
    UL_Log: "", UL_ClientId: uid(),
  });
  logRegel(dossier, "Aanvraag ingevoerd");
  bewaarWijzig("UL_Dossiers", dossier.Id, { UL_Log: dossier.UL_Log });
  for (const r of regels) {
    const mat = materiaal(r.matId);
    bewaarNieuw("UL_Regels", { Title: mat.Title, UL_DossierId: dossier.Id, UL_MateriaalId: r.matId,
      UL_Gevraagd: r.aantal, UL_Toegekend: 0, UL_Deelbedrag: 0, UL_Retour: "", UL_SchadeKost: 0, UL_ClientId: uid() });
  }
  ga("dossier", dossier.Id);
}

/* ── Scherm: dossier ──────────────────────────────────────────────────── */
function schermDossier() {
  const d = S.data.UL_Dossiers.find((x) => x.Id === S.dossierId);
  if (!d) return `<div class="melding fout">Dit dossier is niet gevonden. Ga terug naar het overzicht.</div>`;
  const check = stockcheck(d);
  const kosten = berekenKosten(d);
  const behandelbaar = ["IN_BEHANDELING", "WACHT_OP_AANVULLING"].includes(d.UL_Status);
  const magUitvoeren = magIk("ADMIN", "BEHEERDER", "TECHNISCH", "MAGAZIJNIER", "PLOEGBAAS");
  const magRetour = magIk("ADMIN", "BEHEERDER", "MAGAZIJNIER", "TECHNISCH");

  const actieKnoppen = [];
  const kan = (naar) => (OVERGANGEN[d.UL_Status] || []).includes(naar);
  if (magBehandelen()) {
    if (d.UL_Status === "INGEDIEND") actieKnoppen.push(`<button class="knop" data-actie="status" data-naar="IN_BEHANDELING">In behandeling nemen</button>`);
    if (behandelbaar) {
      actieKnoppen.push(`<button class="knop groen" data-actie="goedkeuren">Goedkeuren</button>`);
      actieKnoppen.push(`<button class="knop stil" data-actie="aanvulling">Info opvragen</button>`);
      actieKnoppen.push(`<button class="knop rood" data-actie="weigeren">Weigeren</button>`);
    }
    if (d.UL_Status === "GOEDGEKEURD") actieKnoppen.push(`<button class="knop" data-actie="bevestigen">Bevestigen en kosten vastleggen</button>`);
    if (d.UL_Status === "BEVESTIGD") actieKnoppen.push(`<button class="knop groen" data-actie="betaald">Betaling ontvangen</button>`);
  }
  if (magUitvoeren) {
    if (d.UL_Status === "BETAALD") actieKnoppen.push(`<button class="knop" data-actie="status" data-naar="KLAARGEZET">Materiaal klaargezet</button>`);
    if (d.UL_Status === "KLAARGEZET") actieKnoppen.push(`<button class="knop" data-actie="status" data-naar="UITGELEVERD">Uitgeleverd of afgehaald</button>`);
  }
  if (magRetour) {
    if (d.UL_Status === "UITGELEVERD") actieKnoppen.push(`<button class="knop" data-actie="status" data-naar="GERETOURNEERD">Materiaal is terug</button>`);
    if (d.UL_Status === "GERETOURNEERD") actieKnoppen.push(`<button class="knop" data-actie="status" data-naar="IN_CONTROLE">Start controle</button>`);
    if (d.UL_Status === "SCHADE_VASTGESTELD" && magBehandelen()) actieKnoppen.push(`<button class="knop" data-actie="status" data-naar="AFGESLOTEN">Dossier afsluiten</button>`);
  }
  if (["KLAARGEZET", "UITGELEVERD", "GERETOURNEERD", "IN_CONTROLE", "SCHADE_VASTGESTELD", "AFGESLOTEN"].includes(d.UL_Status))
    actieKnoppen.push(`<button class="knop stil" data-actie="print-ontvangst">Ontvangstbewijs afdrukken</button>`);
  if (["IN_CONTROLE", "SCHADE_VASTGESTELD", "AFGESLOTEN"].includes(d.UL_Status))
    actieKnoppen.push(`<button class="knop stil" data-actie="print-retour">Retourformulier afdrukken</button>`);
  if (magBehandelen() && kan("GEANNULEERD"))
    actieKnoppen.push(`<button class="knop stil" data-actie="annuleren">Annuleren</button>`);

  return `
  <p><a href="#" data-actie="terug">&larr; Terug naar het overzicht</a></p>
  <div class="kaart">
    <div class="dossierkop">
      <div><h2>${esc(d.Title)}</h2><div class="stil-tekst">${esc(d.UL_Aanvrager)} &middot; ${esc(d.UL_Evenement)}</div></div>
      ${statusBadge(d.UL_Status)}
    </div>
    ${d.UL_WeigerReden ? `<div class="melding fout"><b>Reden van weigering of opmerking:</b> ${esc(d.UL_WeigerReden)}</div>` : ""}
    <div class="twee" style="margin-top:12px">
      <dl class="info">
        <dt>Type</dt><dd>${esc(d.UL_TypeAanvrager)}</dd>
        <dt>Contact</dt><dd>${esc(d.UL_Contact)} ${d.UL_Telefoon ? "&middot; " + esc(d.UL_Telefoon) : ""}</dd>
        <dt>E-mail</dt><dd>${esc(d.UL_Email) || "&mdash;"}</dd>
        <dt>Locatie</dt><dd>${esc(d.UL_Locatie) || "&mdash;"}</dd>
        <dt>Periode</dt><dd>${dDatum(d.UL_Van)} tot ${dDatum(d.UL_Tot)}</dd>
        <dt>Wijze</dt><dd>${esc(d.UL_Leveringswijze)}</dd>
      </dl>
      <dl class="info">
        <dt>Huur</dt><dd>${euro(d.UL_Totaal ? d.UL_Huur : kosten.huur)}</dd>
        <dt>Transport</dt><dd>${euro(d.UL_Totaal ? d.UL_Transport : kosten.transport)}</dd>
        <dt>Schade</dt><dd>${euro(d.UL_Schade)}</dd>
        <dt>Boete</dt><dd>${euro(d.UL_Boete)}</dd>
        <dt>Totaal</dt><dd><b>${euro(d.UL_Totaal || kosten.totaal)}</b></dd>
        <dt>Betaling</dt><dd>${esc(d.UL_Betaalstatus) || "&mdash;"}${d.UL_Vervaldag ? `, uiterlijk ${dDatum(d.UL_Vervaldag)}` : ""}</dd>
      </dl>
    </div>
    ${d.UL_Opmerkingen ? `<p class="stil-tekst" style="margin-bottom:0"><b>Opmerkingen:</b> ${esc(d.UL_Opmerkingen)}</p>` : ""}
    <div class="acties">${actieKnoppen.join("")}</div>
  </div>

  <div class="kaart"><h2>Materiaal en voorraadcontrole</h2>
    <div class="tabelwrap"><table>
      <thead><tr><th>Materiaal</th><th class="num">Gevraagd</th><th class="num">Beschikbaar</th>
        <th class="num">${behandelbaar && magBehandelen() ? "Toe te kennen" : "Toegekend"}</th><th>Controle</th></tr></thead>
      <tbody>${check.map((c) => `
        <tr><td>${esc(c.mat.Title)}</td>
          <td class="num">${c.regel.UL_Gevraagd} ${esc(c.mat.UL_Eenheid || "")}</td>
          <td class="num">${c.vrij}</td>
          <td class="num">${behandelbaar && magBehandelen()
            ? `<input type="number" min="0" data-toeken="${c.regel.Id}" value="${c.regel.UL_Toegekend || c.regel.UL_Gevraagd}" style="text-align:right;max-width:90px">`
            : (c.regel.UL_Toegekend || "&mdash;")}</td>
          <td>${c.voldoende ? `<span class="badge b-groen">voldoende</span>`
            : c.bovenLimiet ? `<span class="badge b-warn">boven limiet van ${c.limiet}</span>`
            : `<span class="badge b-rood">tekort</span>`}</td></tr>`).join("")}
      </tbody>
    </table></div>
  </div>

  ${d.UL_Status === "IN_CONTROLE" && magRetour ? schermRetourControle(d) : ""}

  <div class="kaart"><h2>Historiek</h2>
    <pre style="white-space:pre-wrap;font:inherit;font-size:.85rem;color:var(--muted);margin:0">${esc(d.UL_Log || "Nog geen historiek.")}</pre>
  </div>`;
}

function schermRetourControle(d) {
  return `<div class="kaart"><h2>Retourcontrole</h2>
    <p class="stil-tekst">Beoordeel elk materiaal. Kies Schade om een omschrijving en kost in te vullen.
      Bij eigen herstel reken je ${euro(instGetal("EIGEN_HERSTEL_PER_UUR"))} per begonnen uur.</p>
    <div class="rij"><div class="veld"><label>Retourdatum</label><input type="date" id="rc_datum" value="${iso(new Date())}"></div></div>
    <div class="tabelwrap" style="margin-top:8px"><table>
      <thead><tr><th>Materiaal</th><th class="num">Aantal</th><th>Beoordeling</th><th>Omschrijving schade</th><th class="num">Kost</th></tr></thead>
      <tbody>${regelsVan(d.Id).map((r) => `
        <tr><td>${esc(r.Title)}</td><td class="num">${r.UL_Toegekend || r.UL_Gevraagd}</td>
          <td><select data-rcstaat="${r.Id}"><option value="GOED">Goed</option><option value="SCHADE" ${r.UL_Retour === "SCHADE" ? "selected" : ""}>Schade</option></select></td>
          <td><input data-rcopm="${r.Id}" value="${esc(r.UL_RetourOpm || "")}" placeholder="Wat is er beschadigd?"></td>
          <td class="num"><input type="number" min="0" step="0.01" data-rckost="${r.Id}" value="${r.UL_SchadeKost || 0}" style="text-align:right;max-width:100px"></td></tr>`).join("")}
      </tbody>
    </table></div>
    <div class="acties"><button class="knop" data-actie="retour-afronden">Controle afronden</button></div>
  </div>`;
}

function retourAfronden(d) {
  let schade = 0, metSchade = false;
  for (const r of regelsVan(d.Id)) {
    const staat = (zoekVeld("rcstaat", r.Id) || {}).value || "GOED";
    const opm = (zoekVeld("rcopm", r.Id) || {}).value || "";
    const kost = rond2((zoekVeld("rckost", r.Id) || {}).value || 0);
    Object.assign(r, { UL_Retour: staat, UL_RetourOpm: opm, UL_SchadeKost: staat === "SCHADE" ? kost : 0 });
    bewaarWijzig("UL_Regels", r.Id, { UL_Retour: r.UL_Retour, UL_RetourOpm: opm, UL_SchadeKost: r.UL_SchadeKost });
    if (staat === "SCHADE") { metSchade = true; schade += kost; }
  }
  const retourdatum = (document.getElementById("rc_datum") || {}).value || iso(new Date());
  const teLaat = Math.max(0, dagenTussen(d.UL_Tot, retourdatum));
  const boete = rond2(teLaat * instGetal("BOETE_PER_DAG"));
  d.UL_Schade = rond2(schade); d.UL_Boete = boete;
  d.UL_Totaal = rond2((d.UL_Huur || 0) + (d.UL_Transport || 0) + d.UL_Schade + d.UL_Boete);
  const naar = metSchade ? "SCHADE_VASTGESTELD" : "AFGESLOTEN";
  logRegel(d, `Retourcontrole afgerond${metSchade ? `, schade ${euro(schade)}` : ", geen schade"}${teLaat ? `, ${teLaat} dagen te laat, boete ${euro(boete)}` : ""}`);
  d.UL_Status = naar;
  bewaarWijzig("UL_Dossiers", d.Id, { UL_Status: naar, UL_Schade: d.UL_Schade, UL_Boete: d.UL_Boete,
    UL_Totaal: d.UL_Totaal, UL_Log: d.UL_Log });
  render();
}

/* Behandel-acties met invoer. */
function actieGoedkeuren(d) {
  for (const r of regelsVan(d.Id)) {
    const inp = zoekVeld("toeken", r.Id);
    const aantal = inp ? Math.max(0, parseInt(inp.value, 10) || 0) : r.UL_Gevraagd;
    const mat = materiaal(r.UL_MateriaalId);
    r.UL_Toegekend = aantal; r.UL_Deelbedrag = rond2(aantal * ((mat && mat.UL_Huurtarief) || 0));
    bewaarWijzig("UL_Regels", r.Id, { UL_Toegekend: aantal, UL_Deelbedrag: r.UL_Deelbedrag });
  }
  zetStatus(d, "GOEDGEKEURD", "Aanvraag goedgekeurd na voorraadcontrole");
  render();
}
function actieBevestigen(d) {
  const kosten = berekenKosten(d);
  const vervaldag = new Date(d.UL_Van); vervaldag.setDate(vervaldag.getDate() - instGetal("BETALING_DAGEN_VOOR"));
  d.UL_Huur = kosten.huur; d.UL_Transport = kosten.transport; d.UL_Totaal = kosten.totaal;
  d.UL_Betaalstatus = "Open"; d.UL_Vervaldag = iso(vervaldag);
  logRegel(d, `Bevestigd, totaal ${euro(kosten.totaal)}, te betalen voor ${dDatum(vervaldag)}`);
  d.UL_Status = "BEVESTIGD";
  bewaarWijzig("UL_Dossiers", d.Id, { UL_Status: "BEVESTIGD", UL_Huur: d.UL_Huur, UL_Transport: d.UL_Transport,
    UL_Totaal: d.UL_Totaal, UL_Betaalstatus: "Open", UL_Vervaldag: d.UL_Vervaldag, UL_Log: d.UL_Log });
  render();
}
function vraagReden(titel, plaats, klaar) {
  openModal(`<h2 style="margin-top:0">${esc(titel)}</h2>
    <div class="veld"><label>${esc(plaats)}</label><textarea id="md_reden"></textarea></div>
    <div class="acties"><button class="knop" data-actie="modal-ok">Bevestigen</button>
    <button class="knop stil" data-actie="modal-weg">Terug</button></div>`);
  S.modalKlaar = klaar;
}

/* ── Scherm: catalogus ────────────────────────────────────────────────── */
function schermCatalogus() {
  const magBewerken = magIk("ADMIN", "BEHEERDER");
  const rijen = [...S.data.UL_Materialen].sort((a, b) => (a.UL_Categorie + a.Title).localeCompare(b.UL_Categorie + b.Title));
  return `
  <div class="kaart">
    <div class="dossierkop"><h2 style="font-family:inherit">Materiaalcatalogus</h2>
      <div class="acties" style="margin:0">
        <button class="knop stil" data-actie="excel-stock">Stocklijst (Excel)</button>
        ${magBewerken ? `<button class="knop" data-actie="mat-nieuw">Nieuw materiaal</button>` : ""}
      </div></div>
    ${!rijen.length && magBewerken ? `<div class="melding info">De catalogus is leeg.
      <button class="knop klein" data-actie="mat-seed">Vul met de startcatalogus van de uitleendienst</button></div>` : ""}
    <div class="tabelwrap" style="margin-top:10px"><table>
      <thead><tr><th>Materiaal</th><th>Categorie</th><th class="num">Totaal</th><th class="num">Huur</th>
        <th class="num">Transport</th><th>Status</th>${magBewerken ? "<th></th>" : ""}</tr></thead>
      <tbody>${rijen.map((m) => `
        <tr style="${m.UL_Actief ? "" : "opacity:.5"}">
          <td>${esc(m.Title)}${m.UL_Capaciteitslimiet ? `<div class="stil-tekst">max ${m.UL_Capaciteitslimiet} per aanvrager</div>` : ""}</td>
          <td>${esc(m.UL_Categorie)}</td>
          <td class="num">${m.UL_Totaal} ${esc(m.UL_Eenheid || "")}</td>
          <td class="num">${m.UL_Huurtarief ? euro(m.UL_Huurtarief) : "gratis"}</td>
          <td class="num">${m.UL_Transporttarief ? euro(m.UL_Transporttarief) : (m.UL_TransportVereist ? "vereist" : "&mdash;")}</td>
          <td><span class="badge ${m.UL_Actief ? "b-groen" : "b-grijs"}">${m.UL_Actief ? "actief" : "inactief"}</span></td>
          ${magBewerken ? `<td style="white-space:nowrap">
            <button class="knop klein stil" data-actie="mat-bewerk" data-id="${m.Id}">Bewerken</button>
            <button class="knop klein stil" data-actie="mat-wissel" data-id="${m.Id}">${m.UL_Actief ? "Deactiveren" : "Activeren"}</button></td>` : ""}
        </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}
function matFormulier(m) {
  const w = (v, d) => esc(v == null ? (d == null ? "" : d) : v);
  openModal(`<h2 style="margin-top:0">${m ? "Materiaal bewerken" : "Nieuw materiaal"}</h2>
    <input type="hidden" id="mf_id" value="${m ? m.Id : ""}">
    <div class="veld"><label>Naam *</label><input id="mf_naam" value="${w(m && m.Title)}"></div>
    <div class="rij">
      <div class="veld" style="flex:1"><label>Categorie</label><select id="mf_cat">${CATEGORIEEN.map((c) =>
        `<option ${m && m.UL_Categorie === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="veld"><label>Eenheid</label><input id="mf_eenheid" value="${w(m && m.UL_Eenheid, "stuk")}" style="max-width:110px"></div>
    </div>
    <div class="rij">
      <div class="veld"><label>Totaal aantal</label><input id="mf_totaal" type="number" min="0" value="${w(m && m.UL_Totaal, 0)}"></div>
      <div class="veld"><label>Huurtarief (euro)</label><input id="mf_huur" type="number" min="0" step="0.01" value="${w(m && m.UL_Huurtarief, 0)}"></div>
      <div class="veld"><label>Transporttarief (euro)</label><input id="mf_transport" type="number" min="0" step="0.01" value="${w(m && m.UL_Transporttarief, 0)}"></div>
    </div>
    <div class="rij">
      <div class="veld"><label>Transport vereist</label><select id="mf_tv"><option value="1" ${!m || m.UL_TransportVereist ? "selected" : ""}>ja</option><option value="0" ${m && !m.UL_TransportVereist ? "selected" : ""}>nee</option></select></div>
      <div class="veld"><label>Limiet per aanvrager</label><input id="mf_limiet" type="number" min="0" value="${w(m && m.UL_Capaciteitslimiet)}"></div>
    </div>
    <div class="acties"><button class="knop" data-actie="mat-bewaar">Bewaren</button>
      <button class="knop stil" data-actie="modal-weg">Terug</button></div>`);
}
function matBewaar() {
  const w = (id) => (document.getElementById(id) || {}).value;
  const naam = (w("mf_naam") || "").trim();
  if (!naam) return;
  const body = { Title: naam, UL_Categorie: w("mf_cat"), UL_Eenheid: w("mf_eenheid") || "stuk",
    UL_Totaal: +w("mf_totaal") || 0, UL_Huurtarief: +w("mf_huur") || 0, UL_Transporttarief: +w("mf_transport") || 0,
    UL_TransportVereist: +w("mf_tv") || 0, UL_Capaciteitslimiet: w("mf_limiet") ? +w("mf_limiet") : null };
  const id = w("mf_id");
  if (id) bewaarWijzig("UL_Materialen", +id, body);
  else bewaarNieuw("UL_Materialen", Object.assign({ UL_Actief: 1, UL_Omschrijving: "" }, body));
  sluitModal(); render();
}

/* ── Scherm: beheer (instellingen en rollen) ──────────────────────────── */
function schermBeheer() {
  const instell = STANDAARD_INSTELLINGEN.map(([sleutel, std, oms]) => {
    const rij = S.data.UL_Instellingen.find((r) => r.Title === sleutel);
    return { sleutel, oms, waarde: rij ? rij.UL_Waarde : std, id: rij ? rij.Id : null };
  });
  const rollen = S.data.UL_Instellingen.filter((r) => (r.Title || "").startsWith("ROL:"));
  return `
  <div class="kaart"><h2>Tarieven en termijnen</h2>
    <div class="tabelwrap"><table>
      <thead><tr><th>Instelling</th><th style="width:160px">Waarde</th></tr></thead>
      <tbody>${instell.map((i) => `<tr><td>${esc(i.oms)}<div class="stil-tekst">${esc(i.sleutel)}</div></td>
        <td><input data-inst="${esc(i.sleutel)}" value="${esc(i.waarde)}"></td></tr>`).join("")}</tbody>
    </table></div>
    <div class="acties"><button class="knop" data-actie="inst-bewaar">Instellingen bewaren</button></div>
  </div>
  <div class="kaart"><h2>Rollen per medewerker</h2>
    ${!rollen.length ? `<div class="melding let">Er zijn nog geen rollen ingesteld. Zolang dat zo is, kan iedereen met toegang tot deze site alles.
      Voeg jezelf eerst toe als Beheerder, anders sluit je jezelf uit.</div>` : ""}
    <div class="tabelwrap"><table>
      <thead><tr><th>E-mailadres</th><th>Rollen</th><th></th></tr></thead>
      <tbody>${rollen.map((r) => `<tr><td>${esc(r.Title.slice(4))}</td>
        <td>${String(r.UL_Waarde || "").split(",").map((x) => `<span class="badge b-geel">${esc(ROL_LABELS[x.trim()] || x)}</span>`).join(" ")}</td>
        <td style="white-space:nowrap"><button class="knop klein stil" data-actie="rol-bewerk" data-id="${r.Id}">Bewerken</button>
          <button class="knop klein stil" data-actie="rol-weg" data-id="${r.Id}">Verwijderen</button></td></tr>`).join("")}
      </tbody>
    </table></div>
    <div class="acties"><button class="knop" data-actie="rol-nieuw">Medewerker toevoegen</button>
      <button class="knop stil" data-actie="excel-facturatie">Facturatiegegevens (Excel)</button></div>
  </div>`;
}
function rolFormulier(rij) {
  const huidige = rij ? String(rij.UL_Waarde || "").split(",").map((s) => s.trim()) : [];
  openModal(`<h2 style="margin-top:0">${rij ? "Rollen bewerken" : "Medewerker toevoegen"}</h2>
    <input type="hidden" id="rf_id" value="${rij ? rij.Id : ""}">
    <div class="veld"><label>E-mailadres van het gemeente-account *</label>
      <input id="rf_email" type="email" value="${rij ? esc(rij.Title.slice(4)) : ""}" ${rij ? "readonly" : ""}></div>
    <div class="veld"><label>Rollen</label>
      ${Object.entries(ROL_LABELS).map(([k, v]) => `<label style="font-weight:400;display:flex;gap:8px;align-items:center">
        <input type="checkbox" style="width:auto;min-height:0" data-rfrol="${k}" ${huidige.includes(k) ? "checked" : ""}> ${v}</label>`).join("")}
    </div>
    <div class="acties"><button class="knop" data-actie="rol-bewaar">Bewaren</button>
      <button class="knop stil" data-actie="modal-weg">Terug</button></div>`);
}
function rolBewaar() {
  const email = ((document.getElementById("rf_email") || {}).value || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return;
  const rollen = [...document.querySelectorAll("[data-rfrol]:checked")].map((c) => c.dataset.rfrol).join(",");
  const id = (document.getElementById("rf_id") || {}).value;
  if (id) bewaarWijzig("UL_Instellingen", +id, { UL_Waarde: rollen });
  else bewaarNieuw("UL_Instellingen", { Title: "ROL:" + email, UL_Waarde: rollen, UL_Omschrijving: "Rollen van deze medewerker" });
  sluitModal(); bepaalRollen(); render();
}
function instBewaar() {
  for (const inp of document.querySelectorAll("[data-inst]")) {
    const sleutel = inp.dataset.inst, waarde = inp.value;
    const rij = S.data.UL_Instellingen.find((r) => r.Title === sleutel);
    if (rij) { if (rij.UL_Waarde !== waarde) bewaarWijzig("UL_Instellingen", rij.Id, { UL_Waarde: waarde }); }
    else {
      const std = STANDAARD_INSTELLINGEN.find((x) => x[0] === sleutel);
      bewaarNieuw("UL_Instellingen", { Title: sleutel, UL_Waarde: waarde, UL_Omschrijving: std ? std[2] : "" });
    }
  }
  render();
}
