# Onderzoek — Uitleendienst in SharePoint / Power Platform

> Haalbaarheidsanalyse voor een low-code herbouw van de uitleendienst-applicatie binnen de
> Microsoft-omgeving van de gemeente (SharePoint, Power Apps, Power Automate).
> Opgesteld ter bespreking met de IT-dienst. Status: ontwerp, augustus 2026.

## 1. Samenvatting

"In SharePoint ontwikkelen" betekent in de praktijk bouwen met het **Microsoft Power Platform**:
SharePoint-lijsten of Dataverse voor de gegevens, Power Apps voor de schermen, Power Automate voor
de workflows en notificaties, Power BI voor de rapportage. Dat kan — het grootste deel van de
functionele analyse is er in uit te drukken — maar er zijn **twee fundamentele knelpunten** die de
keuze bepalen:

1. **De aanvrager is extern.** Verenigingen hebben geen gemeente-account. Power Apps is enkel
   bruikbaar voor interne, gelicentieerde gebruikers. Het publieke e-formulier kan dus **niet** in
   Power Apps; daarvoor is Power Pages (extern portaal, extra licentiekost), een sterk vereenvoudigd
   Microsoft Forms, of het behoud van het huidige publieke webformulier nodig.
2. **De beschikbaarheidslogica is echte rekenlogica.** Voorraad per materiaal berekenen over
   overlappende datumperiodes (reservaties + onderhoud + capaciteitslimieten) is de moeilijkste
   module. In SharePoint-lijsten loopt dit tegen structurele grenzen aan; in Dataverse kan het,
   maar het blijft maatwerk-configuratie.

**Advies in het kort:** een low-code herbouw is haalbaar als de gemeente kiest voor de
**Dataverse-route** (professioneel, maar met licentiekosten) en het publieke formulier oplost via
Power Pages óf door het huidige publieke formulier te behouden. De eenvoudige route met enkel
SharePoint-lijsten is gratis binnen M365 maar levert een merkbaar beperktere oplossing op.
Daarnaast bestaat een derde optie die de drie aangehaalde motieven (eigen Microsoft-omgeving,
bereikbaar via SharePoint, beheersbaar voor IT) óók afdekt zonder herbouw: de bestaande app hosten
op **Azure binnen de eigen tenant** met aanmelding via het gemeente-account (Entra ID) en een
koppeling in SharePoint. Zie §7.

## 2. Wat "in SharePoint ontwikkelen" concreet inhoudt

| Bouwsteen | Rol in de oplossing |
|---|---|
| **SharePoint-lijsten** of **Dataverse** | De databank: aanvragen, materialen, reservaties, … |
| **Power Apps** (canvas of model-driven) | De backoffice-schermen voor medewerkers |
| **Power Pages** | Publiek/extern portaal voor de aanvrager (aparte licentie) |
| **Power Automate** | Workflows: statusovergangen, e-mails, herinneringen, documenten |
| **Power BI** | Dashboards en beleidsrapportage |
| **Microsoft 365-groepen / Entra ID** | Rollen en rechten voor medewerkers (SSO inbegrepen) |

Ontwikkeling gebeurt via klik-configuratie in Power Apps Studio binnen jullie eigen tenant — niet
via klassieke code. Dat is meteen de belangrijkste beheerswinst (IT-vertrouwd, geen hosting) én de
belangrijkste beperking (minder fijnmazige logica en vormgeving).

## 3. Twee architectuurvarianten

### Variant A — SharePoint-lijsten + canvas-app (binnen bestaande M365-licenties)

Gegevens in SharePoint-lijsten, één canvas-app voor de backoffice, flows voor e-mails.

- ✅ Geen extra licentiekosten (valt onder M365 E3/G3); vertrouwd voor IT.
- ⚠️ SharePoint-lijsten zijn geen relationele databank: opzoekkolommen i.p.v. echte relaties,
  geen transactionele integriteit (dubbele boekingen bij gelijktijdig gebruik zijn mogelijk),
  delegatie-/weergavegrenzen (±5.000 items) die berekeningen over reservaties bemoeilijken.
