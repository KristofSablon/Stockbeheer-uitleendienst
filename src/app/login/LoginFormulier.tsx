"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SSO_FOUTEN: Record<string, string> = {
  "sso-niet-geconfigureerd": "Aanmelden met het gemeente-account is nog niet geconfigureerd.",
  "sso-geweigerd": "De aanmelding werd geweigerd. Hebt u toegang tot deze toepassing?",
  "sso-sessie-verlopen": "De aanmeldpoging is verlopen. Probeer opnieuw.",
  "sso-geen-email": "Uw Microsoft-account heeft geen e-mailadres; contacteer de beheerder.",
  "sso-geen-toegang": "Uw account heeft (nog) geen rol in deze toepassing. Vraag de beheerder om toegang.",
  "sso-mislukt": "Aanmelden met het gemeente-account is mislukt. Probeer opnieuw of contacteer de beheerder.",
};

export default function LoginFormulier({
  entraActief,
  lokaalUit,
  ssoFout,
}: {
  entraActief: boolean;
  lokaalUit: boolean;
  ssoFout?: string;
}) {
  const router = useRouter();
  const [fout, setFout] = useState<string | undefined>(ssoFout ? SSO_FOUTEN[ssoFout] ?? "Aanmelden mislukt." : undefined);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setFout(undefined);
    try {
      const res = await fetch("/api/login", { method: "POST", body: new FormData(e.currentTarget) });
      const data = (await res.json()) as { ok?: boolean; fout?: string };
      if (data.ok) {
        router.replace("/backoffice");
        router.refresh();
        return;
      }
      setFout(data.fout ?? "Aanmelden mislukt.");
    } catch {
      setFout("Er ging iets mis. Probeer opnieuw.");
    }
    setPending(false);
  }

  return (
    <div className="card p-6">
      <h1 className="mb-1 text-xl font-semibold">Medewerker aanmelden</h1>
      <p className="mb-5 text-sm text-gray-500">Backoffice uitleendienst Londerzeel</p>

      {fout && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>
      )}

      {entraActief && (
        <a
          href="/api/auth/entra/login"
          className="btn-secondary mb-4 flex w-full items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="0" y="0" width="7.5" height="7.5" fill="#F25022" />
            <rect x="8.5" y="0" width="7.5" height="7.5" fill="#7FBA00" />
            <rect x="0" y="8.5" width="7.5" height="7.5" fill="#00A4EF" />
            <rect x="8.5" y="8.5" width="7.5" height="7.5" fill="#FFB900" />
          </svg>
          Aanmelden met gemeente-account
        </a>
      )}

      {entraActief && !lokaalUit && (
        <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          of met wachtwoord
          <span className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {!lokaalUit && (
        <>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">E-mailadres</label>
              <input id="email" name="email" type="email" autoComplete="username" className="input" placeholder="naam@londerzeel.be" required />
            </div>
            <div>
              <label className="label" htmlFor="wachtwoord">Wachtwoord</label>
              <input id="wachtwoord" name="wachtwoord" type="password" autoComplete="current-password" className="input" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Bezig…" : "Aanmelden"}
            </button>
          </form>

          <div className="mt-5 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium">Demo-aanmeldingen (wachtwoord: <code>londerzeel</code>)</p>
            <ul className="mt-1 space-y-0.5">
              <li>admin@londerzeel.be — Admin + Beheerder</li>
              <li>ploegbaas@londerzeel.be — Ploegbaas</li>
              <li>magazijn@londerzeel.be — Magazijnier</li>
              <li>beleid@londerzeel.be — Beleid (lezer)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
