import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Merk";
import { STATUS_LABELS, STATUS_KLEUR, EIND_STATUSSEN } from "@/lib/domein";
import { datum } from "@/lib/format";

export const dynamic = "force-dynamic";

function Kpi({ label, waarde, kleur = "text-londerzeel-inkt" }: { label: string; waarde: number | string; kleur?: string }) {
  return (
    <div className="card p-4">
      <p className={`text-3xl font-bold ${kleur}`}>{waarde}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default async function Dashboard() {
  const [ingediend, inBehandeling, goedgekeurd, teRetourneren, schade, totaal] = await Promise.all([
    prisma.dossier.count({ where: { status: "INGEDIEND" } }),
    prisma.dossier.count({ where: { status: { in: ["IN_BEHANDELING", "WACHT_OP_AANVULLING"] } } }),
    prisma.dossier.count({ where: { status: { in: ["GOEDGEKEURD", "BEVESTIGD", "BETAALD"] } } }),
    prisma.dossier.count({ where: { status: { in: ["UITGELEVERD", "GERETOURNEERD", "IN_CONTROLE"] } } }),
    prisma.dossier.count({ where: { status: "SCHADE_VASTGESTELD" } }),
    prisma.dossier.count(),
  ]);

  const recente = await prisma.dossier.findMany({
    where: { status: { notIn: EIND_STATUSSEN } },
    include: { aanvrager: true, evenement: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const binnenkort = await prisma.dossier.findMany({
    where: { status: { in: ["BETAALD", "KLAARGEZET", "BEVESTIGD"] }, uitleenVan: { gte: new Date() } },
    include: { aanvrager: true },
    orderBy: { uitleenVan: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Operationeel overzicht van de uitleendienst</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi label="Nieuw ingediend" waarde={ingediend} kleur="text-blue-600" />
        <Kpi label="In behandeling" waarde={inBehandeling} kleur="text-amber-600" />
        <Kpi label="Goedgekeurd / betaald" waarde={goedgekeurd} kleur="text-green-600" />
        <Kpi label="In uitvoering / retour" waarde={teRetourneren} kleur="text-indigo-600" />
        <Kpi label="Schade open" waarde={schade} kleur="text-rose-600" />
        <Kpi label="Totaal dossiers" waarde={totaal} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Lopende dossiers</h2>
            <Link href="/backoffice/dossiers" className="text-sm text-londerzeel-geelDonker hover:underline">Alles bekijken →</Link>
          </div>
          {recente.length === 0 ? (
            <p className="text-sm text-gray-500">Geen lopende dossiers.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recente.map((d) => (
                <li key={d.id}>
                  <Link href={`/backoffice/dossiers/${d.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.referentienummer} · {d.aanvrager.naam}</p>
                      <p className="truncate text-xs text-gray-500">{d.evenement?.naam ?? "—"} · {datum(d.uitleenVan)}</p>
                    </div>
                    <StatusBadge label={STATUS_LABELS[d.status] ?? d.status} kleur={STATUS_KLEUR[d.status] ?? ""} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Binnenkort uit te voeren</h2>
          {binnenkort.length === 0 ? (
            <p className="text-sm text-gray-500">Geen geplande leveringen/afhalingen.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {binnenkort.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.aanvrager.naam}</p>
                    <p className="text-xs text-gray-500">{d.referentienummer}</p>
                  </div>
                  <span className="text-sm text-gray-600">{datum(d.uitleenVan)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
