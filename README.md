# Uitleendienst Londerzeel

Stockbeheer- en beheersysteem voor de uitleendienst van de gemeente Londerzeel. Eén webapplicatie
met een **publiek e-formulier** voor aanvragers en een **backoffice** voor de dienst, gebouwd op basis
van de functionele analyse (5-fasen workflow, statusmodel, datamodel, bedrijfsregels en tarieven uit
het uitleen- en retributiereglement).

## Technologie

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Prisma ORM** met **SQLite** (lokaal ontwikkelen; eenvoudig te migreren naar PostgreSQL)
- **Tailwind CSS** in de huisstijl van Londerzeel (accentkleur geel `#FBBB16`)
- Lichte, sessie-gebaseerde authenticatie met rolgebaseerde toegang

## Snel starten

```bash
npm install
cp .env.example .env      # DATABASE_URL en SESSION_SECRET staan al goed voor lokaal gebruik
npm run setup             # prisma generate + db push + seed (catalogus, gebruikers, voorbeelddossier)
npm run dev               # start op http://localhost:3000
```

> `npm run setup` maakt de databank aan en vult ze met de materiaalcatalogus, de configuratie
> (tarieven/termijnen), de gebruikers per rol en één voorbeelddossier.

> **Niet-technische gebruiker?** Zie **[HANDLEIDING.md](./HANDLEIDING.md)** voor een stap-voor-stap
> uitleg (Windows en Mac) om de demoversie lokaal te draaien.

### Handige scripts

| Script | Doel |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` / `npm start` | Productiebuild en -start |
| `npm run typecheck` | TypeScript-controle |
| `npm run db:seed` | (Her)vul de databank met basisdata |
| `npm run db:reset` | Databank leegmaken en opnieuw seeden |
| `npm run db:studio` | Prisma Studio (databank-inspectie) |

## Demo-aanmeldingen

Publiek gedeelte (`/aanvraag`, `/catalogus`) vereist geen aanmelding. De backoffice (`/backoffice`)
wel. Wachtwoord voor alle demo-accounts: **`londerzeel`**.

| E-mail | Rollen |
|---|---|
| admin@londerzeel.be | Admin Openbaar Domein + Beheerder |
| ploegbaas@londerzeel.be | Ploegbaas Dienst Gebouwen |
| technisch@londerzeel.be | Technisch medewerker |
| magazijn@londerzeel.be | Magazijnier |
| beheerder@londerzeel.be | Beheerder |
| beleid@londerzeel.be | Beleid (lezer) |

## Functionaliteit (fase 1 + 2)

**Fase 1 — kern (MVP)**
- Publiek e-formulier met aanvrager-, contact- en evenementgegevens, materiaalselectie en
  levering/afhaling; termijnvalidatie (min. 4 weken, max. 1 jaar; uitleentermijn max. 7 dagen).
- Automatisch referentienummer (`UL-JJJJ-NNNN`), ontvangstbevestiging en dossier met status *Ingediend*.
- Backoffice-werklijst met filters, dossierdetail met tabbladen.
- Behandelingsmodule met **stock- en capaciteitscheck**, goedkeuren (met toegekende aantallen en
  reservaties) / weigeren met reden / info opvragen; volledig statusmodel.
- Materiaalbeheer (catalogus met tarieven, capaciteitslimieten, transport).

**Fase 2 — uitvoering**
- Beschikbaarheidskalender / stockoverzicht met bezettingsgraad per periode.
- Planning & werkopdrachten met toewijzing aan medewerkers en Top-desk-referentie.
- Ontvangstbewijs (met handtekeningen) en retourformulier met schaderegistratie en automatische
  boete bij laattijdige retour; kosten stromen door naar de factuur.
- Bevestiging met kostenoverzicht en factuurgegevens; betaalopvolging.

**Beheer**
- Configureerbare tarieven en termijnen (bedrijfsregels), gebruikers en rollen — zonder code-aanpassing.

## Projectstructuur

```
prisma/
  schema.prisma        # datamodel (entiteiten uit de functionele analyse)
  seed.ts              # basisdata: config, gebruikers, catalogus, voorbeelddossier
src/
  lib/                 # domein (statussen/rollen), auth, config, berekening, beschikbaarheid
  components/          # gedeelde UI (logo, badge, navigatie)
  app/
    page.tsx           # publieke landingspagina
    aanvraag/          # publiek e-formulier + ontvangstbevestiging
    catalogus/         # publiek materiaaloverzicht
    login/ logout/     # authenticatie
    backoffice/        # dashboard, dossiers, kalender, planning, retour, catalogus, beheer
```

## Aandachtspunten & aannames

Enkele punten uit de functionele analyse zijn als **configureerbare aanname** geïmplementeerd en
kunnen door de dienst gevalideerd/aangepast worden:

- **Transportberekening**: het forfait (€ 50) wordt bij levering één keer aangerekend, plus eventuele
  materiaal-specifieke transporttarieven (bv. chalets € 75). Exacte regel te bevestigen.
- **Onderhoud/beschikbaarheid**: materiaal in onderhoud telt als één exemplaar uit circulatie per record.
- **Digitale handtekening**: momenteel als naamvastlegging; keuze tussen handtekening op scherm of
  externe dienst staat open.
- **Integraties** (Top-desk, financieel pakket, evenementenloket, SMTP): voorzien in het datamodel
  (o.a. Top-desk-referentie, factuurgegevens, notificatie-logboek) maar nog niet effectief gekoppeld.

## Productie

Voor productie: zet `DATABASE_URL` naar een PostgreSQL-verbinding, wijzig de `provider` in
`prisma/schema.prisma` naar `postgresql`, stel een sterke `SESSION_SECRET` in, en draai
`prisma migrate deploy`.
