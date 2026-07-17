"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nieuwReferentienummer } from "@/lib/referentie";
import { getConfigGetal } from "@/lib/config";
import { STATUS } from "@/lib/domein";

export type AanvraagResultaat = { fout?: string; veldFouten?: Record<string, string> };

export async function dienAanvraagIn(_prev: unknown, formData: FormData): Promise<AanvraagResultaat> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const verenigingNaam = get("verenigingNaam");
  const verenigingType = get("verenigingType");
  const contactNaam = get("contactNaam");
  const contactEmail = get("contactEmail");
  const evenementNaam = get("evenementNaam");
  const leveringswijze = get("leveringswijze");
  const uitleenVan = get("uitleenVan");
  const uitleenTot = get("uitleenTot");

  const veldFouten: Record<string, string> = {};
  if (!verenigingNaam) veldFouten.verenigingNaam = "Verplicht veld.";
  if (!verenigingType) veldFouten.verenigingType = "Kies een type.";
  if (!contactNaam) veldFouten.contactNaam = "Verplicht veld.";
  if (!contactEmail) veldFouten.contactEmail = "Verplicht veld.";
  if (!evenementNaam) veldFouten.evenementNaam = "Verplicht veld.";
  if (!leveringswijze) veldFouten.leveringswijze = "Maak een keuze.";
  if (!uitleenVan) veldFouten.uitleenVan = "Verplicht veld.";
  if (!uitleenTot) veldFouten.uitleenTot = "Verplicht veld.";

  // Materiaalselectie inlezen (velden aantal_<id>).
  const regels: { materiaalId: string; gevraagdAantal: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("aantal_")) {
      const aantal = parseInt(String(value), 10);
      if (aantal > 0) {
        regels.push({ materiaalId: key.slice("aantal_".length), gevraagdAantal: aantal });
      }
    }
  }
  if (regels.length === 0) veldFouten.materiaal = "Selecteer minstens één materiaal met een aantal.";

  // Datumvalidatie.
  let van: Date | null = null;
  let tot: Date | null = null;
  if (uitleenVan && uitleenTot) {
    van = new Date(uitleenVan);
    tot = new Date(uitleenTot);
    if (tot < van) veldFouten.uitleenTot = "Einddatum ligt vóór de begindatum.";

    const minWeken = await getConfigGetal("AANVRAAG_MIN_WEKEN");
    const maxMaanden = await getConfigGetal("AANVRAAG_MAX_MAANDEN");
    const uitleentermijn = await getConfigGetal("UITLEENTERMIJN_DAGEN");

    const nu = new Date();
    const minDatum = new Date(nu);
    minDatum.setDate(minDatum.getDate() + minWeken * 7);
    const maxDatum = new Date(nu);
    maxDatum.setMonth(maxDatum.getMonth() + maxMaanden);

    if (van < minDatum) {
      veldFouten.uitleenVan = `Aanvraag moet minstens ${minWeken} weken vooraf gebeuren.`;
    }
    if (van > maxDatum) {
      veldFouten.uitleenVan = `Aanvraag mag maximaal ${maxMaanden} maanden vooraf gebeuren.`;
    }
    const dagen = Math.round((tot.getTime() - van.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (dagen > uitleentermijn) {
      veldFouten.uitleenTot = `De uitleentermijn bedraagt maximaal ${uitleentermijn} kalenderdagen.`;
    }
  }

  if (Object.keys(veldFouten).length > 0) {
    return { fout: "Kijk de gemarkeerde velden na.", veldFouten };
  }

  const referentienummer = await nieuwReferentienummer();

  await prisma.dossier.create({
    data: {
      referentienummer,
      status: STATUS.INGEDIEND,
      leveringswijze,
      uitleenVan: van!,
      uitleenTot: tot!,
      opmerkingen: get("opmerkingen") || null,
      aanvrager: {
        create: {
          naam: verenigingNaam,
          type: verenigingType,
          adres: get("verenigingAdres") || null,
          telefoon: get("verenigingTelefoon") || null,
          email: get("verenigingEmail") || contactEmail,
          contactpersonen: {
            create: {
              naam: contactNaam,
              telefoon: get("contactTelefoon") || null,
              email: contactEmail,
              functie: get("contactFunctie") || null,
            },
          },
        },
      },
      evenement: {
        create: {
          naam: evenementNaam,
          locatie: get("evenementLocatie") || null,
          datum: get("evenementDatum") ? new Date(get("evenementDatum")) : van,
          aardActiviteit: get("evenementAard") || null,
        },
      },
      regels: { create: regels },
      statusHistoriek: {
        create: { naarStatus: STATUS.INGEDIEND, opmerking: "Aanvraag ingediend via e-formulier" },
      },
      notificaties: {
        create: {
          type: "ONTVANGSTBEVESTIGING",
          ontvanger: contactEmail,
          kanaal: "EMAIL",
          onderwerp: `Ontvangstbevestiging aanvraag ${referentienummer}`,
          inhoud:
            `Beste ${contactNaam},\n\nWe ontvingen uw aanvraag bij de uitleendienst van Londerzeel. ` +
            `Uw referentienummer is ${referentienummer}. U kunt de status van uw aanvraag online opvolgen.\n\n` +
            `Met vriendelijke groeten,\nUitleendienst Londerzeel`,
        },
      },
    },
  });

  // Koppel de aanvrager aan de contactpersoon op het dossier.
  const aangemaakt = await prisma.dossier.findUnique({
    where: { referentienummer },
    include: { aanvrager: { include: { contactpersonen: true } } },
  });
  if (aangemaakt?.aanvrager.contactpersonen[0]) {
    await prisma.dossier.update({
      where: { referentienummer },
      data: { contactpersoonId: aangemaakt.aanvrager.contactpersonen[0].id },
    });
  }

  redirect(`/aanvraag/bevestiging/${referentienummer}`);
}
