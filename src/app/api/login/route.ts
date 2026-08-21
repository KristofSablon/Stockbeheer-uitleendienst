import { NextResponse } from "next/server";
import { aanmelden } from "@/lib/auth";
import { lokaalAanmeldenUit } from "@/lib/entra";

// Aanmelden via een route handler i.p.v. een server-action. Route handlers zetten
// cookies betrouwbaar in productie (het zetten van een sessiecookie in een
// server-action gevolgd door navigatie werkt niet consistent bij een productiebuild).
export async function POST(request: Request) {
  if (lokaalAanmeldenUit()) {
    return NextResponse.json(
      { fout: "Wachtwoord-aanmelding is uitgeschakeld; gebruik het gemeente-account." },
      { status: 403 }
    );
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const wachtwoord = String(form.get("wachtwoord") ?? "");

  if (!email || !wachtwoord) {
    return NextResponse.json({ fout: "Vul e-mailadres en wachtwoord in." }, { status: 400 });
  }

  const sessie = await aanmelden(email, wachtwoord);
  if (!sessie) {
    return NextResponse.json({ fout: "Onjuist e-mailadres of wachtwoord." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
