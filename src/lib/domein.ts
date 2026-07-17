// Domeinconstanten voor de uitleendienst Londerzeel.
// Centrale plek voor statussen, rollen, categorieën, statusovergangen en labels,
// afgeleid uit de functionele analyse (secties 4, 5, 6, 8, 9).

// --- Rollen (sectie 4) ------------------------------------------------------

export const ROLLEN = {
  AANVRAGER: "AANVRAGER",
  ADMIN: "ADMIN", // Administratief medewerker Openbaar Domein
  PLOEGBAAS: "PLOEGBAAS", // Ploegbaas Dienst Gebouwen
  TECHNISCH: "TECHNISCH", // Technisch medewerker Uitleendienst
  MAGAZIJNIER: "MAGAZIJNIER",
  BEHEERDER: "BEHEERDER",
  BELEID: "BELEID", // Beleid (lezer)
} as const;

export type Rol = keyof typeof ROLLEN;

export const ROL_LABELS: Record<string, string> = {
  AANVRAGER: "Aanvrager",
  ADMIN: "Administratief medewerker Openbaar Domein",
  PLOEGBAAS: "Ploegbaas Dienst Gebouwen",
  TECHNISCH: "Technisch medewerker",
  MAGAZIJNIER: "Magazijnier",
  BEHEERDER: "Beheerder",
  BELEID: "Beleid (lezer)",
};

// --- Aanvragertype ----------------------------------------------------------

export const AANVRAGER_TYPES = {
  VERENIGING: "VERENIGING",
  ONDERWIJS: "ONDERWIJS",
  ORGANISATOR: "ORGANISATOR",
} as const;

export const AANVRAGER_TYPE_LABELS: Record<string, string> = {
  VERENIGING: "Erkende vereniging",
  ONDERWIJS: "Onderwijsinstelling",
  ORGANISATOR: "Organisator vergund evenement",
};

// --- Leveringswijze ---------------------------------------------------------

export const LEVERINGSWIJZE = {
  LEVERING: "LEVERING",
  AFHALING: "AFHALING",
} as const;

export const LEVERINGSWIJZE_LABELS: Record<string, string> = {
  LEVERING: "Levering door de dienst",
  AFHALING: "Zelf afhalen in het magazijn",
};

// --- Statusmodel dossier (sectie 6) -----------------------------------------

export const STATUS = {
  INGEDIEND: "INGEDIEND",
  IN_BEHANDELING: "IN_BEHANDELING",
  WACHT_OP_AANVULLING: "WACHT_OP_AANVULLING",
  GOEDGEKEURD: "GOEDGEKEURD",
  GEWEIGERD: "GEWEIGERD",
  BEVESTIGD: "BEVESTIGD", // Bevestigd — wacht op betaling
  BETAALD: "BETAALD", // Betaald / klaar voor uitvoering
  KLAARGEZET: "KLAARGEZET",
  UITGELEVERD: "UITGELEVERD",
  GERETOURNEERD: "GERETOURNEERD",
  IN_CONTROLE: "IN_CONTROLE",
  SCHADE_VASTGESTELD: "SCHADE_VASTGESTELD",
  AFGESLOTEN: "AFGESLOTEN",
  GEANNULEERD: "GEANNULEERD",
} as const;

export type Status = keyof typeof STATUS;

export const STATUS_LABELS: Record<string, string> = {
  INGEDIEND: "Ingediend",
  IN_BEHANDELING: "In behandeling",
  WACHT_OP_AANVULLING: "Wacht op aanvulling",
  GOEDGEKEURD: "Goedgekeurd",
  GEWEIGERD: "Geweigerd",
  BEVESTIGD: "Bevestigd — wacht op betaling",
  BETAALD: "Betaald / klaar voor uitvoering",
  KLAARGEZET: "Klaargezet",
  UITGELEVERD: "Uitgeleverd",
  GERETOURNEERD: "Geretourneerd",
  IN_CONTROLE: "In controle",
  SCHADE_VASTGESTELD: "Schade vastgesteld",
  AFGESLOTEN: "Afgesloten",
  GEANNULEERD: "Geannuleerd",
};

