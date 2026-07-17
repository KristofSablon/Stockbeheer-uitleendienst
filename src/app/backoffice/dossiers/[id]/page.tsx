import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessie } from "@/lib/auth";
import { StatusBadge } from "@/components/Merk";
import {
  STATUS,
  STATUS_LABELS,
  STATUS_KLEUR,
  LEVERINGSWIJZE_LABELS,
  AANVRAGER_TYPE_LABELS,
  WERKOPDRACHT_TYPE_LABELS,
  WERKOPDRACHT_STATUS_LABELS,
  SCHADE_ACTIE_LABELS,
  BETAALSTATUS_LABELS,
  magOvergang,
} from "@/lib/domein";
import { datum, datumTijd, euro } from "@/lib/format";
import { stockcheck } from "@/lib/beschikbaarheid";
import { berekenKosten } from "@/lib/berekening";
import {
  zetStatus,
  goedkeuren,
  weigeren,
  wachtOpAanvulling,
  bevestigen,
  markeerBetaald,
  slaOntvangstbewijsOp,
} from "./actions";
import RetourFormulier from "./RetourFormulier";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "behandeling", label: "Materialen & behandeling" },
  { key: "planning", label: "Planning" },
  { key: "financien", label: "Financiën" },
  { key: "documenten", label: "Documenten" },
  { key: "historiek", label: "Historiek" },
];

