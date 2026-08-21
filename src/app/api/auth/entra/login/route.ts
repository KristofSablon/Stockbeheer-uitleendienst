import { NextResponse } from "next/server";
import { entraConfig, nieuweFlowWaarden, autorisatieUrl } from "@/lib/entra";

// Start de aanmelding met het gemeente-account: bewaart state/nonce/PKCE in
// kortlevende cookies en stuurt de browser door naar Microsoft.
export async function GET(request: Request) {
  const cfg = entraConfig();
  if (!cfg) {
    return NextResponse.redirect(new URL("/login?fout=sso-niet-geconfigureerd", request.url));
  }

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/entra/callback`;
  const flow = nieuweFlowWaarden();

  const res = NextResponse.redirect(autorisatieUrl(cfg, redirectUri, flow));
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 600, // 10 minuten om de flow af te ronden
  };
  res.cookies.set("entra_state", flow.state, cookieOpts);
  res.cookies.set("entra_nonce", flow.nonce, cookieOpts);
  res.cookies.set("entra_verifier", flow.codeVerifier, cookieOpts);
  return res;
}
