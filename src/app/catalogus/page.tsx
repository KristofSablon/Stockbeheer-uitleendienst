import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Merk";
import { CATEGORIE_LABELS } from "@/lib/domein";
import { euro } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PubliekeCatalogus() {
  const materialen = await prisma.materiaal.findMany({
    where: { actief: true },
    orderBy: [{ categorie: "asc" }, { naam: "asc" }],
  });

  const perCategorie = new Map<string, typeof materialen>();
  for (const m of materialen) {
    if (!perCategorie.has(m.categorie)) perCategorie.set(m.categorie, []);
    perCategorie.get(m.categorie)!.push(m);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <Link href="/aanvraag" className="btn-primary">Aanvraag indienen</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Materiaalaanbod</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overzicht van het beschikbare materiaal. Tarieven zijn indicatief; het definitieve
          kostenoverzicht ontvangt u na behandeling van uw aanvraag.
        </p>

        <div className="mt-8 space-y-8">
          {[...perCategorie.entries()].map(([categorie, items]) => (
            <section key={categorie}>
              <h2 className="mb-3 text-lg font-semibold text-londerzeel-inkt">
                {CATEGORIE_LABELS[categorie] ?? categorie}
              </h2>
              <div className="card overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="th">Materiaal</th>
                      <th className="th">Beschikbaar</th>
                      <th className="th">Huurtarief</th>
                      <th className="th">Transport</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((m) => (
                      <tr key={m.id}>
                        <td className="td">
                          <span className="font-medium text-gray-900">{m.naam}</span>
                          {m.omschrijving && <span className="block text-xs text-gray-500">{m.omschrijving}</span>}
                        </td>
                        <td className="td">{m.totaalAantal} {m.eenheid ?? "stuk"}</td>
                        <td className="td">{m.huurtarief > 0 ? euro(m.huurtarief) : "Gratis"}</td>
                        <td className="td">{m.transportVereist ? "Transport vereist" : "Zelf mee te nemen"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