// Toegelaten statusovergangen (sectie 6).
export const STATUS_OVERGANGEN: Record<string, string[]> = {
  INGEDIEND: ["IN_BEHANDELING", "GEANNULEERD"],
  IN_BEHANDELING: ["WACHT_OP_AANVULLING", "GOEDGEKEURD", "GEWEIGERD"],
  WACHT_OP_AANVULLING: ["IN_BEHANDELING", "GEANNULEERD"],
  GOEDGEKEURD: ["BEVESTIGD", "GEANNULEERD"],
  GEWEIGERD: [],
  BEVESTIGD: ["BETAALD", "GEANNULEERD"],
  BETAALD: ["KLAARGEZET", "GEANNULEERD"],
  KLAARGEZET: ["UITGELEVERD"],
  UITGELEVERD: ["GERETOURNEERD"],
  GERETOURNEERD: ["IN_CONTROLE"],
  IN_CONTROLE: ["AFGESLOTEN", "SCHADE_VASTGESTELD"],
  SCHADE_VASTGESTELD: ["AFGESLOTEN"],
  AFGESLOTEN: [],
  GEANNULEERD: [],
};

export const EIND_STATUSSEN = ["GEWEIGERD", "AFGESLOTEN", "GEANNULEERD"];

// Kleuraanduiding (Tailwind-klassen) per status voor badges.
export const STATUS_KLEUR: Record<string, string> = {
  INGEDIEND: "bg-blue-100 text-blue-800",
  IN_BEHANDELING: "bg-amber-100 text-amber-800",
  WACHT_OP_AANVULLING: "bg-orange-100 text-orange-800",
  GOEDGEKEURD: "bg-green-100 text-green-800",
  GEWEIGERD: "bg-red-100 text-red-800",
  BEVESTIGD: "bg-purple-100 text-purple-800",
  BETAALD: "bg-teal-100 text-teal-800",
  KLAARGEZET: "bg-cyan-100 text-cyan-800",
  UITGELEVERD: "bg-indigo-100 text-indigo-800",
  GERETOURNEERD: "bg-lime-100 text-lime-800",
  IN_CONTROLE: "bg-yellow-100 text-yellow-800",
  SCHADE_VASTGESTELD: "bg-rose-100 text-rose-800",
  AFGESLOTEN: "bg-gray-200 text-gray-800",
  GEANNULEERD: "bg-gray-100 text-gray-500",
};

export function magOvergang(van: string, naar: string): boolean {
  return (STATUS_OVERGANGEN[van] ?? []).includes(naar);
}

// --- Materiaalcategorieën (sectie 5 spec / inventaris) ----------------------

export const CATEGORIEEN = {
  PODIUM: "PODIUM",
  ORGANISATORISCH: "ORGANISATORISCH",
  SPORT_SPEL: "SPORT_SPEL",
  AUDIOVISUEEL: "AUDIOVISUEEL",
  GELUID: "GELUID",
  TENTOONSTELLING: "TENTOONSTELLING",
} as const;

export const CATEGORIE_LABELS: Record<string, string> = {
  PODIUM: "Podium",
  ORGANISATORISCH: "Organisatorisch",
  SPORT_SPEL: "Sport & spel",
  AUDIOVISUEEL: "Audiovisueel",
  GELUID: "Geluid",
  TENTOONSTELLING: "Tentoonstelling",
};

// --- Werkopdrachten ---------------------------------------------------------

export const WERKOPDRACHT_TYPE = {
  LEVERING: "LEVERING",
  AFHALING: "AFHALING",
  RETOUR: "RETOUR",
} as const;

export const WERKOPDRACHT_TYPE_LABELS: Record<string, string> = {
  LEVERING: "Levering",
  AFHALING: "Afhaling",
  RETOUR: "Retour / ophaling",
};

export const WERKOPDRACHT_STATUS_LABELS: Record<string, string> = {
  GEPLAND: "Gepland",
  TOEGEWEZEN: "Toegewezen",
  UITGEVOERD: "Uitgevoerd",
  GEANNULEERD: "Geannuleerd",
};

// --- Schade -----------------------------------------------------------------

export const SCHADE_ACTIE_LABELS: Record<string, string> = {
  EIGEN_HERSTEL: "Eigen herstel (€ 50 / begonnen uur)",
  EXTERN_HERSTEL: "Extern herstel (integraal)",
  VERVANGING: "Vervanging (integraal)",
};

// --- Betaalstatus -----------------------------------------------------------

export const BETAALSTATUS_LABELS: Record<string, string> = {
  OPEN: "Openstaand",
  BETAALD: "Betaald",
  VERVALLEN: "Vervallen",
  GEANNULEERD: "Geannuleerd",
};

// --- Hulpfuncties -----------------------------------------------------------

export function rollenNaarArray(rollen: string | null | undefined): string[] {
  if (!rollen) return [];
  return rollen.split(",").map((r) => r.trim()).filter(Boolean);
}

export function label(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
