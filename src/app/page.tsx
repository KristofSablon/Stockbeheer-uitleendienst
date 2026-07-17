import Link from "next/link";
import { Logo } from "@/components/Merk";
import { getSessie } from "@/lib/auth";

export default async function Home() {
  const sessie = await getSessie();

  return (
    <div className="min-h-screen">
      {/* Kopbalk */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <nav className="flex items-center gap-3 text-sm">
            {sessie ? (
              <Link href="/backoffice" className="btn-primary">
                Naar backoffice
              </Link>
            ) : (
              <Link href="/login" className="btn-secondary">
                Medewerker aanmelden
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-200 bg-londerzeel-geelLicht">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-2xl text-3xl font-bold text-londerzeel-inkt sm:text-4xl">
            Materiaal lenen bij de gemeente Londerzeel
          </h1>
          <p className="mt-4 max-w-2xl text-gray-700">
            Erkende verenigingen, onderwijsinstellingen en organisatoren van vergunde evenementen kunnen
            hier online materiaal aanvragen bij de uitleendienst. Vul het formulier in en u ontvangt
            automatisch een ontvangstbevestiging met referentienummer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/aanvraag" className="btn-primary px-6 py-3 text-base">
              Nieuwe aanvraag indienen
            </Link>
            <Link href="/catalogus" className="btn-secondary px-6 py-3 text-base">
              Bekijk het aanbod
            </Link>
          </div>
        </div>
      </section>

      {/* Uitleg */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-xl font-semibold">Hoe werkt het?</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { t: "1. Aanvraag", d: "Dien uw aanvraag online in, minstens 4 weken vooraf." },
            { t: "2. Behandeling", d: "De dienst controleert beschikbaarheid en capaciteit." },
            { t: "3. Bevestiging", d: "U ontvangt een kostenoverzicht en betalingsinstructies." },
            { t: "4. Uitvoering", d: "Levering of afhaling met ondertekend ontvangstbewijs." },
            { t: "5. Retour", d: "Terugbrengen, controle en afsluiten van het dossier." },
          ].map((s) => (
            <li key={s.t} className="card p-4">
              <p className="font-semibold text-londerzeel-inkt">{s.t}</p>
              <p className="mt-1 text-sm text-gray-600">{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Belangrijk om te weten</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Aanvragen minstens 4 weken en maximaal 1 jaar vooraf.</li>
            <li>De uitleentermijn bedraagt maximaal 7 kalenderdagen.</li>
            <li>Enkel voor gebruik op het grondgebied van de gemeente.</li>
            <li>Betaling gebeurt via factuur, uiterlijk 7 dagen voor de levering.</li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
          Uitleendienst — Dienst Openbaar Domein · Malderendorp 14, 1840 Londerzeel ·
          uitleendienst@londerzeel.be
        </div>
      </footer>
    </div>
  );
}
