"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessie, heeftRol } from "@/lib/auth";

async function vereisBeheer() {
  const sessie = await getSessie();
  if (!heeftRol(sessie, "BEHEERDER", "ADMIN")) throw new Error("Geen rechten");
}

export async function bewaarMateriaal(formData: FormData) {
  await vereisBeheer();
  const id = String(formData.get("id") ?? "");
  const data = {
    naam: String(formData.get("naam") ?? "").trim(),
    categorie: String(formData.get("categorie") ?? "ORGANISATORISCH"),
    totaalAantal: parseInt(String(formData.get("totaalAantal") ?? "0"), 10) || 0,
    huurtarief: parseFloat(String(formData.get("huurtarief") ?? "0")) || 0,
    transporttarief: parseFloat(String(formData.get("transporttarief") ?? "0")) || 0,
    transportVereist: formData.get("transportVereist") === "on",
    capaciteitslimiet: formData.get("capaciteitslimiet") ? parseInt(String(formData.get("capaciteitslimiet")), 10) : null,
    eenheid: String(formData.get("eenheid") ?? "stuk") || "stuk",
    omschrijving: String(formData.get("omschrijving") ?? "") || null,
    actief: formData.get("actief") !== "off",
  };
  if (!data.naam) throw new Error("Naam is verplicht");

  if (id) {
    await prisma.materiaal.update({ where: { id }, data });
  } else {
    await prisma.materiaal.create({ data });
  }
  revalidatePath("/backoffice/catalogus");
}

export async function wisselActief(formData: FormData) {
  await vereisBeheer();
  const id = String(formData.get("id"));
  const mat = await prisma.materiaal.findUnique({ where: { id } });
  if (mat) await prisma.materiaal.update({ where: { id }, data: { actief: !mat.actief } });
  revalidatePath("/backoffice/catalogus");
}
