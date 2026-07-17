import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo, StatusBadge } from "@/components/Merk";
import { STATUS_LABELS, STATUS_KLEUR, LEVERINGSWIJZE_LABELS } from "@/lib/domein";
import { datum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BevestigingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const dossier = await prisma.dossier.findUnique({
    where: { referentienummer: ref },
    include: {
      aanvrager: true,
      contactpersoon: true,
      evenement: true,
      regels: { include: { materiaal: true } },
    },
  });

  if (!dossier) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-2xl text-white">✓</div>
          <h1 className="text-xl font-bold text-green-900">Uw aanvraag is ontvangen</h1>
          <p className="mt-2 text-sm text-green-800">
            Uw referentienummer is <span className="font-mono font-semibold">{dossier.referentienummer}</span>.
            Bewaar dit nummer om uw aanvraag op te volgen. U ontvangt een bevestiging per e-mail.
          </p>
        </div>

        <div className="card mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Overzicht aanvraag</h2>
            <StatusBadge label={STATUS_LABELS[dossier.status] ?? dossier.status} kleur={STATUS_KLEUR[dossier.status] ?? ""} />
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">Aanvrager</dt><dd className="font-medium">{dossier.aanvrager.naam}</dd></div>
            <div><dt className="text-gray-500">Contactpersoon</dt><dd className="font-medium">{dossier.contactpersoon?.naam ?? "—"}</dd></div>
            <div><dt className="text-gray-500">Evenement</dt><dd className="font-medium">{dossier.evenement?.naam ?? "—"}</dd></div>
            <div><dt className="text-gray-500">Levering</dt><dd className="font-medium">{LEVERINGSWIJZE_LABELS[dossier.leveringswijze]}</dd></div>
            <div><dt className="text-gray-500">Van</dt><dd className="font-medium">{datum(dossier.uitleenVan)}</dd></div>
            <div><dt className="text-gray-500">Tot</dt><dd className="font-medium">{datum(dossier.uitleenTot)}</dd></div>
          </dl>

          <h3 className="mt-6 mb-2 text-sm font-semibold">Aangevraagd materiaal</h3>
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
            {dossier.regels.map((r) => (
              <li key={r.id} className="flex justify-between px-3 py-2">
                <span>{r.materiaal.naam}</span>
                <span className="text-gray-600">{r.gevraagdAantal} {r.materiaal.eenheid ?? "stuk"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="btn-secondary">Terug naar de website</Link>
        </div>
      </div>
    </div>
  );
}
