import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Merk";
import { STATUS_LABELS, STATUS_KLEUR, LEVERINGSWIJZE_LABELS } from "@/lib/domein";
import { datum } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Snelfilters (wachtrijen) met de bijhorende statussen.
const WACHTRIJEN: Record<string, { label: string; statussen: string[] | null }> = {
  te_behandelen: { label: "Te behandelen", statussen: ["INGEDIEND", "IN_BEHANDELING", "WACHT_OP_AANVULLING", "GOEDGEKEURD", "BEVESTIGD"] },
  nieuw: { label: "Nieuw ingediend", statussen: ["INGEDIEND"] },
  uitvoering: { label: "In uitvoering", statussen: ["BETAALD", "KLAARGEZET", "UITGELEVERD", "GERETOURNEERD", "IN_CONTROLE"] },
  afgehandeld: { label: "Afgehandeld", statussen: ["AFGESLOTEN", "GEWEIGERD", "GEANNULEERD"] },
  alle: { label: "Alle", statussen: null },
};

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; wachtrij?: string }>;
}) {
  const { status, q, wachtrij = "te_behandelen" } = await searchParams;
  const actieveWachtrij = WACHTRIJEN[wachtrij] ? wachtrij : "te_behandelen";

  const where: Prisma.DossierWhereInput = {};
  if (status && status !== "ALLE") {
    where.status = status; // expliciete status filtert binnen de wachtrij
  } else {
    const statussen = WACHTRIJEN[actieveWachtrij].statussen;
    if (statussen) where.status = { in: statussen };
  }
  if (q) {
    where.OR = [
      { referentienummer: { contains: q } },
      { aanvrager: { naam: { contains: q } } },
      { evenement: { naam: { contains: q } } },
    ];
  }

  const [dossiers, tellingen] = await Promise.all([
    prisma.dossier.findMany({
      where,
      include: { aanvrager: true, evenement: true, regels: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Aantallen per wachtrij voor de chips.
    Promise.all(
      Object.entries(WACHTRIJEN).map(async ([key, def]) => [
        key,
        def.statussen ? await prisma.dossier.count({ where: { status: { in: def.statussen } } }) : await prisma.dossier.count(),
      ] as const)
    ),
  ]);
  const telPerWachtrij = Object.fromEntries(tellingen);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Aanvragen behandelen</h1>
        <p className="text-sm text-gray-500">
          Hier volgt u de binnengekomen aanvragen op en behandelt u ze: nemen in behandeling,
          stockcheck, goedkeuren of weigeren, bevestigen en factureren.
        </p>
      </div>

      {/* Snelfilters (wachtrijen) */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(WACHTRIJEN).map(([key, def]) => {
          const actief = key === actieveWachtrij && !status;
          return (
            <Link
              key={key}
              href={`/backoffice/dossiers?wachtrij=${key}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                actief
                  ? "border-londerzeel-geel bg-londerzeel-geel text-londerzeel-inkt"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {def.label}
              <span className={`rounded-full px-1.5 text-xs ${actief ? "bg-white/40" : "bg-gray-100 text-gray-600"}`}>
                {telPerWachtrij[key] ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Zoeken */}
      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <input type="hidden" name="wachtrij" value={actieveWachtrij} />
        <div className="grow">
          <label className="label">Zoeken</label>
          <input name="q" defaultValue={q ?? ""} className="input" placeholder="Referentie, vereniging of evenement…" />
        </div>
        <div>
          <label className="label">Precieze status</label>
          <select name="status" defaultValue={status ?? "ALLE"} className="input">
            <option value="ALLE">— binnen deze wachtrij —</option>
            {Object.keys(STATUS_LABELS).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" type="submit">Filteren</button>
        <Link href={`/backoffice/dossiers?wachtrij=${actieveWachtrij}`} className="btn-secondary">Wissen</Link>
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
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dossiers.length === 0 ? (
              <tr><td className="td py-6 text-center text-gray-500" colSpan={7}>Geen aanvragen in deze wachtrij.</td></tr>
            ) : (
              dossiers.map((d) => {
                const behandelbaar = ["INGEDIEND", "IN_BEHANDELING", "WACHT_OP_AANVULLING"].includes(d.status);
                return (
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
                    <td className="td text-right">
                      <Link
                        href={`/backoffice/dossiers/${d.id}?tab=behandeling`}
                        className={behandelbaar ? "btn-primary px-3 py-1 text-xs" : "text-sm text-londerzeel-geelDonker hover:underline"}
                      >
                        {behandelbaar ? "Behandelen →" : "Openen →"}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