export default async function DossierDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overzicht" } = await searchParams;
  const sessie = await getSessie();

  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      aanvrager: true,
      contactpersoon: true,
      evenement: true,
      regels: { include: { materiaal: true } },
      werkopdrachten: { include: { medewerker: true } },
      ontvangstbewijs: { include: { regels: true } },
      retourformulier: { include: { regels: true } },
      schadegevallen: { include: { materiaal: true } },
      factuur: true,
      notificaties: { orderBy: { tijdstip: "desc" } },
      statusHistoriek: { orderBy: { tijdstip: "desc" } },
    },
  });

  if (!dossier) notFound();

  // Stockcheck voor de behandeling.
  const check = await stockcheck(
    dossier.regels.map((r) => ({ materiaalId: r.materiaalId, gevraagdAantal: r.gevraagdAantal })),
    dossier.uitleenVan,
    dossier.uitleenTot,
    dossier.id
  );
  const checkPerMateriaal = new Map(check.regels.map((r) => [r.materiaalId, r]));

  // Voorlopige kostberekening voor het financiën-tabblad.
  const kost = await berekenKosten({
    leveringswijze: dossier.leveringswijze,
    regels: dossier.regels.map((r) => ({
      materiaalNaam: r.materiaal.naam,
      aantal: r.toegekendAantal || r.gevraagdAantal,
      huurtarief: r.materiaal.huurtarief,
      transporttarief: r.materiaal.transporttarief,
      transportVereist: r.materiaal.transportVereist,
    })),
  });

  const rol = sessie?.rollen ?? [];
  const magBehandelen = rol.some((r) => ["ADMIN", "BEHEERDER"].includes(r));

  return (
    <div className="space-y-5">
      {/* Kop */}
      <div>
        <Link href="/backoffice/dossiers" className="text-sm text-gray-500 hover:underline">← Alle dossiers</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-2xl font-bold">{dossier.referentienummer}</h1>
            <p className="text-sm text-gray-600">{dossier.aanvrager.naam} · {dossier.evenement?.naam ?? "—"}</p>
          </div>
          <StatusBadge label={STATUS_LABELS[dossier.status] ?? dossier.status} kleur={STATUS_KLEUR[dossier.status] ?? ""} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/backoffice/dossiers/${dossier.id}?tab=${t.key}`}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t.key
                  ? "border-londerzeel-geel text-londerzeel-inkt"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* --- Overzicht --- */}
      {tab === "overzicht" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Aanvrager & contact</h2>
            <dl className="grid gap-2 text-sm">
              <Rij label="Vereniging" waarde={dossier.aanvrager.naam} />
              <Rij label="Type" waarde={AANVRAGER_TYPE_LABELS[dossier.aanvrager.type] ?? dossier.aanvrager.type} />
              <Rij label="Adres" waarde={dossier.aanvrager.adres ?? "—"} />
              <Rij label="Contactpersoon" waarde={dossier.contactpersoon?.naam ?? "—"} />
              <Rij label="E-mail" waarde={dossier.contactpersoon?.email ?? dossier.aanvrager.email ?? "—"} />
              <Rij label="Telefoon" waarde={dossier.contactpersoon?.telefoon ?? dossier.aanvrager.telefoon ?? "—"} />
            </dl>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Evenement & periode</h2>
            <dl className="grid gap-2 text-sm">
              <Rij label="Evenement" waarde={dossier.evenement?.naam ?? "—"} />
              <Rij label="Locatie" waarde={dossier.evenement?.locatie ?? "—"} />
              <Rij label="Aard" waarde={dossier.evenement?.aardActiviteit ?? "—"} />
              <Rij label="Uitleenperiode" waarde={`${datum(dossier.uitleenVan)} – ${datum(dossier.uitleenTot)}`} />
              <Rij label="Levering" waarde={LEVERINGSWIJZE_LABELS[dossier.leveringswijze]} />
              <Rij label="Aangevraagd op" waarde={datum(dossier.aanvraagdatum)} />
            </dl>
          </div>
          {dossier.opmerkingen && (
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-2 font-semibold">Opmerking aanvrager</h2>
              <p className="text-sm text-gray-700">{dossier.opmerkingen}</p>
            </div>
          )}
          {dossier.weigeringReden && (
            <div className="card border-red-200 bg-red-50 p-5 lg:col-span-2">
              <h2 className="mb-2 font-semibold text-red-800">Reden weigering</h2>
              <p className="text-sm text-red-700">{dossier.weigeringReden}</p>
            </div>
          )}
        </div>
      )}

      {/* --- Behandeling --- */}
      {tab === "behandeling" && (
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="font-semibold">Materialen & stockcheck</h2>
              <p className="text-sm text-gray-500">Beschikbaarheid berekend voor {datum(dossier.uitleenVan)} – {datum(dossier.uitleenTot)}</p>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Materiaal</th>
                  <th className="th">Gevraagd</th>
                  <th className="th">Beschikbaar</th>
                  <th className="th">Toegekend</th>
                  <th className="th">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dossier.regels.map((r) => {
                  const c = checkPerMateriaal.get(r.materiaalId);
                  return (
                    <tr key={r.id}>
                      <td className="td font-medium">{r.materiaal.naam}</td>
                      <td className="td">{r.gevraagdAantal} {r.materiaal.eenheid ?? ""}</td>
                      <td className="td">{c?.beschikbaar ?? "?"}</td>
                      <td className="td">{r.toegekendAantal || "—"}</td>
                      <td className="td">
                        {c?.voldoende ? (
                          <span className="badge bg-green-100 text-green-800">Voldoende</span>
                        ) : c?.overschrijdtCapaciteit ? (
                          <span className="badge bg-orange-100 text-orange-800">Boven capaciteitslimiet ({c.capaciteitslimiet})</span>
                        ) : (
                          <span className="badge bg-red-100 text-red-800">Onvoldoende voorraad</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!magBehandelen && (
            <p className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">
              U hebt geen rechten om dit dossier te behandelen (enkel Admin/Beheerder).
            </p>
          )}

          {magBehandelen && dossier.status === STATUS.INGEDIEND && (
            <form action={zetStatus} className="card p-5">
              <input type="hidden" name="dossierId" value={dossier.id} />
              <input type="hidden" name="naarStatus" value={STATUS.IN_BEHANDELING} />
              <p className="mb-3 text-sm text-gray-600">Neem dit dossier in behandeling om het te beoordelen.</p>
              <button className="btn-primary" type="submit">In behandeling nemen</button>
            </form>
          )}

          {magBehandelen && (dossier.status === STATUS.IN_BEHANDELING || dossier.status === STATUS.WACHT_OP_AANVULLING) && (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Goedkeuren */}
              <form action={goedkeuren} className="card p-5 lg:col-span-1">
                <input type="hidden" name="dossierId" value={dossier.id} />
                <h3 className="mb-2 font-semibold text-green-700">Goedkeuren</h3>
                <p className="mb-3 text-xs text-gray-500">Pas eventueel de toegekende aantallen aan.</p>
                <div className="space-y-2">
                  {dossier.regels.map((r) => (
                    <label key={r.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{r.materiaal.naam}</span>
                      <input
                        type="number"
                        name={`toegekend_${r.id}`}
                        min={0}
                        defaultValue={r.toegekendAantal || r.gevraagdAantal}
                        className="input w-20"
                      />
                    </label>
                  ))}
                </div>
                <button className="btn-success mt-4 w-full" type="submit" disabled={!magOvergang(dossier.status, STATUS.GOEDGEKEURD)}>
                  Goedkeuren
                </button>
              </form>

              {/* Wacht op aanvulling */}
              <form action={wachtOpAanvulling} className="card p-5">
                <input type="hidden" name="dossierId" value={dossier.id} />
                <h3 className="mb-2 font-semibold text-orange-700">Info opvragen</h3>
                <textarea name="opmerking" rows={3} className="input" placeholder="Welke aanvulling is nodig?" />
                <button className="btn-secondary mt-3 w-full" type="submit" disabled={!magOvergang(dossier.status, STATUS.WACHT_OP_AANVULLING)}>
                  Wacht op aanvulling
                </button>
              </form>

              {/* Weigeren */}
              <form action={weigeren} className="card p-5">
                <input type="hidden" name="dossierId" value={dossier.id} />
                <h3 className="mb-2 font-semibold text-red-700">Weigeren</h3>
                <textarea name="reden" rows={3} className="input" placeholder="Reden voor weigering (verplicht)" required />
                <button className="btn-danger mt-3 w-full" type="submit">Weigeren</button>
              </form>
            </div>
          )}

          {dossier.status === STATUS.GOEDGEKEURD && (
            <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              Dit dossier is goedgekeurd. Ga naar het tabblad <strong>Financiën</strong> om te bevestigen en te factureren.
            </div>
          )}
        </div>
      )}

      {/* --- Planning --- */}
      {tab === "planning" && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Werkopdrachten</h2>
            {dossier.werkopdrachten.length === 0 ? (
              <p className="text-sm text-gray-500">Nog geen werkopdrachten. Deze worden aangemaakt bij goedkeuring.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {dossier.werkopdrachten.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium">{WERKOPDRACHT_TYPE_LABELS[w.type] ?? w.type}</p>
                      <p className="text-xs text-gray-500">
                        {datum(w.datum)} {w.tijdsvenster ? `· ${w.tijdsvenster}` : ""} · {w.medewerker?.naam ?? "niet toegewezen"}
                        {w.topdeskRef ? ` · Top-desk ${w.topdeskRef}` : ""}
                      </p>
                    </div>
                    <span className="badge bg-gray-100 text-gray-700">{WERKOPDRACHT_STATUS_LABELS[w.status] ?? w.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-400">Toewijzen van medewerkers gebeurt op het scherm <Link href="/backoffice/planning" className="underline">Planning &amp; werkopdrachten</Link>.</p>
          </div>

          {/* Uitvoeringsknoppen */}
          {["BETAALD", "KLAARGEZET", "UITGELEVERD", "GERETOURNEERD"].includes(dossier.status) && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold">Uitvoeringsstappen</h2>
              <div className="flex flex-wrap gap-3">
                {magOvergang(dossier.status, STATUS.KLAARGEZET) && (
                  <StatusKnop dossierId={dossier.id} naar={STATUS.KLAARGEZET} label="Materiaal klaargezet" klasse="btn-primary" />
                )}
                {magOvergang(dossier.status, STATUS.GERETOURNEERD) && (
                  <StatusKnop dossierId={dossier.id} naar={STATUS.GERETOURNEERD} label="Materiaal geretourneerd" klasse="btn-secondary" />
                )}
                {magOvergang(dossier.status, STATUS.IN_CONTROLE) && (
                  <StatusKnop dossierId={dossier.id} naar={STATUS.IN_CONTROLE} label="Start retourcontrole" klasse="btn-primary" />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Financiën --- */}
      {tab === "financien" && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Kostenoverzicht</h2>
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {kost.regels.map((r, i) => (
                  <tr key={i}>
                    <td className="td">{r.materiaalNaam} × {r.aantal}</td>
                    <td className="td text-right">{euro(r.deelbedrag)}</td>
                  </tr>
                ))}
                <tr className="font-medium"><td className="td">Huur (subtotaal)</td><td className="td text-right">{euro(kost.huur)}</td></tr>
                <tr><td className="td">Transport</td><td className="td text-right">{euro(kost.transport)}</td></tr>
                {dossier.factuur && dossier.factuur.bedragSchade > 0 && (
                  <tr><td className="td">Schade</td><td className="td text-right">{euro(dossier.factuur.bedragSchade)}</td></tr>
                )}
                {dossier.factuur && dossier.factuur.boete > 0 && (
                  <tr><td className="td">Boete laattijdig</td><td className="td text-right">{euro(dossier.factuur.boete)}</td></tr>
                )}
                <tr className="border-t-2 border-gray-200 text-base font-bold">
                  <td className="td">Totaal</td>
                  <td className="td text-right">{euro(dossier.factuur?.totaal ?? kost.totaal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Factuur & betaling</h2>
            {dossier.factuur ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Rij label="Totaalbedrag" waarde={euro(dossier.factuur.totaal)} />
                <Rij label="Vervaldag" waarde={datum(dossier.factuur.vervaldag)} />
                <Rij label="Betaalstatus" waarde={BETAALSTATUS_LABELS[dossier.factuur.betaalstatus] ?? dossier.factuur.betaalstatus} />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">Nog geen factuur. Bevestig het dossier om de factuurgegevens aan te maken.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {magBehandelen && magOvergang(dossier.status, STATUS.BEVESTIGD) && (
                <form action={bevestigen}>
                  <input type="hidden" name="dossierId" value={dossier.id} />
                  <button className="btn-primary" type="submit">Bevestigen & factuur aanmaken</button>
                </form>
              )}
              {magBehandelen && magOvergang(dossier.status, STATUS.BETAALD) && (
                <form action={markeerBetaald}>
                  <input type="hidden" name="dossierId" value={dossier.id} />
                  <button className="btn-success" type="submit">Betaling registreren</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Documenten --- */}
      {tab === "documenten" && (
        <div className="space-y-5">
          {/* Ontvangstbewijs */}
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Ontvangstbewijs</h2>
            {dossier.ontvangstbewijs ? (
              <div className="text-sm">
                <p className="text-gray-600">Opgemaakt op {datumTijd(dossier.ontvangstbewijs.datumTijd)} · geplande retour {datum(dossier.ontvangstbewijs.geplandeRetour)}</p>
                <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
                  {dossier.ontvangstbewijs.regels.map((r) => (
                    <li key={r.id} className="flex justify-between px-3 py-1.5"><span>{r.materiaalNaam}</span><span className="text-gray-500">{r.aantal} · {r.staatBijLevering}</span></li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-gray-500">Handtekeningen: {dossier.ontvangstbewijs.handtekeningAanvrager || "—"} (aanvrager) · {dossier.ontvangstbewijs.handtekeningMedewerker || "—"} (dienst)</p>
              </div>
            ) : ["BETAALD", "KLAARGEZET"].includes(dossier.status) ? (
              <form action={slaOntvangstbewijsOp} className="space-y-3">
                <input type="hidden" name="dossierId" value={dossier.id} />
                <p className="text-sm text-gray-600">Bevestig de levering/afhaling en leg de handtekeningen vast. De materialen worden overgenomen uit het dossier.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Handtekening aanvrager (naam)</label>
                    <input name="handtekeningAanvrager" className="input" required />
                  </div>
                  <div>
                    <label className="label">Handtekening dienst (naam)</label>
                    <input name="handtekeningMedewerker" className="input" defaultValue={sessie?.naam ?? ""} />
                  </div>
                </div>
                <textarea name="opmerkingen" rows={2} className="input" placeholder="Opmerkingen bij levering…" />
                <button className="btn-primary" type="submit">Ontvangstbewijs ondertekenen</button>
              </form>
            ) : (
              <p className="text-sm text-gray-500">Het ontvangstbewijs kan opgemaakt worden zodra het dossier betaald/klaargezet is.</p>
            )}
          </div>

          {/* Retourformulier */}
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Retourformulier & controle</h2>
            {dossier.retourformulier ? (
              <div className="text-sm">
                <p className="text-gray-600">Retour op {datum(dossier.retourformulier.retourdatum)} · {dossier.retourformulier.algemeneStatus === "SCHADE" ? "schade vastgesteld" : "geen schade"}</p>
                <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
                  {dossier.retourformulier.regels.map((r) => (
                    <li key={r.id} className="flex justify-between px-3 py-1.5">
                      <span>{r.materiaalNaam}</span>
                      <span className={r.beoordeling === "SCHADE" ? "text-rose-600" : "text-green-600"}>{r.beoordeling}{r.opmerking ? ` — ${r.opmerking}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : dossier.status === STATUS.IN_CONTROLE ? (
              <RetourFormulier
                dossierId={dossier.id}
                geplandeRetour={dossier.uitleenTot.toISOString()}
                regels={dossier.regels.map((r) => ({ id: r.id, materiaalNaam: r.materiaal.naam, aantal: r.toegekendAantal || r.gevraagdAantal }))}
              />
            ) : (
              <p className="text-sm text-gray-500">Start de retourcontrole (tabblad Planning) om het retourformulier in te vullen.</p>
            )}
          </div>

          {dossier.schadegevallen.length > 0 && (
            <div className="card border-rose-200 p-5">
              <h2 className="mb-3 font-semibold text-rose-700">Schadegevallen</h2>
              <ul className="divide-y divide-gray-100 text-sm">
                {dossier.schadegevallen.map((s) => (
                  <li key={s.id} className="py-2">
                    <p className="font-medium">{s.materiaal?.naam ?? "Materiaal"} — {euro(s.effectieveKost ?? s.geraamdeKost)}</p>
                    <p className="text-xs text-gray-500">{SCHADE_ACTIE_LABELS[s.actie] ?? s.actie} · {s.omschrijving}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* --- Historiek --- */}
      {tab === "historiek" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Statushistoriek</h2>
            <ol className="space-y-3">
              {dossier.statusHistoriek.map((h) => (
                <li key={h.id} className="border-l-2 border-londerzeel-geel pl-3 text-sm">
                  <p className="font-medium">{STATUS_LABELS[h.naarStatus] ?? h.naarStatus}</p>
                  <p className="text-xs text-gray-500">{datumTijd(h.tijdstip)} · {h.doorGebruiker ?? "systeem"}{h.opmerking ? ` — ${h.opmerking}` : ""}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Verzonden communicatie</h2>
            {dossier.notificaties.length === 0 ? (
              <p className="text-sm text-gray-500">Nog geen notificaties.</p>
            ) : (
              <ul className="space-y-3">
                {dossier.notificaties.map((n) => (
                  <li key={n.id} className="rounded-md bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{n.onderwerp}</p>
                    <p className="text-xs text-gray-500">{datumTijd(n.tijdstip)} · {n.kanaal} · {n.ontvanger ?? "—"}</p>
                    {n.inhoud && <p className="mt-1 whitespace-pre-line text-xs text-gray-600">{n.inhoud}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Annuleren (altijd beschikbaar indien toegelaten) */}
      {magBehandelen && magOvergang(dossier.status, STATUS.GEANNULEERD) && (
        <form action={zetStatus} className="pt-2">
          <input type="hidden" name="dossierId" value={dossier.id} />
          <input type="hidden" name="naarStatus" value={STATUS.GEANNULEERD} />
          <button className="text-sm text-gray-400 hover:text-red-600 hover:underline" type="submit">Dossier annuleren</button>
        </form>
      )}
    </div>
  );
}

function Rij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{waarde}</dd>
    </div>
  );
}

function StatusKnop({ dossierId, naar, label, klasse }: { dossierId: string; naar: string; label: string; klasse: string }) {
  return (
    <form action={zetStatus}>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="naarStatus" value={naar} />
      <button className={klasse} type="submit">{label}</button>
    </form>
  );
}
