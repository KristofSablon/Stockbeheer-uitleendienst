import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { verifieerWachtwoord } from "./wachtwoord";
import { rollenNaarArray } from "./domein";

const COOKIE_NAAM = "uld_sessie";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dagen

function secret(): string {
  return process.env.SESSION_SECRET ?? "onveilige-standaard-sleutel-wijzig-mij";
}

function tekenen(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function maakToken(gebruikerId: string): string {
  const payload = `${gebruikerId}.${Date.now()}`;
  const sig = tekenen(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function leesToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const laatstePunt = decoded.lastIndexOf(".");
    if (laatstePunt < 0) return null;
    const payload = decoded.slice(0, laatstePunt);
    const sig = decoded.slice(laatstePunt + 1);
    const verwacht = tekenen(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(verwacht);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const [gebruikerId] = payload.split(".");
    return gebruikerId || null;
  } catch {
    return null;
  }
}

export type Sessie = {
  id: string;
  naam: string;
  email: string;
  rollen: string[];
};

// Meldt een gebruiker aan op basis van e-mail + wachtwoord.
export async function aanmelden(email: string, wachtwoord: string): Promise<Sessie | null> {
  const gebruiker = await prisma.gebruiker.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!gebruiker || !gebruiker.actief) return null;
  if (!verifieerWachtwoord(wachtwoord, gebruiker.wachtwoordHash)) return null;

  const token = maakToken(gebruiker.id);
  const cookieStore = await cookies();

  // Detecteer of we achter een HTTPS-proxy draaien (bv. GitHub Codespaces, Gitpod).
  // In die omgevingen wordt de app vaak in een ingebouwde preview (iframe) getoond,
  // waar een SameSite=Lax-cookie niet meegestuurd wordt. Dan is SameSite=None + Secure
  // nodig. Lokaal (http) blijft het SameSite=Lax zonder Secure, anders wordt de cookie
  // op http://localhost helemaal niet bewaard.
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const isHttps = proto === "https";

  cookieStore.set(COOKIE_NAAM, token, {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    path: "/",
    maxAge: MAX_AGE,
  });

  return {
    id: gebruiker.id,
    naam: gebruiker.naam,
    email: gebruiker.email,
    rollen: rollenNaarArray(gebruiker.rollen),
  };
}

export async function afmelden(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAAM);
}

// Haalt de huidige sessie op (of null). Voor gebruik in server components / actions.
export async function getSessie(): Promise<Sessie | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAAM)?.value;
  if (!token) return null;
  const gebruikerId = leesToken(token);
  if (!gebruikerId) return null;

  const gebruiker = await prisma.gebruiker.findUnique({ where: { id: gebruikerId } });
  if (!gebruiker || !gebruiker.actief) return null;

  return {
    id: gebruiker.id,
    naam: gebruiker.naam,
    email: gebruiker.email,
    rollen: rollenNaarArray(gebruiker.rollen),
  };
}

export function heeftRol(sessie: Sessie | null, ...rollen: string[]): boolean {
  if (!sessie) return false;
  return sessie.rollen.some((r) => rollen.includes(r));
}
