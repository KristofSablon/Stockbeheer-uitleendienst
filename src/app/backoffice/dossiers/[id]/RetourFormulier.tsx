"use client";

import { useState } from "react";
import { slaRetourformulierOp } from "./actions";
import { datumInput } from "@/lib/format";

type Regel = { id: string; materiaalNaam: string; aantal: number };

export default function RetourFormulier({
  dossierId,
  regels,
  geplandeRetour,
}: {
  dossierId: string;
  regels: Regel[];
  geplandeRetour: string | null;
}) {
  const [schade, setSchade] = useState<Record<string, boolean>>({});

  return (
    <form action={slaRetourformulierOp} className="space-y-4">
      <input type="hidden" name="dossierId" value={dossierId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Retourdatum</label>
          <input type="date" name="retourdatum" defaultValue={datumInput(geplandeRetour ?? new Date())} className="input" />
          <p className="mt-1 text-xs text-gray-500">Latere retour dan gepland genereert automatisch een boete.</p>
        </div>
        <div>
          <label className="label">Handtekening aanvrager (naam)</label>
          <input name="handtekeningAanvrager" className="input" placeholder="Naam ter bevestiging" />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Materiaal</th>
              <th className="th">Aantal</th>
              <th className="th">Beoordeling</th>
              <th className="th">Schadedetails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {regels.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.materiaalNaam}</td>
                <td className="td">{r.aantal}</td>
                <td className="td">
                  <select
                    name={`beoordeling_${r.id}`}
                    className="input w-32"
                    defaultValue="GOED"
                    onChange={(e) => setSchade((p) => ({ ...p, [r.id]: e.target.value === "SCHADE" }))}
                  >
                    <option value="GOED">Goed</option>
                    <option value="SCHADE">Schade</option>
                  </select>
                </td>
                <td className="td">
                  {schade[r.id] ? (
                    <div className="space-y-2">
                      <input name={`schadeomschrijving_${r.id}`} className="input" placeholder="Omschrijving schade" />
                      <div className="flex flex-wrap gap-2">
                        <select name={`schadeactie_${r.id}`} className="input w-40">
                          <option value="EIGEN_HERSTEL">Eigen herstel (€50/uur)</option>
                          <option value="EXTERN_HERSTEL">Extern herstel</option>
                          <option value="VERVANGING">Vervanging</option>
                        </select>
                        <input name={`schade_uren_${r.id}`} type="number" min={0} step={0.5} className="input w-24" placeholder="uren" />
                        <input name={`schade_kost_${r.id}`} type="number" min={0} step={0.01} className="input w-28" placeholder="extern €" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className="label">Algemene opmerkingen</label>
        <textarea name="opmerkingen" rows={2} className="input" />
      </div>

      <button type="submit" className="btn-primary">Retourformulier opslaan & dossier afwerken</button>
    </form>
  );
}
