"use client";

import { useState } from "react";
import { bewaarMateriaal } from "./actions";
import { CATEGORIE_LABELS } from "@/lib/domein";

export type MateriaalWaarden = {
  id?: string;
  naam?: string;
  categorie?: string;
  totaalAantal?: number;
  huurtarief?: number;
  transporttarief?: number;
  transportVereist?: boolean;
  capaciteitslimiet?: number | null;
  eenheid?: string | null;
  omschrijving?: string | null;
};

export default function MateriaalDialoog({
  knopLabel,
  knopKlasse = "btn-secondary",
  waarden = {},
}: {
  knopLabel: string;
  knopKlasse?: string;
  waarden?: MateriaalWaarden;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={knopKlasse} onClick={() => setOpen(true)} type="button">{knopLabel}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{waarden.id ? "Materiaal bewerken" : "Nieuw materiaal"}</h2>
            <form action={bewaarMateriaal} className="space-y-3">
              {waarden.id && <input type="hidden" name="id" value={waarden.id} />}
              <div>
                <label className="label">Naam</label>
                <input name="naam" defaultValue={waarden.naam} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categorie</label>
                  <select name="categorie" defaultValue={waarden.categorie ?? "ORGANISATORISCH"} className="input">
                    {Object.entries(CATEGORIE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Eenheid</label>
                  <input name="eenheid" defaultValue={waarden.eenheid ?? "stuk"} className="input" />
                </div>
                <div>
                  <label className="label">Totaal aantal</label>
                  <input name="totaalAantal" type="number" min={0} defaultValue={waarden.totaalAantal ?? 0} className="input" />
                </div>
                <div>
                  <label className="label">Capaciteitslimiet (p.p.)</label>
                  <input name="capaciteitslimiet" type="number" min={0} defaultValue={waarden.capaciteitslimiet ?? ""} className="input" />
                </div>
                <div>
                  <label className="label">Huurtarief (€)</label>
                  <input name="huurtarief" type="number" min={0} step={0.01} defaultValue={waarden.huurtarief ?? 0} className="input" />
                </div>
                <div>
                  <label className="label">Transporttarief (€)</label>
                  <input name="transporttarief" type="number" min={0} step={0.01} defaultValue={waarden.transporttarief ?? 0} className="input" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="transportVereist" defaultChecked={waarden.transportVereist} /> Transport vereist
              </label>
              <div>
                <label className="label">Omschrijving</label>
                <textarea name="omschrijving" rows={2} defaultValue={waarden.omschrijving ?? ""} className="input" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuleren</button>
                <button type="submit" className="btn-primary">Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
