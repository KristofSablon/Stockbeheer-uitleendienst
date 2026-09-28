# SharePoint-app van de uitleendienst

Eén zelfstandig bestand, `Uitleendienst-app.aspx`, dat in een SharePoint-documentbibliotheek
draait. Bij de eerste opening door een sitebeheerder maakt de pagina zelf haar vier lijsten aan
(`UL_Materialen`, `UL_Dossiers`, `UL_Regels`, `UL_Instellingen`) en daarna is ze de volledige
toepassing: aanvragen invoeren en behandelen met voorraadcontrole, kosten en betaling, uitvoering
en retour met schade, catalogus, rollen en instellingen, afdrukbare documenten en Excel-exports.

## Bouwen

```
python3 build.py
```

Dat voegt `shell.html`, `app1.js` tot en met `app4.js` en de ingesloten bibliotheek
`lib/xlsx.mini.min.js` samen tot `Uitleendienst-app.aspx`.

- `shell.html`: opmaak en huisstijl, met plaatshouders `/*XLSX*/` en `/*APPJS*/`
- `app1.js`: vaste gegevens, hulpjes, SharePoint-adapter en demo-adapter
- `app2.js`: toestand, schrijfwachtrij, rollen, berekeningen en het overzicht
- `app3.js`: invoerschermen (nieuwe aanvraag, dossier, catalogus, beheer)
- `app4.js`: beschikbaarheid, documenten, Excel, installatie en gebeurtenissen

## Demo-modus

Open het bestand buiten SharePoint, of voeg `?demo` toe aan het adres, en de app draait met
voorbeeldgegevens in localStorage. Handig om te tonen en te testen zonder tenant.

## Installatie in SharePoint

1. Upload `Uitleendienst-app.aspx` naar een bibliotheek van de site, bijvoorbeeld Siteactiva.
2. Laat een **sitebeheerder** de pagina een eerste keer openen; die aanmaak van lijsten vraagt
   beheerrechten. Gewone leden krijgen tot dan een nette uitleg in plaats van een fout.
3. Voorwaarde: **aangepaste scripting** moet aanstaan op de site (instelling van de
   tenantbeheerder), anders wordt het bestand gedownload in plaats van getoond.
4. Rollen stel je in via het tabblad Beheer, op e-mailadres van het gemeente-account.
5. Een nieuwe versie zet je live door het bestand te overschrijven; de gegevens blijven staan.

De tests draaien met Playwright tegen een nagebootste SharePoint (REST-API in het geheugen),
inclusief de rechtenscenario's en de demo op tablet- en telefoonformaat.
