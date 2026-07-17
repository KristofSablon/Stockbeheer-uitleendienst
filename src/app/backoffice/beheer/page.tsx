import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessie, heeftRol } from "@/lib/auth";
import { ROL_LABELS, rollenNaarArray } from "@/lib/domein";
import { bewaarConfiguratie } from "./actions";
import GebruikerDialoog from "./GebruikerDialoog";

export const dynamic = "force-dynamic";

export default async function BeheerPage() {
  const sessie = await getSessie();
  if (!heeftRol(sessie, "BEHEERDER")) redirect("/backoffice");

  const config = await prisma.configuratie.findMany({ orderBy: [{ categorie: "asc" }, { sleutel: "asc" }] });
  const gebruikers = await prisma.gebruiker.findMany({ orderBy: { naam: "asc" } });

  const perCategorie = new Map<string, typeof config>();
  for (const c of config) {
    if (!perCategorie.has(c.categorie)) perCategorie.set(c.categorie, []);
    perCategorie.get(c.categorie)!.push(c);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Beheer & configuratie</h1>
        <p className="text-sm text-gray-500">Tarieven, termijnen, sjablonen en gebruikers — zonder code-aanpassing</p>
      </div>

      {/* Configuratie */}
      <form action={bewaarConfiguratie} className="card p-5">
        <h2 className="mb-4 font-semibold">Parameters (tarieven & termijnen)</h2>
        <div className="space-y-6">
          {[...perCategorie.entries()].map(([cat, items]) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{cat}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((c) => (
                  <div key={c.id}>
                    <label className="label">{c.omschrijving ?? c.sleutel}</label>
                    <input name={`cfg_${c.sleutel}`} defaultValue={c.waarde} className="input" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <button type="submit" className="btn-primary">Configuratie opslaan</button>
        </div>
      </form>

      {/* Gebruikers */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Gebruikers & rollen</h2>
          <GebruikerDialoog knopLabel="+ Nieuwe gebruiker" knopKlasse="btn-primary" />
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Naam</th>
              <th className="th">E-mail</th>
              <th className="th">Rollen</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gebruikers.map((g) => (
              <tr key={g.id}>
                <td className="td font-medium">{g.naam}</td>
                <td className="td">{g.email}</td>
                <td className="td">{rollenNaarArray(g.rollen).map((r) => ROL_LABELS[r] ?? r).join(", ")}</td>
                <td className="td">
                  <span className={`badge ${g.actief ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>{g.actief ? "Actief" : "Inactief"}</span>
                </td>
                <td className="td text-right">
                  <GebruikerDialoog
                    knopLabel="Bewerken"
                    knopKlasse="text-sm text-londerzeel-geelDonker hover:underline"
                    gebruiker={{ id: g.id, naam: g.naam, email: g.email, rollen: g.rollen, actief: g.actief }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
