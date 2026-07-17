"use client";

import { useActionState, useState } from "react";
import { dienAanvraagIn, type AanvraagResultaat } from "./actions";
import { AANVRAGER_TYPE_LABELS, CATEGORIE_LABELS, LEVERINGSWIJZE_LABELS } from "@/lib/domein";
import { euro } from "@/lib/format";

type Materiaal = {
  id: string;
  naam: string;
  categorie: string;
  totaalAantal: number;
  huurtarief: number;
  eenheid: string | null;
  transportVereist: boolean;
  capaciteitslimiet: number | null;
  omschrijving: string | null;
};

function Fout({ tekst }: { tekst?: string }) {
  if (!tekst) return null;
  return <p className="mt-1 text-xs text-red-600">{tekst}</p>;
}

export default function AanvraagFormulier({ materialen }: { materialen: Materiaal[] }) {
  const [state, formAction, pending] = useActionState<AanvraagResultaat, FormData>(dienAanvraagIn, {});
  const [aantallen, setAantallen] = useState<Record<string, number>>({});
  const vf = state?.veldFouten ?? {};

  const perCategorie = new Map<string, Materiaal[]>();
  for (const m of materialen) {
    if (!perCategorie.has(m.categorie)) perCategorie.set(m.categorie, []);
    perCategorie.get(m.categorie)!.push(m);
  }

  const geselecteerd = materialen.filter((m) => (aantallen[m.id] ?? 0) > 0);
  const geschatteHuur = geselecteerd.reduce((som, m) => som + m.huurtarief * (aantallen[m.id] ?? 0), 0);

  return (
    <form action={formAction} className="space-y-8">
      {/* Aanvrager */}
      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Gegevens aanvrager</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Naam vereniging / instelling <span className="text-red-600">*</span></label>
            <input name="verenigingNaam" className="input" required />
            <Fout tekst={vf.verenigingNaam} />
          </div>
          <div>
            <label className="label">Type aanvrager <span className="text-red-600">*</span></label>
            <select name="verenigingType" className="input" defaultValue="" required>
              <option value="" disabled>Maak een keuze…</option>
              {Object.entries(AANVRAGER_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Fout tekst={vf.verenigingType} />
          </div>
          <div>
            <label className="label">Telefoon</label>
            <input name="verenigingTelefoon" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adres</label>
            <input name="verenigingAdres" className="input" placeholder="Straat en nummer, postcode gemeente" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">E-mailadres vereniging</label>
            <input name="verenigingEmail" type="email" className="input" />
          </div>
        </div>
      </fieldset>

      {/* Contactpersoon */}
      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Contactpersoon</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Naam <span className="text-red-600">*</span></label>
            <input name="contactNaam" className="input" required />
            <Fout tekst={vf.contactNaam} />
          </div>
          <div>
            <label className="label">Functie</label>
            <input name="contactFunctie" className="input" />
          </div>
          <div>
            <label className="label">E-mail <span className="text-red-600">*</span></label>
            <input name="contactEmail" type="email" className="input" required />
            <Fout tekst={vf.contactEmail} />
          </div>
          <div>
            <label className="label">Telefoon</label>
            <input name="contactTelefoon" className="input" />
          </div>
        </div>
      </fieldset>

      {/* Evenement */}
      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Evenement</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Naam evenement <span className="text-red-600">*</span></label>
            <input name="evenementNaam" className="input" required />
            <Fout tekst={vf.evenementNaam} />
          </div>
          <div>
            <label className="label">Aard van de activiteit</label>
            <input name="evenementAard" className="input" placeholder="Fuif, buurtfeest, sportdag…" />
          </div>
          <div>
            <label className="label">Locatie</label>
            <input name="evenementLocatie" className="input" />
          </div>
          <div>
            <label className="label">Datum evenement</label>
            <input name="evenementDatum" type="date" className="input" />
          </div>
        </div>
      </fieldset>

      {/* Periode & levering */}
      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Uitleenperiode & levering</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Van (ophaling/levering) <span className="text-red-600">*</span></label>
            <input name="uitleenVan" type="date" className="input" required />
            <Fout tekst={vf.uitleenVan} />
          </div>
          <div>
            <label className="label">Tot (retour) <span className="text-red-600">*</span></label>
            <input name="uitleenTot" type="date" className="input" required />
            <Fout tekst={vf.uitleenTot} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Levering of afhaling? <span className="text-red-600">*</span></label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(LEVERINGSWIJZE_LABELS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="leveringswijze" value={k} required /> {v}
                </label>
              ))}
            </div>
            <Fout tekst={vf.leveringswijze} />
          </div>
        </div>
      </fieldset>

      {/* Materiaal */}
      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Gewenst materiaal</legend>
        <Fout tekst={vf.materiaal} />
        <div className="mt-3 space-y-6">
          {[...perCategorie.entries()].map(([categorie, items]) => (
            <div key={categorie}>
              <h3 className="mb-2 text-sm font-semibold text-londerzeel-inkt">{CATEGORIE_LABELS[categorie] ?? categorie}</h3>
              <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {items.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{m.naam}</p>
                      <p className="text-xs text-gray-500">
                        {m.totaalAantal} {m.eenheid ?? "stuk"} · {m.huurtarief > 0 ? `${euro(m.huurtarief)} / ${m.eenheid ?? "stuk"}` : "gratis"}
                        {m.capaciteitslimiet ? ` · max. ${m.capaciteitslimiet} p.p.` : ""}
                        {m.transportVereist ? " · transport vereist" : ""}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={m.totaalAantal}
                      name={`aantal_${m.id}`}
                      value={aantallen[m.id] ?? ""}
                      onChange={(e) =>
                        setAantallen((prev) => ({ ...prev, [m.id]: parseInt(e.target.value, 10) || 0 }))
                      }
                      className="input w-24"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {geselecteerd.length > 0 && (
          <div className="mt-4 rounded-md bg-londerzeel-geelLicht px-4 py-3 text-sm">
            <p className="font-medium">Voorlopige selectie ({geselecteerd.length} materiaal/soorten)</p>
            <p className="text-gray-600">Geschatte huur: {euro(geschatteHuur)} (excl. transport, onder voorbehoud van beschikbaarheid)</p>
          </div>
        )}
      </fieldset>

      {/* Opmerkingen */}
      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Opmerkingen</legend>
        <textarea name="opmerkingen" rows={3} className="input mt-3" placeholder="Bijkomende informatie voor de dienst…" />
      </fieldset>

      {state?.fout && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.fout}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="submit" className="btn-primary px-6 py-3 text-base" disabled={pending}>
          {pending ? "Bezig met indienen…" : "Aanvraag indienen"}
        </button>
      </div>
    </form>
  );
}
