import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Merk";
import { getConfigGetal } from "@/lib/config";
import AanvraagFormulier from "./AanvraagFormulier";

export const dynamic = "force-dynamic";

export default async function AanvraagPage() {
  const materialen = await prisma.materiaal.findMany({
    where: { actief: true },
    orderBy: [{ categorie: "asc" }, { naam: "asc" }],
    select: {
      id: true,
      naam: true,
      categorie: true,
      totaalAantal: true,
      huurtarief: true,
      eenheid: true,
      transportVereist: true,
      capaciteitslimiet: true,
      omschrijving: true,
    },
  });

  const minWeken = await getConfigGetal("AANVRAAG_MIN_WEKEN");
  const uitleentermijn = await getConfigGetal("UITLEENTERMIJN_DAGEN");

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Logo />
          <Link href="/" className="text-sm text-gray-500 hover:underline">Annuleren</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Nieuwe aanvraag uitleendienst</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vul onderstaand formulier volledig in. Velden met <span className="text-red-600">*</span> zijn verplicht.
          Aanvragen minstens {minWeken} weken vooraf; uitleentermijn maximaal {uitleentermijn} kalenderdagen.
        </p>

        <div className="mt-6">
          <AanvraagFormulier materialen={materialen} />
        </div>
      </div>
    </div>
  );
}
