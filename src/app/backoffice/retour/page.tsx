import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Merk";
import { STATUS_LABELS, STATUS_KLEUR } from "@/lib/domein";
import { datum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RetourPage() {
  const dossiers = await prisma.dossier.findMany({
    where: { status: { in: ["UITGELEVERD", "GERETOURNEERD", "IN_CONTROLE", "SCHADE_VASTGESTELD"] } },
    include: { aanvrager: true, evenement: true, retourformulier: true },
    orderBy: { uitleenTot: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Retour & controle</h1>
        <p className="text-sm text-gray-500">Materiaal dat uit is, terugkomt of gecontroleerd wordt</p>
      </div>

      {dossiers.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">Geen dossiers in retour of controle.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Referentie</th>
                <th className="th">Aanvrager</th>
                <th className="th">Geplande retour</th>
                <th className="th">Status</th>
                <th className="th">Retourformulier</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dossiers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="td font-mono font-medium">{d.referentienummer}</td>
                  <td className="td">{d.aanvrager.naam}</td>
                  <td className="td">{datum(d.uitleenTot)}</td>
                  <td className="td"><StatusBadge label={STATUS_LABELS[d.status] ?? d.status} kleur={STATUS_KLEUR[d.status] ?? ""} /></td>
                  <td className="td">{d.retourformulier ? (d.retourformulier.algemeneStatus === "SCHADE" ? "Schade" : "Geen schade") : "—"}</td>
                  <td className="td text-right">
                    <Link href={`/backoffice/dossiers/${d.id}?tab=documenten`} className="text-londerzeel-geelDonker hover:underline">
                      {d.status === "IN_CONTROLE" ? "Controleren →" : "Bekijken →"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
