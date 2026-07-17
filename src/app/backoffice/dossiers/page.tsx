import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Merk";
import { STATUS_LABELS, STATUS_KLEUR, LEVERINGSWIJZE_LABELS } from "@/lib/domein";
import { datum } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const where: Prisma.DossierWhereInput = {};
  if (status && status !== "ALLE") where.status = status;
  if (q) {
    where.OR = [
      { referentienummer: { contains: q } },
      { aanvrager: { naam: { contains: q } } },
      { evenement: { naam: { contains: q } } },
    ];
  }

  const dossiers = await prisma.dossier.findMany({
    where,
    include: { aanvrager: true, evenement: true, regels: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statusOpties = ["ALLE", ...Object.keys(STATUS_LABELS)];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aanvragen / dossiers</h1>
          <p className="text-sm text-gray-500">{dossiers.length} dossier(s)</p>
        </div>
      </div>

      {/* Filters */}
      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <div className="grow">
          <label className="label">Zoeken</label>
          <input name="q" defaultValue={q ?? ""} className="input" placeholder="Referentie, vereniging of evenement…" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={status ?? "ALLE"} className="input">
            {statusOpties.map((s) => (
              <option key={s} value={s}>{s === "ALLE" ? "Alle statussen" : STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" type="submit">Filteren</button>
        <Link href="/backoffice/dossiers" className="btn-secondary">Wissen</Link>
      </form>

      {/* Tabel */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Referentie</th>
              <th className="th">Aanvrager</th>
              <th className="th">Evenement</th>
              <th className="th">Periode</th>
              <th className="th">Levering</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dossiers.length === 0 ? (
              <tr><td className="td py-6 text-center text-gray-500" colSpan={6}>Geen dossiers gevonden.</td></tr>
            ) : (
              dossiers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="td">
                    <Link href={`/backoffice/dossiers/${d.id}`} className="font-mono font-medium text-londerzeel-geelDonker hover:underline">
                      {d.referentienummer}
                    </Link>
                  </td>
                  <td className="td">{d.aanvrager.naam}</td>
                  <td className="td">{d.evenement?.naam ?? "—"}</td>
                  <td className="td whitespace-nowrap">{datum(d.uitleenVan)} – {datum(d.uitleenTot)}</td>
                  <td className="td">{LEVERINGSWIJZE_LABELS[d.leveringswijze]?.split(" ")[0] ?? d.leveringswijze}</td>
                  <td className="td"><StatusBadge label={STATUS_LABELS[d.status] ?? d.status} kleur={STATUS_KLEUR[d.status] ?? ""} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
