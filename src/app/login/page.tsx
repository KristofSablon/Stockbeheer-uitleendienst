"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Merk";
import { loginActie } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginActie, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-londerzeel-geelLicht px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-semibold">Medewerker aanmelden</h1>
          <p className="mb-5 text-sm text-gray-500">Backoffice uitleendienst Londerzeel</p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">E-mailadres</label>
              <input id="email" name="email" type="email" autoComplete="username" className="input" placeholder="naam@londerzeel.be" required />
            </div>
            <div>
              <label className="label" htmlFor="wachtwoord">Wachtwoord</label>
              <input id="wachtwoord" name="wachtwoord" type="password" autoComplete="current-password" className="input" required />
            </div>

            {state?.fout && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.fout}</p>
            )}

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
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="hover:underline">← Terug naar de publieke website</Link>
        </p>
      </div>
    </div>
  );
}
