"use server";

import { redirect } from "next/navigation";
import { aanmelden } from "@/lib/auth";

export async function loginActie(_prev: unknown, formData: FormData): Promise<{ fout?: string }> {
  const email = String(formData.get("email") ?? "");
  const wachtwoord = String(formData.get("wachtwoord") ?? "");

  if (!email || !wachtwoord) {
    return { fout: "Vul e-mailadres en wachtwoord in." };
  }

  const sessie = await aanmelden(email, wachtwoord);
  if (!sessie) {
    return { fout: "Onjuist e-mailadres of wachtwoord." };
  }

  redirect("/backoffice");
}