- ⚠️ Het volledige statusmodel (14 statussen met toegelaten overgangen) moet met flows en
  app-logica nagebouwd en bewaakt worden.
- ❌ Geen publiek formulier: Microsoft Forms kan de materiaalselectie met aantallen, live
  beschikbaarheid en termijnvalidatie niet aan; een externe aanvrager kan niet in de canvas-app.

**Geschikt voor:** een vereenvoudigde interne versie (aanvragen komen binnen via e-mail/Forms en
worden manueel overgetypt) — een stap terug t.o.v. de huidige functionele analyse.

### Variant B — Dataverse + model-driven app + Power Pages (premium)

Gegevens in Dataverse (echte relationele tabellen), een model-driven app voor de backoffice,
Power Pages voor het publieke aanvraagformulier.

- ✅ Het datamodel uit de functionele analyse (15 entiteiten met relaties) past vrijwel één-op-één
  op Dataverse-tabellen; rollen/rechten fijnmazig regelbaar; auditlog ingebouwd.
- ✅ Extern portaal mogelijk (Power Pages) met de huisstijl van de gemeente.
- ⚠️ De beschikbaarheids-/stockcheck blijft maatwerk (berekende rollups, flows of een kleine
  plug-in); haalbaar maar het meest complexe deel van de bouw.
- ⚠️ Licentiekosten (zie §5) en afhankelijkheid van een ervaren Power Platform-configurator;
  dit is geen "even klikken".

**Geschikt voor:** een volwaardige herbouw die de functionele analyse grotendeels dekt.

## 4. Module-per-module haalbaarheid

| Module (functionele analyse) | SharePoint-lijsten (A) | Dataverse (B) | Toelichting |
|---|---|---|---|
| M1 Publiek e-formulier | ❌ | ✅ via Power Pages | Grootste knelpunt in A |
| M2 Behandeling + werklijst | ✅ | ✅ | Kern van Power Apps, goed haalbaar |
| M3 Stock & beschikbaarheid per periode | ⚠️ beperkt | ⚠️ maatwerk | Overlappende periodes = moeilijkste stuk |
| M4 Planning & werkopdrachten | ✅ | ✅ | Goed haalbaar; Teams-integratie zelfs een plus |
| M5 Tarifering & facturatie-aanzet | ⚠️ | ✅ | Rekenlogica in flows/Power Fx |
| M6 Documenten (ontvangstbewijs/retour) | ⚠️ | ✅ | Word-sjabloon → PDF via Power Automate |
| M7 Schadebeheer | ✅ | ✅ | Goed haalbaar |
| M8 Onderhoud & keuring | ✅ | ✅ | Goed haalbaar |
| M9 Notificaties & sjablonen | ✅ | ✅ | Sterk punt van Power Automate |
| M10 Rapportage & dashboard | ✅ Power BI | ✅ Power BI | Sterk punt |
| M11 Beheer & configuratie | ⚠️ | ✅ | Tarieven/termijnen als configuratietabel |
| Digitale handtekening | ❌ | ⚠️ | Pen-invoer in Power Apps kan; extern portaal beperkter |
| Statusmodel met bewaakte overgangen | ⚠️ | ✅ | In A volledig zelf te bewaken |

## 5. Kostenindicatie licenties (indicatief, aug. 2026)

| Post | Variant A | Variant B |
|---|---|---|
| Interne medewerkers (±7) | € 0 (binnen M365) | Power Apps Premium ± **$20/gebruiker/maand** → ± $140/maand |
| Publiek formulier | n.v.t. | Power Pages: geauthenticeerde gebruikers ± **$200/maand per 100 gebruikers**; anonieme bezoekers goedkoper (capaciteitstiers) |
| Hosting/onderhoud | € 0 | € 0 (inbegrepen in platform) |

