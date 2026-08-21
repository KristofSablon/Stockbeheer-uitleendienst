import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomBytes } from "crypto";
import { ROLLEN } from "./domein";

// Aanmelden met het gemeente-account via Microsoft Entra ID (OpenID Connect,
// authorization code flow met PKCE). Actief zodra de drie ENTRA_-omgevings-
// variabelen zijn ingesteld; zonder die variabelen blijft enkel de lokale
// wachtwoord-login beschikbaar.

export type EntraConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

export function entraConfig(): EntraConfig | null {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;
  return { tenantId, clientId, clientSecret };
}

export function lokaalAanmeldenUit(): boolean {
  // Zet LOKAAL_AANMELDEN_UIT=1 om de wachtwoord-login te verbergen zodra SSO actief is.
  return process.env.LOKAAL_AANMELDEN_UIT === "1" && entraConfig() !== null;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function nieuweFlowWaarden() {
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const codeVerifier = b64url(randomBytes(48));
  const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
  return { state, nonce, codeVerifier, codeChallenge };
}

export function autorisatieUrl(
  cfg: EntraConfig,
  redirectUri: string,
  flow: { state: string; nonce: string; codeChallenge: string }
): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "openid profile email",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: flow.codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/authorize?${params}`;
}

export async function wisselCodeIn(
  cfg: EntraConfig,
  redirectUri: string,
  code: string,
  codeVerifier: string
): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Token-uitwisseling mislukt (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Geen id_token in het antwoord van Microsoft.");
  return data.id_token;
}

// JWKS per tenant cachen (module-scope; overleeft warme aanroepen).
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function valideerIdToken(
  cfg: EntraConfig,
  idToken: string,
  verwachteNonce: string
): Promise<JWTPayload> {
  let jwks = jwksCache.get(cfg.tenantId);
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${cfg.tenantId}/discovery/v2.0/keys`)
    );
    jwksCache.set(cfg.tenantId, jwks);
  }
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: `https://login.microsoftonline.com/${cfg.tenantId}/v2.0`,
    audience: cfg.clientId,
  });
  if (payload.nonce !== verwachteNonce) throw new Error("Nonce komt niet overeen.");
  return payload;
}

// Vertaalt de app-rollen uit het ID-token (claim "roles") naar de rollen van deze
// applicatie. In de Entra app-registratie horen app roles te bestaan met exact deze
// waarden: ADMIN, PLOEGBAAS, TECHNISCH, MAGAZIJNIER, BEHEERDER, BELEID.
export function mapClaimRollen(claimRoles: unknown): string[] {
  if (!Array.isArray(claimRoles)) return [];
  const geldige = new Set(Object.keys(ROLLEN));
  return claimRoles
    .map((r) => String(r).toUpperCase().trim())
    .filter((r) => geldige.has(r));
}

// Gegevens die we uit het ID-token halen om de gebruiker te vinden/aan te maken.
export function profielUitToken(payload: JWTPayload): { email: string | null; naam: string; rollen: string[] } {
  const email =
    (typeof payload.preferred_username === "string" && payload.preferred_username.includes("@")
      ? payload.preferred_username
      : null) ?? (typeof payload.email === "string" ? payload.email : null);
  const naam = typeof payload.name === "string" && payload.name ? payload.name : email ?? "Onbekend";
  return {
    email: email ? email.toLowerCase().trim() : null,
    naam,
    rollen: mapClaimRollen(payload.roles),
  };
}
