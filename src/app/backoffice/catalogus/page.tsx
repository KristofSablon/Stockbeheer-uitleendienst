import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessie, heeftRol } from "@/lib/auth";
import { CATEGORIE_LABELS } from "@/lib/domein";
import { euro } from "@/lib/format";
import MateriaalDialoog from "./MateriaalDialoog";
import { wisselActief } from "./actions";

export const dynamic = "force-dynamic";

export default async function CatalogusBeheer() {
  const sessie = await getSessie();
  if (!heeftRol(sessie, "BEHEERDER", "ADMIN")) redirect("/backoffice");

  const materialen = await prisma.materiaal.findMany({ orderBy: [{ categorie: "asc" }, { naam: "asc" }] });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materiaalbeheer</h1>
          <p className="text-sm text-gray-500">{materialen.length} materialen in de catalogus</p>
        </div>
        <MateriaalDialoog knopLabel="+ Nieuw materiaal" knopKlasse="btn-primary" />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Materiaal</th>
              <th className="th">Categorie</th>
              <th className="th">Aantal</th>
              <th className="th">Huur</th>
              <th className="th">Transport</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materialen.map((m) => (
              <tr key={m.id} className={m.actief ? "" : "opacity-50"}>
                <td className="td">
                  <span className="font-medium">{m.naam}</span>
                  {m.capaciteitslimiet ? <span className="block text-xs text-gray-500">max. {m.capaciteitslimiet} p.p.</span> : null}
                </td>
                <td className="td">{CATEGORIE_LABELS[m.categorie] ?? m.categorie}</td>
                <td className="td">{m.totaalAantal} {m.eenheid}</td>
                <td className="td">{m.huurtarief > 0 ? euro(m.huurtarief) : "—"}</td>
                <td className="td">{m.transportVereist ? (m.transporttarief > 0 ? euro(m.transporttarief) : "vereist") : "—"}</td>
                <td className="td">
                  <span className={`badge ${m.actief ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {m.actief ? "Actief" : "Inactief"}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center justify-end gap-2">
                    <MateriaalDialoog
                      knopLabel="Bewerken"
                      knopKlasse="text-sm text-londerzeel-geelDonker hover:underline"
                      waarden={{
                        id: m.id, naam: m.naam, categorie: m.categorie, totaalAantal: m.totaalAantal,
                        huurtarief: m.huurtarief, transporttarief: m.transporttarief, transportVereist: m.transportVereist,
                        capaciteitslimiet: m.capaciteitslimiet, eenheid: m.eenheid, omschrijving: m.omschrijving,
                      }}
                    />
                    <form action={wisselActief}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-sm text-gray-400 hover:underline" type="submit">{m.actief ? "Deactiveren" : "Activeren"}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
