# Handleiding — demoversie lokaal draaien

Deze korte handleiding legt uit hoe je de webapplicatie van de uitleendienst op je **eigen
computer** opstart om ze uit te proberen. Reken op ongeveer 10 minuten voor de eerste keer.

---

> **Liever niets installeren?** Spring naar **[sectie 6 — Testen in de browser (zonder installatie)](#6-testen-in-de-browser-zonder-installatie)**.

## 1. Wat je vooraf nodig hebt

Installeer twee gratis programma's (eenmalig):

1. **Node.js** (versie 20 of hoger) — download de "LTS"-versie via **https://nodejs.org** en volg de
   installatie (gewoon telkens "Volgende" klikken). Node bevat automatisch `npm`.
2. **Git** — download via **https://git-scm.com/downloads** en installeer met de standaardopties.

> Controleer achteraf of alles werkt: open een terminal (zie hieronder) en typ `node -v`. Je moet
> een versienummer zien zoals `v20.x.x`.

**Een terminal openen:**
- **Windows:** druk op de Windowstoets, typ `PowerShell`, open **Windows PowerShell**.
- **Mac:** open **Terminal** (via Spotlight: ⌘ + spatie → "Terminal").

---

## 2. De applicatie ophalen en starten

Kopieer de onderstaande regels **één voor één** in de terminal en druk telkens op Enter.

```bash
git clone https://github.com/KristofSablon/Stockbeheer-uitleendienst.git
cd Stockbeheer-uitleendienst
git checkout claude/github-stockbeheer-connect-q56akn
npm install
```

Zet daarna de omgeving en de databank klaar (**deze stap doe je maar één keer**):

```bash
# Windows (PowerShell):
copy .env.example .env

# Mac / Linux:
cp .env.example .env
```

```bash
npm run setup
```

`npm run setup` maakt de databank aan en vult ze met het materiaalaanbod, de gebruikers en een
voorbeelddossier. Je ziet enkele regels met "seeden…" en tot slot "Seed voltooid".

Start ten slotte de applicatie:

```bash
npm run dev
```

Wacht tot je in de terminal ziet: `✓ Ready`. **Laat dit venster openstaan** zolang je de app gebruikt.

---

## 3. De applicatie openen in je browser

Open je browser en ga naar:

> **http://localhost:3000**

### Publiek gedeelte (geen aanmelding nodig)
- **Startpagina** — algemene uitleg.
- **Nieuwe aanvraag** (`/aanvraag`) — het e-formulier dat een vereniging invult.
- **Aanbod** (`/catalogus`) — overzicht van het materiaal.

### Backoffice (voor medewerkers)
Klik rechtsboven op **"Medewerker aanmelden"** en gebruik:

| E-mail | Wachtwoord | Wat je ziet |
|---|---|---|
| **admin@londerzeel.be** | `londerzeel` | Alles (Admin + Beheerder) — **aanrader voor de demo** |
| ploegbaas@londerzeel.be | `londerzeel` | Planning & werkopdrachten |
| magazijn@londerzeel.be | `londerzeel` | Retour & controle |
| beleid@londerzeel.be | `londerzeel` | Enkel dashboard (lezer) |

---

## 4. De volledige flow uitproberen

Zo doorloop je in enkele minuten het hele proces:

1. Dien via **`/aanvraag`** een nieuwe aanvraag in (kies een datum minstens 4 weken in de toekomst).
   Je krijgt een referentienummer.
2. Meld je aan als **admin@londerzeel.be** en ga naar **Aanvragen / dossiers**. Open je dossier.
3. Tabblad **Materialen & behandeling** → *In behandeling nemen* → bekijk de **stockcheck** →
   *Goedkeuren*.
4. Tabblad **Financiën** → *Bevestigen & factuur aanmaken* → *Betaling registreren*.
5. Tabblad **Planning** → *Materiaal klaargezet*. Tabblad **Documenten** → *Ontvangstbewijs
   ondertekenen*.
6. Tabblad **Planning** → *Materiaal geretourneerd* → *Start retourcontrole*. Tabblad **Documenten**
   → vul het **retourformulier** in (met of zonder schade) en werk het dossier af.
7. Bekijk het **Dashboard** en de **Beschikbaarheidskalender** om het effect te zien.

---

## 5. Stoppen en later opnieuw starten

- **Stoppen:** klik in het terminalvenster en druk op **Ctrl + C**.
- **Later opnieuw starten:** open een terminal, ga naar de map en start opnieuw:

  ```bash
  cd Stockbeheer-uitleendienst
  npm run dev
  ```

  (Stap 1 en 2 hoef je niet te herhalen — enkel `npm run dev`.)

- **Alles terug op nul zetten** (opnieuw met verse voorbeelddata):

  ```bash
  npm run db:reset
  ```

---

## 6. Testen in de browser (zonder installatie)

Wil je niets installeren op je computer? Gebruik dan **GitHub Codespaces**: dat draait de volledige
applicatie in een kant-en-klare omgeving in je browser. Je hebt enkel een (gratis) GitHub-account
nodig. De installatie gebeurt automatisch dankzij de meegeleverde configuratie.

**Stap voor stap:**

1. Ga naar de repository op **https://github.com/KristofSablon/Stockbeheer-uitleendienst**.
2. Klik bovenaan op de vervolgkeuzelijst met de branch en kies
   **`claude/github-stockbeheer-connect-q56akn`**.
3. Klik op de groene knop **`< > Code`** → tabblad **Codespaces** → **Create codespace on
   claude/github-stockbeheer-connect-q56akn**.
4. Er opent een omgeving in je browser. **Wacht** tot onderaan de installatie klaar is (je ziet
   "Seed voltooid" en de melding stopt — dit duurt de eerste keer 1 à 2 minuten).
5. Typ in het onderste terminalvenster:

   ```bash
   npm run dev
   ```

6. Er verschijnt een melding **"Your application running on port 3000 is available"** → klik op
   **Open in Browser** (of het voorbeeldvenster opent vanzelf). De app opent in een nieuw tabblad.

Aanmelden en uitproberen gaat verder net zoals hierboven beschreven (admin@londerzeel.be /
`londerzeel`). Sluit je het Codespace-tabblad, dan pauzeert de omgeving; je kunt ze later heropenen
via **Code → Codespaces**.

> Let op: een gratis GitHub-account krijgt maandelijks een ruim aantal gratis Codespace-uren, meer
> dan genoeg om te testen. De omgeving stopt vanzelf na een tijd inactiviteit.

---

## Veelgestelde vragen

**"'npm' wordt niet herkend als opdracht."**
Node.js is nog niet (juist) geïnstalleerd, of de terminal stond al open tijdens de installatie. Sluit
de terminal, open een nieuwe en probeer opnieuw.

**"Poort 3000 is al in gebruik."**
Er draait nog een oude versie. Sluit het andere terminalvenster, of start met een andere poort:
`npm run dev -- -p 3001` en surf naar `http://localhost:3001`.

**Is dit de definitieve versie?**
Nee, dit is een **werkend prototype** (fase 1 + 2) om te tonen en te bespreken. De data is
voorbeelddata en de e-mails worden nog niet echt verstuurd (ze worden wel geregistreerd bij het
dossier onder "Historiek").
