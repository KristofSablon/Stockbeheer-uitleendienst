import { prisma } from "./prisma";

// Standaardwaarden voor de configureerbare parameters (bedrijfsregels sectie 9).
// Deze staan in de databank (model Configuratie) en kunnen door de Beheerder
// gewijzigd worden zonder code-aanpassing. Dit zijn de fallbackwaarden bij seed.
export const STANDAARD_CONFIG = {
  // Termijnen
  AANVRAAG_MIN_WEKEN: { waarde: "4", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Minimale aanvraagtermijn vooraf (weken)" },
  AANVRAAG_MAX_MAANDEN: { waarde: "12", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Maximale aanvraagtermijn vooraf (maanden)" },
  BEHANDELTERMIJN_WERKDAGEN: { waarde: "7", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Behandeltermijn (werkdagen)" },
  UITLEENTERMIJN_DAGEN: { waarde: "7", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Maximale uitleentermijn (kalenderdagen)" },
  BETALING_DAGEN_VOOR_LEVERING: { waarde: "7", type: "TERMIJN", categorie: "TERMIJNEN", omschrijving: "Betaling uiterlijk X dagen voor levering" },
  // Tarieven
  TRANSPORTFORFAIT: { waarde: "50", type: "TARIEF", categorie: "TARIEVEN", omschrijving: "Transportforfait heen en terug (€)" },
  BOETE_PER_DAG: { waarde: "25", type: "TARIEF", categorie: "TARIEVEN", omschrijving: "Boete per overschreden dag (€)" },
  EIGEN_HERSTEL_PER_UUR: { waarde: "50", type: "TARIEF", categorie: "TARIEVEN", omschrijving: "Eigen herstel per begonnen uur (€)" },
  NADAR_MAX_METER: { waarde: "60", type: "GETAL", categorie: "TARIEVEN", omschrijving: "Maximum nadar per aanvrager (meter)" },
  // Contact
  DIENST_NAAM: { waarde: "Uitleendienst — Dienst Openbaar Domein", type: "TEKST", categorie: "ALGEMEEN", omschrijving: "Naam van de dienst" },
  DIENST_ADRES: { waarde: "Malderendorp 14, 1840 Londerzeel", type: "TEKST", categorie: "ALGEMEEN", omschrijving: "Contactadres" },
  DIENST_EMAIL: { waarde: "uitleendienst@londerzeel.be", type: "TEKST", categorie: "ALGEMEEN", omschrijving: "Contact-e-mailadres" },
} as const;

export type ConfigSleutel = keyof typeof STANDAARD_CONFIG;

// Haalt een configuratiewaarde op; valt terug op de standaardwaarde.
export async function getConfig(sleutel: ConfigSleutel): Promise<string> {
  const rij = await prisma.configuratie.findUnique({ where: { sleutel } });
  return rij?.waarde ?? STANDAARD_CONFIG[sleutel].waarde;
}

export async function getConfigGetal(sleutel: ConfigSleutel): Promise<number> {
  return Number(await getConfig(sleutel));
}

export async function getAlleConfig(): Promise<Record<string, string>> {
  const rijen = await prisma.configuratie.findMany();
  const map: Record<string, string> = {};
  for (const key of Object.keys(STANDAARD_CONFIG)) {
    map[key] = STANDAARD_CONFIG[key as ConfigSleutel].waarde;
  }
  for (const rij of rijen) {
    map[rij.sleutel] = rij.waarde;
  }
  return map;
}
