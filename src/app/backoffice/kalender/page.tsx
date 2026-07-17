import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORIE_LABELS } from "@/lib/domein";
import { datum, datumInput } from "@/lib/format";
import { beschikbaarheid } from "@/lib/beschikbaarheid";

export const dynamic = "force-dynamic";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ van?: string; tot?: string }>;
}) {
  const { van, tot } = await searchParams;

  const vanDatum = van ? new Date(van) : new Date();
  const totDatum = tot ? new Date(tot) : (() => { const d = new Date(vanDatum); d.setDate(d.getDate() + 13); return d; })();

  const materialen = await prisma.materiaal.findMany({
    where: { actief: true },
    orderBy: [{ categorie: "asc" }, { naam: "asc" }],
  });

  // Beschikbaarheid per materiaal voor de gekozen periode.
  const rijen = await Promise.all(
    materialen.map(async (m) => ({
      materiaal: m,
      b: await beschikbaarheid(m.id, vanDatum, totDatum),
    }))
  );

  // Reservaties die overlappen met de periode.
  const reservaties = await prisma.reservatie.findMany({
    where: {
      status: { in: ["GERESERVEERD", "BEVESTIGD"] },
      van: { lte: totDatum },
      tot: { gte: vanDatum },
    },
    include: { materiaal: true, dossier: { include: { aanvrager: true } } },
    orderBy: { van: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Beschikbaarheid & stock</h1>
        <p className="text-sm text-gray-500">Realtime zicht op voorraad en reservaties per periode</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label">Van</label>
          <input type="date" name="van" defaultValue={datumInput(vanDatum)} className="input" />
        </div>
        <div>
          <label className="label">Tot</label>
          <input type="date" name="tot" defaultValue={datumInput(totDatum)} className="input" />
        </div>
        <button className="btn-primary" type="submit">Toon beschikbaarheid</button>
      </form>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="font-semibold">Voorraad {datum(vanDatum)} – {datum(totDatum)}</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Materiaal</th>
              <th className="th">Categorie</th>
              <th className="th">Totaal</th>
              <th className="th">Gereserveerd</th>
              <th className="th">Onderhoud</th>
              <th className="th">Beschikbaar</th>
              <th className="th">Bezetting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rijen.map(({ materiaal, b }) => {
              const bezet = b.totaal > 0 ? Math.round(((b.totaal - b.beschikbaar) / b.totaal) * 100) : 0;
              return (
                <tr key={materiaal.id}>
                  <td className="td font-medium">{materiaal.naam}</td>
                  <td className="td">{CATEGORIE_LABELS[materiaal.categorie] ?? materiaal.categorie}</td>
                  <td className="td">{b.totaal}</td>
                  <td className="td">{b.gereserveerd}</td>
                  <td className="td">{b.inOnderhoud || "—"}</td>
                  <td className={`td font-semibold ${b.beschikbaar === 0 ? "text-red-600" : "text-green-700"}`}>{b.beschikbaar}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded bg-gray-100">
                        <div className={`h-full ${bezet >= 100 ? "bg-red-500" : bezet > 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, bezet)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{bezet}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Reservaties in deze periode</h2>
        {reservaties.length === 0 ? (
          <p className="text-sm text-gray-500">Geen reservaties in de gekozen periode.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {reservaties.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{r.materiaal.naam} × {r.aantal}</p>
                  <p className="text-xs text-gray-500">{r.dossier.aanvrager.naam} · {r.dossier.referentienummer}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{datum(r.van)} – {datum(r.tot)}</span>
                  <Link href={`/backoffice/dossiers/${r.dossierId}`} className="text-londerzeel-geelDonker hover:underline">Dossier →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
