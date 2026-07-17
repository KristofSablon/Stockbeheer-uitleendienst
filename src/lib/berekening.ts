import { getConfigGetal } from "./config";

// Kostberekening volgens de tarieftabel (sectie 9 / retributiereglement).
// De exacte transportregel is als configureerbare aanname geïmplementeerd en
// staat als openstaand punt in de functionele analyse; ze is hier transparant
// opgesplitst zodat de dienst ze eenvoudig kan valideren of aanpassen.

export type BerekeningRegel = {
  materiaalNaam: string;
  aantal: number;
  huurtariefPerStuk: number;
  transporttariefPerMateriaal: number;
  transportVereist: boolean;
  deelbedrag: number; // huur voor deze regel
};

export type Kostberekening = {
  regels: BerekeningRegel[];
  huur: number;
  transport: number;
  boete: number;
  schade: number;
  totaal: number;
};

export type BerekeningInvoer = {
  leveringswijze: string; // LEVERING | AFHALING
  regels: {
    materiaalNaam: string;
    aantal: number;
    huurtarief: number;
    transporttarief: number;
    transportVereist: boolean;
  }[];
  dagenTeLaat?: number;
  schadeKosten?: number;
};

export async function berekenKosten(invoer: BerekeningInvoer): Promise<Kostberekening> {
  const transportforfait = await getConfigGetal("TRANSPORTFORFAIT");
  const boetePerDag = await getConfigGetal("BOETE_PER_DAG");

  const regels: BerekeningRegel[] = invoer.regels.map((r) => ({
    materiaalNaam: r.materiaalNaam,
    aantal: r.aantal,
    huurtariefPerStuk: r.huurtarief,
    transporttariefPerMateriaal: r.transporttarief,
    transportVereist: r.transportVereist,
    deelbedrag: Math.round(r.huurtarief * r.aantal * 100) / 100,
  }));

  const huur = round2(regels.reduce((som, r) => som + r.deelbedrag, 0));

  // Transport: enkel bij levering. Forfait één keer (gecombineerd = 1×) indien
  // minstens één materiaal transport vereist, plus materiaal-specifieke
  // transporttarieven (bv. chalets) die apart worden aangerekend.
  let transport = 0;
  if (invoer.leveringswijze === "LEVERING") {
    const heeftTransport = invoer.regels.some((r) => r.transportVereist || r.transporttarief > 0);
    if (heeftTransport) transport += transportforfait;
    const specifiek = invoer.regels
      .filter((r) => r.transporttarief > 0)
      .reduce((som, r) => som + r.transporttarief, 0);
    transport += specifiek;
  }
  transport = round2(transport);

  const boete = round2((invoer.dagenTeLaat ?? 0) * boetePerDag);
  const schade = round2(invoer.schadeKosten ?? 0);
  const totaal = round2(huur + transport + boete + schade);

  return { regels, huur, transport, boete, schade, totaal };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
