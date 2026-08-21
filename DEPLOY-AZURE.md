# Uitrollen op Azure met gemeente-account (Entra ID) en SharePoint-koppeling

Dit is het bouwpakket voor **optie 3** uit `docs/ONDERZOEK-SHAREPOINT.md`: de bestaande applicatie
hosten in de **eigen Microsoft-omgeving** (Azure-tenant van de gemeente), medewerkers laten
**aanmelden met hun gemeente-account** (Microsoft Entra ID, SSO), en de app **bereikbaar maken
vanuit SharePoint**. De code is er al klaar voor — dit document beschrijft de configuratie die de
IT-dienst eenmalig uitvoert (± 1 à 2 uur).

**Overzicht van de onderdelen:**

| Onderdeel | Wat | Kost (indicatief) |
|---|---|---|
| Azure App Service (Linux, Node 22) | Draait de webapp | B1-plan ± €12/maand |
| Azure Database for PostgreSQL Flexible Server | De databank | B1ms burstable ± €15/maand |
| Entra ID app-registratie | Aanmelden met gemeente-account | € 0 |
| GitHub Actions | Automatische deploy bij elke wijziging | € 0 |
| SharePoint-tegel/link | Vindbaarheid voor medewerkers | € 0 |

---

## Stap 1 — Entra ID app-registratie (aanmelden met gemeente-account)

