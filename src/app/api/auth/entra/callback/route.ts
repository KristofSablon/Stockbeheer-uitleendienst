import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { startSessie } from "@/lib/auth";
import { hashWachtwoord } from "@/lib/wachtwoord";
import { entraConfig, wisselCodeIn, valideerIdToken, profielUitToken } from "@/lib/entra";

// Rondt de aanmelding met het gemeente-account af: valideert state en ID-token,
// zoekt of maakt de gebruiker, en start de gewone app-sessie.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const naarLogin = (fout: string) => {
    const res = NextResponse.redirect(new URL(`/login?fout=${fout}`, url.origin));
    for (const naam of ["entra_state", "entra_nonce", "entra_verifier"]) res.cookies.delete(naam);
    return res;
  };

  const cfg = entraConfig();
  if (!cfg) return naarLogin("sso-niet-geconfigureerd");

  // Fout vanuit Microsoft (bv. gebruiker weigerde of heeft geen toewijzing).
  if (url.searchParams.get("error")) return naarLogin("sso-geweigerd");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const verwachteState = cookieStore.get("entra_state")?.value;
  const nonce = cookieStore.get("entra_nonce")?.value;
  const verifier = cookieStore.get("entra_verifier")?.value;

  if (!code || !state || !verwachteState || state !== verwachteState || !nonce || !verifier) {
    return naarLogin("sso-sessie-verlopen");
  }

  try {
    const redirectUri = `${url.origin}/api/auth/entra/callback`;
    const idToken = await wisselCodeIn(cfg, redirectUri, code, verifier);
    const payload = await valideerIdToken(cfg, idToken, nonce);
    const profiel = profielUitToken(payload);
    if (!profiel.email) return naarLogin("sso-geen-email");

    let gebruiker = await prisma.gebruiker.findUnique({ where: { email: profiel.email } });

    if (gebruiker) {
      // Rollen uit Entra zijn leidend zodra ze zijn toegewezen; zonder toewijzing
      // blijven de lokaal beheerde rollen gelden.
      if (profiel.rollen.length > 0 && gebruiker.rollen !== profiel.rollen.join(",")) {
        gebruiker = await prisma.gebruiker.update({
          where: { id: gebruiker.id },
          data: { rollen: profiel.rollen.join(","), naam: profiel.naam },
        });
      }
    } else {
      // Nieuwe gebruiker: enkel toelaten met Entra-rollen of een ingestelde standaardrol.
      const rollen = profiel.rollen.length > 0 ? profiel.rollen : rollenUitStandaard();
      if (rollen.length === 0) return naarLogin("sso-geen-toegang");
      gebruiker = await prisma.gebruiker.create({
        data: {
          naam: profiel.naam,
          email: profiel.email,
          rollen: rollen.join(","),
          // SSO-gebruikers melden nooit met een wachtwoord aan; sla een willekeurige hash op.
          wachtwoordHash: hashWachtwoord(randomBytes(32).toString("hex")),
        },
      });
    }

    if (!gebruiker.actief) return naarLogin("sso-geen-toegang");

    await startSessie(gebruiker.id);
    const res = NextResponse.redirect(new URL("/backoffice", url.origin));
    for (const naam of ["entra_state", "entra_nonce", "entra_verifier"]) res.cookies.delete(naam);
    return res;
  } catch (e) {
    console.error("Entra-aanmelding mislukt:", e);
    return naarLogin("sso-mislukt");
  }
}

function rollenUitStandaard(): string[] {
  const std = (process.env.ENTRA_STANDAARD_ROL ?? "").toUpperCase().trim();
  return std ? [std] : [];
}
