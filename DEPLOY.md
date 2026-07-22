# Online zetten op Vercel (deelbare link)

Deze handleiding zet de applicatie online op **Vercel** met een **gratis PostgreSQL-databank**,
zodat je collega's ze kunnen gebruiken via een gewone link — zonder iets te installeren en zonder
GitHub-account. Reken op ongeveer 15 minuten.

De code is al voorbereid: bij een deploy schakelt de app automatisch over van SQLite (lokaal) naar
PostgreSQL (productie) en vult ze de databank met de catalogus, de gebruikers en een voorbeelddossier.

---

## Wat je nodig hebt

- De code op GitHub (staat klaar op de tak **`main`** van `KristofSablon/Stockbeheer-uitleendienst`).
- Een **Vercel-account** — gratis, aanmelden kan met je GitHub-account.

---

## Stap 1 — Aanmelden bij Vercel

1. Ga naar **https://vercel.com** en klik **Sign Up** (of **Log In**).
2. Kies **Continue with GitHub** en geef Vercel toegang.

## Stap 2 — Het project importeren

1. Klik in Vercel op **Add New…** → **Project**.
2. Zoek de repository **Stockbeheer-uitleendienst** in de lijst en klik **Import**.
   - Ziet u de repo niet? Klik **Adjust GitHub App Permissions** en geef Vercel toegang tot deze repo.
3. Vercel herkent automatisch dat het een **Next.js**-project is. **Klik nog niet op Deploy** —
   eerst de databank (stap 3).

## Stap 3 — Een PostgreSQL-databank koppelen

De app heeft in productie een databank nodig. Vercel biedt er gratis een aan (Neon).

1. Open (in een nieuw tabblad) in Vercel het tabblad **Storage** → **Create Database**.
2. Kies **Postgres** (powered by Neon) → **Continue** → geef een naam → **Create**.
3. Klik **Connect Project** en kies je pas geïmporteerde project **Stockbeheer-uitleendienst**
   (omgeving: **Production**, en gerust ook Preview/Development).

Hierdoor stelt Vercel automatisch de nodige variabelen in
(`POSTGRES_PRISMA_URL` en `POSTGRES_URL_NON_POOLING`) — die hoef je niet zelf in te vullen.

## Stap 4 — De geheime sleutel instellen

1. Ga naar je project → **Settings** → **Environment Variables**.
2. Voeg toe:
   - **Name:** `SESSION_SECRET`
   - **Value:** een lange, willekeurige tekst (bv. 30+ willekeurige tekens)
   - **Environments:** vink **Production** (en Preview) aan
3. Klik **Save**.

## Stap 5 — Deployen

1. Ga naar het tabblad **Deployments** van je project.
2. Klik **Deploy** (of, als er al een mislukte poging staat: **Redeploy** — nu de databank
   gekoppeld is, slaagt hij).
3. Wacht enkele minuten. Tijdens de build maakt de app automatisch de databanktabellen aan en vult
   ze de basisgegevens.

## Stap 6 — De link delen

Na een geslaagde deploy krijg je een adres zoals:

> **https://stockbeheer-uitleendienst.vercel.app**

Dat is je deelbare link. **Iedereen met de link** kan:
- het publieke gedeelte gebruiken (`/aanvraag`, `/catalogus`);
- aanmelden in de backoffice met de demo-accounts (**admin@londerzeel.be** / `londerzeel`).

Elke nieuwe push naar `main` zorgt automatisch voor een nieuwe deploy.

---

## Belangrijk vóór je dit breed deelt

- Dit is een **demo/prototype** met een openbare link en standaard demo-wachtwoorden. Zet er **geen
  echte persoonsgegevens** op zolang het een demo is.
- Wil je het afschermen? Wijzig de wachtwoorden van de gebruikers (via **Beheer & configuratie** in
  de app), of zet in Vercel **Deployment Protection** aan (**Settings → Deployment Protection**) zodat
  enkel mensen met een wachtwoord/aanmelding de site kunnen openen.
- De gratis Postgres-databank (Neon) valt bij inactiviteit in slaap; de eerste keer laden kan dan
  enkele seconden trager zijn. Dat is normaal.

## Problemen oplossen

- **Build mislukt met "Geen PostgreSQL-verbinding gevonden" of "Environment variable not found"** →
  er is nog geen Postgres-databank gekoppeld aan het project. Doe stap 3 (Storage → Create Database →
  Connect Project) en klik dan **Redeploy**. De build herkent automatisch de databank-variabelen,
  ongeacht hun exacte naam (Vercel Postgres én de Neon-integratie worden ondersteund).
- **Kan niet aanmelden na deploy** → controleer dat `SESSION_SECRET` is ingesteld (stap 4) en
  redeploy.
- **Ik zie de repo niet in Vercel** → **Add New → Project → Adjust GitHub App Permissions** en geef
  toegang tot `Stockbeheer-uitleendienst`.

## Hoe het technisch werkt (ter info)

- Lokaal gebruikt de app **SQLite** (`prisma/schema.prisma`).
- Op Vercel draait het script **`vercel-build`** (in `package.json`): het genereert een
  PostgreSQL-versie van het schema (`scripts/gen-prod-schema.mjs`), maakt de tabellen aan
  (`prisma db push`), vult de basisdata (`prisma/seed.ts`) en bouwt daarna de Next.js-app.
- Het datamodel staat dus op één plek; enkel de databank verschilt tussen lokaal en productie.