In het [Azure-portaal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**:

1. **Naam:** `Uitleendienst Londerzeel`
2. **Supported account types:** *Accounts in this organizational directory only* (enkel de eigen tenant)
3. **Redirect URI:** type *Web*, waarde:
   `https://<app-naam>.azurewebsites.net/api/auth/entra/callback`
   (vul de App Service-naam uit stap 2 in; voeg gerust ook `http://localhost:3000/api/auth/entra/callback` toe om lokaal te testen)
4. Na aanmaak, noteer van de **Overview**-pagina:
   - **Application (client) ID** → wordt `ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → wordt `ENTRA_TENANT_ID`
5. **Certificates & secrets** → **New client secret** → noteer de *Value* meteen → wordt `ENTRA_CLIENT_SECRET`
   (kies een looptijd volgens jullie beleid; zet een reminder om hem tijdig te vernieuwen)

### App roles aanmaken (rollen uit het gemeente-account)

**App roles** → **Create app role**, één per rol. De **Value** moet exact zo gespeld zijn:

| Display name | Value | Allowed member types |
|---|---|---|
| Administratief medewerker Openbaar Domein | `ADMIN` | Users/Groups |
| Ploegbaas Dienst Gebouwen | `PLOEGBAAS` | Users/Groups |
| Technisch medewerker | `TECHNISCH` | Users/Groups |
| Magazijnier | `MAGAZIJNIER` | Users/Groups |
| Beheerder | `BEHEERDER` | Users/Groups |
| Beleid (lezer) | `BELEID` | Users/Groups |

### Medewerkers toewijzen

**Microsoft Entra ID** → **Enterprise applications** → *Uitleendienst Londerzeel* → **Users and groups**
→ **Add user/group** → kies de medewerker (of een M365-groep) en de juiste rol.

> **Hoe de rollen doorwerken:** bij het aanmelden krijgt de app de toegewezen rollen mee.
> Zijn er rollen toegewezen in Entra, dan zijn die **leidend** (ze overschrijven de lokaal
> beheerde rollen). Meldt iemand aan zonder toewijzing, dan gelden de lokaal ingestelde rollen
> (Beheer & configuratie), of — voor onbekende accounts — de `ENTRA_STANDAARD_ROL` als die is
> ingesteld. Zonder rol krijgt een onbekend account **geen toegang**.

---

## Stap 2 — Azure-resources aanmaken

Via het portaal of met de Azure CLI (`az login` eerst). CLI-voorbeeld:

```bash
# Resourcegroep
az group create --name rg-uitleendienst --location westeurope

# PostgreSQL (goedkoopste burstable tier; pas wachtwoord aan!)
az postgres flexible-server create \
  --resource-group rg-uitleendienst \
  --name pg-uitleendienst \
  --location westeurope \
  --sku-name Standard_B1ms --tier Burstable --storage-size 32 \
  --admin-user uitleenadmin --admin-password '<sterk-wachtwoord>' \
  --database-name uitleendienst \
  --public-access 0.0.0.0   # laat Azure-diensten toe; scherp later aan

# App Service (Linux, Node 22)
az appservice plan create --resource-group rg-uitleendienst --name plan-uitleendienst --sku B1 --is-linux
az webapp create --resource-group rg-uitleendienst --plan plan-uitleendienst \
  --name uitleendienst-londerzeel --runtime "NODE:22-lts"
az webapp config set --resource-group rg-uitleendienst --name uitleendienst-londerzeel \
  --startup-file "npm start"
```

### App-instellingen (omgevingsvariabelen)

App Service → **Settings → Environment variables** (of via CLI). Vul in:

| Naam | Waarde |
|---|---|
| `DATABASE_URL` | `postgresql://uitleenadmin:<wachtwoord>@pg-uitleendienst.postgres.database.azure.com:5432/uitleendienst?sslmode=require` |
| `SESSION_SECRET` | lange willekeurige tekenreeks (30+ tekens) |
| `ENTRA_TENANT_ID` | uit stap 1 |
| `ENTRA_CLIENT_ID` | uit stap 1 |
| `ENTRA_CLIENT_SECRET` | uit stap 1 |
| `LOKAAL_AANMELDEN_UIT` | `1` (verbergt de demo-wachtwoordlogin; weglaten tijdens de overgang) |
| `FRAME_ANCESTORS` | *(optioneel)* `https://<gemeente>.sharepoint.com` voor insluiten (stap 4) |
| `ENTRA_STANDAARD_ROL` | *(optioneel)* bv. `BELEID` — rol voor aangemelde accounts zonder toewijzing |

---

## Stap 3 — Automatische deploy via GitHub Actions

De workflow staat klaar in `.github/workflows/azure-deploy.yml` en activeert zichzelf zodra de
volgende drie zaken in GitHub zijn ingesteld (repo → **Settings**):

1. **Variables → New repository variable:** `AZURE_WEBAPP_NAME` = `uitleendienst-londerzeel`
2. **Secrets → New repository secret:** `AZURE_WEBAPP_PUBLISH_PROFILE` = de volledige inhoud van
   het publish-profiel (App Service → **Overview → Download publish profile**)
3. **Secrets:** `AZURE_DATABASE_URL` = dezelfde `DATABASE_URL` als in stap 2

Elke push naar `main` bouwt de app, werkt de databanktabellen bij (idempotent, inclusief
basisdata) en rolt uit naar de App Service. Handmatig triggeren kan via **Actions → Deploy naar
Azure App Service → Run workflow**.

> Eerste keer: na de deploy is de app bereikbaar op `https://<app-naam>.azurewebsites.net`.
> Controleer het aanmelden met een toegewezen gemeente-account (knop **"Aanmelden met
> gemeente-account"**).

---

## Stap 4 — Koppeling in SharePoint

**Eenvoudigst (aanbevolen): een tegel/link.**
Op de intranetpagina: **Edit** → webonderdeel **Quick links** (Snelkoppelingen) toevoegen →
link naar `https://<app-naam>.azurewebsites.net` met titel "Uitleendienst" en een passend
pictogram. Medewerkers klikken door en zijn — dankzij SSO — meteen aangemeld met hun
gemeente-account.

**Optioneel: insluiten in een SharePoint-pagina.**
1. Zet in de App Service de variabele `FRAME_ANCESTORS` op `https://<gemeente>.sharepoint.com`.
2. Voeg op de SharePoint-pagina het webonderdeel **Embed** (Insluiten) toe met de app-URL.
3. Merk op: sommige browsers beperken cookies in iframes; de app ondervangt dit
   (SameSite=None bij HTTPS), maar de tegel/link-aanpak blijft de robuustste keuze.

---

## Stap 5 — Nazorg en aandachtspunten

- **Demo-accounts:** met `LOKAAL_AANMELDEN_UIT=1` is de wachtwoordlogin verborgen en geweigerd.
  Wil je de demo-accounts helemaal weg, deactiveer ze dan in **Beheer & configuratie** of wijzig
  hun wachtwoorden.
- **Back-ups:** Azure Database for PostgreSQL Flexible Server maakt automatisch dagelijkse
  back-ups (standaard 7 dagen te herstellen; instelbaar tot 35).
- **Client secret vervalt:** zet een agenda-reminder vóór de vervaldatum van het Entra-secret en
  vernieuw dan `ENTRA_CLIENT_SECRET` in de App Service.
- **Eigen domeinnaam** (bv. `uitleendienst.londerzeel.be`): App Service → **Custom domains**;
  voeg daarna die URL ook toe als extra Redirect URI in de Entra app-registratie.
- **GDPR:** de data staat nu in jullie eigen tenant (regio West-Europa). Leg bewaartermijnen
  vast in het verwerkingsregister; de app logt statuswijzigingen en communicatie per dossier.

## Lokaal testen van de SSO-aanmelding (optioneel, voor ontwikkelaars)

Zet de drie `ENTRA_`-variabelen in `.env`, voeg `http://localhost:3000/api/auth/entra/callback`
toe als Redirect URI in de app-registratie, en start `npm run dev`. De knop "Aanmelden met
gemeente-account" verschijnt automatisch op de aanmeldpagina.
