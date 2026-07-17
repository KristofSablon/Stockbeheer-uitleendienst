import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { WERKOPDRACHT_TYPE_LABELS, WERKOPDRACHT_STATUS_LABELS } from "@/lib/domein";
import { datum, datumInput } from "@/lib/format";
import { wijsWerkopdrachtToe } from "../dossiers/[id]/actions";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const werkopdrachten = await prisma.werkopdracht.findMany({
    where: { status: { in: ["GEPLAND", "TOEGEWEZEN"] } },
    include: {
      medewerker: true,
      dossier: { include: { aanvrager: true, evenement: true } },
    },
    orderBy: { datum: "asc" },
  });

  const medewerkers = await prisma.gebruiker.findMany({
    where: { actief: true, OR: [{ rollen: { contains: "TECHNISCH" } }, { rollen: { contains: "PLOEGBAAS" } }, { rollen: { contains: "MAGAZIJNIER" } }] },
    orderBy: { naam: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Planning & werkopdrachten</h1>
        <p className="text-sm text-gray-500">{werkopdrachten.length} openstaande werkopdracht(en) · koppeling met Top-desk mogelijk via referentie</p>
      </div>

      {werkopdrachten.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">Geen openstaande werkopdrachten.</div>
      ) : (
        <div className="space-y-4">
          {werkopdrachten.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {WERKOPDRACHT_TYPE_LABELS[w.type] ?? w.type} — {w.dossier?.aanvrager.naam}
                  </p>
                  <p className="text-xs text-gray-500">
                    {w.dossier?.referentienummer} · {w.dossier?.evenement?.naam ?? "—"} ·{" "}
                    <Link href={`/backoffice/dossiers/${w.dossierId}`} className="text-londerzeel-geelDonker hover:underline">Open dossier</Link>
                  </p>
                </div>
                <span className="badge bg-gray-100 text-gray-700">{WERKOPDRACHT_STATUS_LABELS[w.status] ?? w.status}</span>
              </div>

              <form action={wijsWerkopdrachtToe} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                <input type="hidden" name="werkopdrachtId" value={w.id} />
                <div>
                  <label className="label">Medewerker</label>
                  <select name="medewerkerId" defaultValue={w.medewerkerId ?? ""} className="input">
                    <option value="">— niet toegewezen —</option>
                    {medewerkers.map((m) => <option key={m.id} value={m.id}>{m.naam}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Datum</label>
                  <input type="date" name="datum" defaultValue={datumInput(w.datum)} className="input" />
                </div>
                <div>
                  <label className="label">Tijdsvenster</label>
                  <input name="tijdsvenster" defaultValue={w.tijdsvenster ?? ""} placeholder="bv. 8u–10u" className="input" />
                </div>
                <div>
                  <label className="label">Top-desk ref.</label>
                  <input name="topdeskRef" defaultValue={w.topdeskRef ?? ""} className="input" />
                </div>
                <button type="submit" className="btn-primary">Opslaan</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
