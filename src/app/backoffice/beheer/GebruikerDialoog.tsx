"use client";

import { useState } from "react";
import { bewaarGebruiker } from "./actions";
import { ROL_LABELS } from "@/lib/domein";

export default function GebruikerDialoog({
  knopLabel,
  knopKlasse = "btn-secondary",
  gebruiker,
}: {
  knopLabel: string;
  knopKlasse?: string;
  gebruiker?: { id: string; naam: string; email: string; rollen: string; actief: boolean };
}) {
  const [open, setOpen] = useState(false);
  const huidigeRollen = gebruiker?.rollen.split(",").map((r) => r.trim()) ?? [];

  return (
    <>
      <button className={knopKlasse} type="button" onClick={() => setOpen(true)}>{knopLabel}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{gebruiker ? "Gebruiker bewerken" : "Nieuwe gebruiker"}</h2>
            <form action={bewaarGebruiker} className="space-y-3">
              {gebruiker && <input type="hidden" name="id" value={gebruiker.id} />}
              <div>
                <label className="label">Naam</label>
                <input name="naam" defaultValue={gebruiker?.naam} className="input" required />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input name="email" type="email" defaultValue={gebruiker?.email} className="input" required />
              </div>
              <div>
                <label className="label">Rollen</label>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(ROL_LABELS).filter(([k]) => k !== "AANVRAGER").map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="rollen" value={k} defaultChecked={huidigeRollen.includes(k)} /> {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Wachtwoord {gebruiker && <span className="text-xs text-gray-400">(leeg = ongewijzigd)</span>}</label>
                <input name="wachtwoord" type="password" className="input" placeholder={gebruiker ? "••••••" : "standaard: londerzeel"} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="actief" defaultChecked={gebruiker?.actief ?? true} /> Actief
              </label>
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