> Prijzen wijzigen regelmatig en gemeenten hebben vaak kortingen via hun Microsoft-overeenkomst —
> laat IT dit aftoetsen. Sinds januari 2026 is het goedkopere "per app"-plan ($5) geschrapt uit de
> licentiegids, wat de drempel voor variant B verhoogt.

## 6. Wat je wint en verliest t.o.v. de gebouwde webapp

**Winst:** beheer volledig binnen M365 · aanmelden met gemeente-account (SSO) vanzelf geregeld ·
vindbaar in SharePoint/Teams · Power BI-rapportage · geen aparte hosting of updates.

**Verlies:** het publieke formulier zonder login (drempelloos voor verenigingen) · de exacte
huisstijl en gebruikservaring · fijnmazige bedrijfslogica (stockcheck, statusmodel) wordt
configuratie-maatwerk · versiebeheer/testbaarheid zoals in git · en de reeds gebouwde, werkende
applicatie wordt grotendeels niet hergebruikt — een herbouw is een nieuw project (weken tot
maanden configuratiewerk), geen migratie.

## 7. Derde optie: de bestaande app binnen de Microsoft-omgeving brengen

De drie aangehaalde motieven kunnen ook zonder herbouw worden ingevuld:

1. **Hosting in eigen Microsoft-omgeving:** de app op **Azure App Service** in de tenant van de
   gemeente (kost ± €15–50/maand, geen licenties per gebruiker), met de databank op Azure
   Database for PostgreSQL.
2. **Aanmelden met gemeente-account:** de login vervangen door **Entra ID (SSO)** — technisch een
   beperkte aanpassing aan de bestaande app; rollen koppelen aan M365-groepen.
3. **Bereikbaar vanuit SharePoint:** een tegel/link op het intranet of insluiten als
   SharePoint-pagina; voor medewerkers voelt dit hetzelfde als een interne toepassing.

Dit behoudt het publieke formulier, de huisstijl en alle gebouwde functionaliteit, en vergt van IT
enkel standaard Azure-beheer. Het is de snelste weg naar "in onze Microsoft-omgeving".

## 8. Advies en beslispad

1. **Leg deze analyse voor aan IT** met de twee kernvragen: (a) is er budget/bereidheid voor
   Power Apps Premium + Power Pages (variant B)? (b) is Azure-hosting in de eigen tenant een
   aanvaardbaar alternatief (§7)?
2. **Kiest IT voor low-code:** neem variant B (Dataverse). Bouw gefaseerd zoals de functionele
   analyse voorschrijft (eerst dossierbeheer + catalogus, dan uitvoering, dan financieel) en los
   het publieke formulier op via Power Pages — of behoud tijdelijk het huidige webformulier dat
   aanvragen via e-mail/koppeling aanlevert.
3. **Kiest IT voor behoud + Azure (§7):** dan is de volgende stap Entra ID-aanmelding toevoegen en
   een Azure-omgeving opzetten; de functionaliteit staat er al.

## 9. Wat vanuit dit project kan worden aangeleverd

De low-code bouw zelf is klik-configuratie in jullie tenant en kan niet vanaf hier worden
uitgevoerd; het **volledige bouwpakket** wél:

- Exacte **tabeldefinities** voor Dataverse of SharePoint-lijsten, afgeleid uit het bestaande
  datamodel (`prisma/schema.prisma` — 15 entiteiten, velden en relaties).
- **CSV-export van de materiaalcatalogus** (tarieven, aantallen, categorieën) voor rechtstreekse
  import.
- **Flow-ontwerpen** per notificatie en statusovergang (trigger → conditie → actie), en de
  **rekenregels** voor tarifering en boetes als Power Fx-formules.
- Het **statusmodel** met toegelaten overgangen als beslistabel.
- Voor §7: de aanpassing van de app naar Entra ID-aanmelding en een Azure-deployhandleiding.
