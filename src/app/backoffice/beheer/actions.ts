"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessie, heeftRol } from "@/lib/auth";
import { hashWachtwoord } from "@/lib/wachtwoord";

async function vereisBeheerder() {
  const sessie = await getSessie();
  if (!heeftRol(sessie, "BEHEERDER")) throw new Error("Enkel de beheerder mag dit.");
}

export async function bewaarConfiguratie(formData: FormData) {
  await vereisBeheerder();
  // Alle velden met prefix cfg_ opslaan.
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cfg_")) {
      const sleutel = key.slice("cfg_".length);
      await prisma.configuratie.updateMany({ where: { sleutel }, data: { waarde: String(value) } });
    }
  }
  revalidatePath("/backoffice/beheer");
}

export async function bewaarGebruiker(formData: FormData) {
  await vereisBeheerder();
  const id = String(formData.get("id") ?? "");
  const naam = String(formData.get("naam") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rollen = formData.getAll("rollen").map(String).join(",");
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  const actief = formData.get("actief") !== "off";

  if (!naam || !email) throw new Error("Naam en e-mail zijn verplicht.");

  if (id) {
    const data: Record<string, unknown> = { naam, email, rollen, actief };
    if (wachtwoord) data.wachtwoordHash = hashWachtwoord(wachtwoord);
    await prisma.gebruiker.update({ where: { id }, data });
  } else {
    await prisma.gebruiker.create({
      data: { naam, email, rollen: rollen || "BELEID", actief, wachtwoordHash: hashWachtwoord(wachtwoord || "londerzeel") },
    });
  }
  revalidatePath("/backoffice/beheer");
}
